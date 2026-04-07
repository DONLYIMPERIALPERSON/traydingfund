#property strict
#property version   "1.00"
#property copyright "Copyright © 2026, MacheFunded"

// =========================================================
// MT5MetricsEA.mq5
// Clean architecture metrics sender
// =========================================================

// 1. Config
#define SERVICE_URL "http://15.237.52.163:8200"
#define BACKEND_URL "https://f1bb-102-88-114-192.ngrok-free.app/api/v1/mt5/metrics"
#define WEB_TIMEOUT 10000
#define METRICS_FILENAME_PREFIX "metrics_"
#define DD_STATE_FILENAME_PREFIX "dd_state_"

input int LOOKBACK_MINUTES = 60;
input int TIMER_SECONDS = 2;
input string ENGINE_SECRET = "dev-mt5-secret";
input int CHECKPOINT_OVERLAP_MS = 5000;

// 2. Structs
struct Position
{
   ulong ticket;
   string symbol;
   double volume;
   double open_price;
   long open_time;
   int type;
};

struct Tick
{
   long time_msc;
   double bid;
   double ask;
};

struct TradeEvent
{
   string ticket;
   string position_id;
   string symbol;
   string open_time;
   string close_time;
   double profit;
   string deal_type;
};

struct SymbolTick
{
   string symbol;
   int lastProcessedTick;
   Tick ticks[];
};

struct ActivePosition
{
   ulong pos_id;
   string symbol;
   double volume;
   long open_time;
   double open_price;
   ENUM_DEAL_TYPE type;
   double price;
   double commission;
   double swap;
   double pnl;
};

struct Deal
{
   ulong deal_id;
   ulong pos_id;
   string symbol;
   long deal_time_msc;
   ENUM_DEAL_ENTRY entry;
   ENUM_DEAL_TYPE type;
   double volume;
   double price;
   double profit;
   double commission;
   double swap;
};

struct WithdrawalInfo
{
   long time_msc;
   double amount;
};

// 3. Data Fetch (MT5)
void GetPositions(Position &positions[])
{
   int total = PositionsTotal();
   ArrayResize(positions, total);

   for(int i=0; i<total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      PositionSelectByTicket(ticket);

      positions[i].ticket = ticket;
      positions[i].symbol = PositionGetString(POSITION_SYMBOL);
      positions[i].volume = PositionGetDouble(POSITION_VOLUME);
      positions[i].open_price = PositionGetDouble(POSITION_PRICE_OPEN);
      positions[i].open_time = (long)PositionGetInteger(POSITION_TIME_MSC);
      positions[i].type = (int)PositionGetInteger(POSITION_TYPE);
   }
}

void CollectSymbolsUnique(const Position &positions[], string &symbols[])
{
   ArrayResize(symbols, 0);

   for(int i=0; i<ArraySize(positions); i++)
   {
      bool exists=false;
      for(int j=0; j<ArraySize(symbols); j++)
      {
         if(symbols[j]==positions[i].symbol) { exists=true; break; }
      }
      if(!exists)
      {
         int idx = ArraySize(symbols);
         ArrayResize(symbols, idx+1);
         symbols[idx] = positions[i].symbol;
      }
   }
}

string NormalizeSymbol(string sym)
{
   int len = StringLen(sym);
   if(len > 6)
   {
      char last = (char)StringGetCharacter(sym, len-1);
      if(last=='m' || last=='_' || last=='-')
         return StringSubstr(sym, 0, len-1);
   }
   return sym;
}

string GetCheckpointKey()
{
   return "MF_LAST_TS_" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
}

long GetLastCheckpoint()
{
   string key = GetCheckpointKey();

   if(GlobalVariableCheck(key))
      return (long)GlobalVariableGet(key);

   long now = (long)TimeCurrent() * 1000;
   return now - (long)LOOKBACK_MINUTES * 60 * 1000;
}

void SaveCheckpoint(long ts)
{
   string key = GetCheckpointKey();
   GlobalVariableSet(key, (double)ts);
}

double ExtractJsonNumber(const string json, const string key, double default_value)
{
   string pattern = "\"" + key + "\"";
   int pos = StringFind(json, pattern);
   if(pos < 0)
      return default_value;

   int colon = StringFind(json, ":", pos + StringLen(pattern));
   if(colon < 0)
      return default_value;

   int start = colon + 1;
   int len = StringLen(json);
   while(start < len && (json[start] == ' ' || json[start] == '"'))
      start++;

   int end = start;
   while(end < len && (CharIsDigitEx((char)json[end]) || json[end] == '.' || json[end] == '-'))
      end++;

   if(end <= start)
      return default_value;

   return StringToDouble(StringSubstr(json, start, end - start));
}

long ExtractJsonLong(const string json, const string key, long default_value)
{
   return (long)ExtractJsonNumber(json, key, (double)default_value);
}

bool LoadDDState(double &highest_balance, double &lowest_equity, long &last_checked)
{
   string filename = DD_STATE_FILENAME_PREFIX + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ".json";
   int handle = FileOpen(filename, FILE_READ | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE)
      return false;

   string content = "";
   while(!FileIsEnding(handle))
   {
      content += FileReadString(handle);
   }
   FileClose(handle);

   if(StringLen(content) == 0)
      return false;

   highest_balance = ExtractJsonNumber(content, "highest_balance", 0.0);
   lowest_equity = ExtractJsonNumber(content, "lowest_equity", 0.0);
   last_checked = ExtractJsonLong(content, "last_checked", 0);
   return (highest_balance > 0 || lowest_equity > 0 || last_checked > 0);
}

void SaveDDState(double highest_balance, double lowest_equity, long last_checked)
{
   string filename = DD_STATE_FILENAME_PREFIX + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ".json";
   int handle = FileOpen(filename, FILE_WRITE | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE)
   {
      Print("Failed to write DD state file. Error: ", GetLastError());
      return;
   }

   string json = "{";
   json += "\"highest_balance\":" + DoubleToString(highest_balance, 2) + ",";
   json += "\"lowest_equity\":" + DoubleToString(lowest_equity, 2) + ",";
   json += "\"last_checked\":" + IntegerToString((long)last_checked);
   json += "}";

   FileWriteString(handle, json);
   FileClose(handle);
}

bool FindLastWithdrawal(WithdrawalInfo &withdrawal)
{
   withdrawal.time_msc = 0;
   withdrawal.amount = 0;

   if(!HistorySelect(0, TimeCurrent() + 5 * 24 * 60 * 60))
      return false;

   for(int i=HistoryDealsTotal() - 1; i>=0; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      if(type == DEAL_TYPE_BALANCE && profit < 0)
      {
         withdrawal.time_msc = (long)HistoryDealGetInteger(ticket, DEAL_TIME_MSC);
         withdrawal.amount = profit;
         return true;
      }
   }

   return false;
}

// 4.5 Trade History (for min duration rules)
string ToISOString(datetime value)
{
   return TimeToString(value, TIME_DATE|TIME_SECONDS);
}

void GetRecentClosedTrades(TradeEvent &trades[], long start, long end)
{
   ArrayResize(trades, 0);
   if(!HistorySelect((datetime)(start/1000), (datetime)(end/1000)))
      return;

   int total = HistoryDealsTotal();
   for(int i=0; i<total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      bool is_trade = (type == DEAL_TYPE_BUY || type == DEAL_TYPE_SELL);
      bool is_balance = (type == DEAL_TYPE_BALANCE || type == DEAL_TYPE_CREDIT || type == DEAL_TYPE_CHARGE || type == DEAL_TYPE_CORRECTION);
      if(!is_trade && !is_balance) continue;
      if(is_trade && entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY) continue;

      ulong dealTicket = ticket;
      datetime closeTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      double dealAmount = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      datetime openTime = 0;

      int idx = ArraySize(trades);
      ArrayResize(trades, idx+1);
      trades[idx].ticket = IntegerToString((long)dealTicket);
      trades[idx].position_id = IntegerToString((long)dealTicket);
      trades[idx].symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      trades[idx].open_time = openTime > 0 ? ToISOString(openTime) : "";
      trades[idx].close_time = ToISOString(closeTime);
      trades[idx].profit = dealAmount;
      if(is_balance)
      {
         if(type == DEAL_TYPE_BALANCE) trades[idx].deal_type = "BALANCE";
         if(type == DEAL_TYPE_CREDIT) trades[idx].deal_type = "CREDIT";
         if(type == DEAL_TYPE_CHARGE) trades[idx].deal_type = "CHARGE";
         if(type == DEAL_TYPE_CORRECTION) trades[idx].deal_type = "CORRECTION";
      }
      else
      {
         trades[idx].deal_type = "TRADE";
      }
   }
}

// 4. Tick Fetch (API)
bool FetchTicksFromService(string symbol, const long start_ms, const long end_ms, Tick &outTicks[], int &outCount)
{
   symbol = NormalizeSymbol(symbol);

   string url = StringFormat("%s/get_ticks?symbol=%s&start=%I64d&end=%I64d", SERVICE_URL, symbol, start_ms, end_ms);
   string headers = "Content-Type: application/json\r\n";

   char data[]; ArrayResize(data, 0);
   char response[];
   string resp_headers;

   for(int attempt=0; attempt<3; attempt++)
   {
      ResetLastError();
      int res = WebRequest("GET", url, headers, WEB_TIMEOUT, data, response, resp_headers);

      if(res != -1)
      {
         string resp = CharArrayToString(response);
         if(ParseTicksJson(resp, outTicks, outCount) && outCount > 0)
            return true;
      }

      Sleep(200);
   }

   // Fallback to M1 rates if tick service fails.

   MqlRates rates[];
   int bars = (int)((end_ms - start_ms) / 60000) + 1;
   if(CopyRates(symbol, PERIOD_M1, (datetime)(start_ms/1000), bars, rates) > 0)
   {
      int n = ArraySize(rates);
      ArrayResize(outTicks, n);
      outCount = n;

      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);

      for(int i=0;i<n;i++)
      {
         outTicks[i].time_msc = (long)rates[i].time * 1000;
         outTicks[i].bid = rates[i].close;
         outTicks[i].ask = rates[i].close + rates[i].spread * point;
      }

      return true;
   }

   outCount = 0;
   return false;
}

// 5. Calculations
int FindSymbolTick(SymbolTick &symbols[], string symbol)
{
   for(int i=0; i<ArraySize(symbols); i++)
   {
      if(symbols[i].symbol == symbol)
         return i;
   }
   return -1;
}

void AddToSymbolTicks(SymbolTick &symbols[], string symbol)
{
   if(FindSymbolTick(symbols, symbol) != -1)
      return;

   int idx = ArraySize(symbols);
   ArrayResize(symbols, idx + 1);
   symbols[idx].symbol = symbol;
   symbols[idx].lastProcessedTick = 0;
   ArrayResize(symbols[idx].ticks, 0);
}

double CalcPnL_Approx(string symbol, double lots, double open_price, double price_at_time, bool is_buy)
{
   double tick_size  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   double tick_value = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double diff = is_buy ? (price_at_time - open_price) : (open_price - price_at_time);
   double ticks = diff / tick_size;
   return ticks * tick_value * lots;
}

double GetPriceForTime(ENUM_DEAL_TYPE type, SymbolTick &symbol_tick, long time, long pos_open_time, double pos_open_price)
{
   int total = ArraySize(symbol_tick.ticks);
   for(int i = symbol_tick.lastProcessedTick; i < total; i++)
   {
      if(symbol_tick.ticks[i].time_msc > time)
      {
         if(i > 0)
         {
            if(symbol_tick.ticks[i].time_msc < pos_open_time)
            {
               symbol_tick.lastProcessedTick = i - 1;
               return pos_open_price;
            }

            symbol_tick.lastProcessedTick = i - 1;
            return (type == DEAL_TYPE_BUY) ? symbol_tick.ticks[i-1].bid : symbol_tick.ticks[i-1].ask;
         }
         return pos_open_price;
      }
   }

   if(total == 0)
      return pos_open_price;

   symbol_tick.lastProcessedTick = total - 1;
   return (type == DEAL_TYPE_BUY) ? symbol_tick.ticks[total-1].bid : symbol_tick.ticks[total-1].ask;
}

double GetPNL(ActivePosition &positions[], SymbolTick &symbols[], long time)
{
   double pnl = 0;
   for(int i=0; i<ArraySize(positions); i++)
   {
      int sidx = FindSymbolTick(symbols, positions[i].symbol);
      if(sidx == -1 || ArraySize(symbols[sidx].ticks) == 0)
         continue;

      positions[i].price = GetPriceForTime(positions[i].type, symbols[sidx], time, positions[i].open_time, positions[i].open_price);
      positions[i].pnl = CalcPnL_Approx(
         positions[i].symbol,
         positions[i].volume,
         positions[i].open_price,
         positions[i].price,
         positions[i].type == DEAL_TYPE_BUY
      ) + positions[i].commission + positions[i].swap;
      pnl += positions[i].pnl;
   }
   return pnl;
}

void UpdateActivePositions(ActivePosition &positions[], const Deal &deal)
{
   if(deal.entry == DEAL_ENTRY_IN)
   {
      int idx = ArraySize(positions);
      ArrayResize(positions, idx + 1);
      positions[idx].pos_id = deal.pos_id;
      positions[idx].symbol = deal.symbol;
      positions[idx].volume = deal.volume;
      positions[idx].open_time = deal.deal_time_msc;
      positions[idx].open_price = deal.price;
      positions[idx].type = deal.type;
      positions[idx].commission = deal.commission;
      positions[idx].swap = deal.swap;
      positions[idx].pnl = 0;
      positions[idx].price = deal.price;
      return;
   }

   for(int i=0; i<ArraySize(positions); i++)
   {
      if(positions[i].pos_id != deal.pos_id)
         continue;

      if(deal.volume >= positions[i].volume)
      {
         ArrayRemove(positions, i, 1);
      }
      else
      {
         positions[i].volume -= deal.volume;
         positions[i].commission -= deal.commission;
         positions[i].swap -= deal.swap;
      }
      return;
   }
}

void SortDealsByTime(Deal &deals[])
{
   int n = ArraySize(deals);
   for(int i=0; i<n-1; i++)
   {
      for(int j=i+1; j<n; j++)
      {
         if(deals[j].deal_time_msc < deals[i].deal_time_msc)
         {
            Deal tmp = deals[i];
            deals[i] = deals[j];
            deals[j] = tmp;
         }
      }
   }
}

void BuildTimeline(SymbolTick &symbols[], Deal &deals[], long &timeline[])
{
   ArrayResize(timeline, 0);

   for(int i=0; i<ArraySize(symbols); i++)
   {
      int n = ArraySize(symbols[i].ticks);
      if(n == 0) continue;
      int old = ArraySize(timeline);
      ArrayResize(timeline, old + n);
      for(int k=0; k<n; k++)
         timeline[old + k] = symbols[i].ticks[k].time_msc;
   }

   int deals_n = ArraySize(deals);
   if(deals_n > 0)
   {
      int old = ArraySize(timeline);
      ArrayResize(timeline, old + deals_n);
      for(int d=0; d<deals_n; d++)
         timeline[old + d] = deals[d].deal_time_msc;
   }

   if(ArraySize(timeline) == 0)
      return;

   ArraySort(timeline);

   int w = 1;
   for(int r=1; r<ArraySize(timeline); r++)
   {
      if(timeline[r] != timeline[r-1])
         timeline[w++] = timeline[r];
   }
   ArrayResize(timeline, w);
}

double CalculateMinEquityTimeline(
   const Position &current_positions[],
   long start_ms,
   long end_ms,
   double current_balance,
   double &io_highest_balance,
   double &io_lowest_equity,
   bool use_state,
   bool use_withdrawal_baseline,
   double baseline_balance
)
{
   Deal deals[];
   ArrayResize(deals, 0);

   if(!HistorySelect((datetime)(start_ms/1000), (datetime)(end_ms/1000)))
   {
      double fallback_equity = AccountInfoDouble(ACCOUNT_EQUITY);
      if(!use_state || io_highest_balance <= 0)
         io_highest_balance = MathMax(current_balance, fallback_equity);
      if(!use_state || io_lowest_equity <= 0)
         io_lowest_equity = MathMin(current_balance, fallback_equity);
      return io_lowest_equity;
   }

   for(int i=0; i<HistoryDealsTotal(); i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      long deal_time_msc = (long)HistoryDealGetInteger(ticket, DEAL_TIME_MSC);
      if(deal_time_msc < start_ms || deal_time_msc > end_ms)
         continue;

      ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      bool is_trade = (type == DEAL_TYPE_BUY || type == DEAL_TYPE_SELL);
      bool is_balance = (type == DEAL_TYPE_BALANCE || type == DEAL_TYPE_CREDIT || type == DEAL_TYPE_CHARGE || type == DEAL_TYPE_CORRECTION);
      if(!is_trade && !is_balance) continue;
      int idx = ArraySize(deals);
      ArrayResize(deals, idx + 1);
      deals[idx].deal_id = ticket;
      deals[idx].pos_id = (ulong)HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
      deals[idx].symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      deals[idx].deal_time_msc = deal_time_msc;
      deals[idx].entry = entry;
      deals[idx].type = type;
      deals[idx].volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      deals[idx].price = HistoryDealGetDouble(ticket, DEAL_PRICE);
      deals[idx].profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      deals[idx].commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      deals[idx].swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
   }

   SortDealsByTime(deals);

   double start_balance = current_balance;

   if(use_withdrawal_baseline)
   {
      for(int i=0; i<ArraySize(deals); i++)
      {
         if(deals[i].type == DEAL_TYPE_BUY || deals[i].type == DEAL_TYPE_SELL)
         {
            if(deals[i].entry == DEAL_ENTRY_OUT || deals[i].entry == DEAL_ENTRY_OUT_BY)
               start_balance -= deals[i].profit + deals[i].commission + deals[i].swap;
         }
         else
         {
            start_balance -= deals[i].profit;
         }
      }
   }
   else
   {
      start_balance = current_balance;
   }

   SymbolTick symbols[];
   ArrayResize(symbols, 0);
   for(int i=0; i<ArraySize(current_positions); i++)
   {
      AddToSymbolTicks(symbols, current_positions[i].symbol);
   }
   for(int i=0; i<ArraySize(deals); i++)
   {
      if(deals[i].symbol != "")
         AddToSymbolTicks(symbols, deals[i].symbol);
   }

   for(int i=0; i<ArraySize(symbols); i++)
   {
      int cnt = 0;
      FetchTicksFromService(symbols[i].symbol, start_ms, end_ms, symbols[i].ticks, cnt);
      symbols[i].lastProcessedTick = 0;
   }

   long timeline[];
   BuildTimeline(symbols, deals, timeline);

   if(ArraySize(timeline) == 0)
   {
      double fallback_equity = AccountInfoDouble(ACCOUNT_EQUITY);
      if(!use_state || io_highest_balance <= 0)
         io_highest_balance = MathMax(start_balance, fallback_equity);
      if(!use_state || io_lowest_equity <= 0)
         io_lowest_equity = MathMin(start_balance, fallback_equity);
      return io_lowest_equity;
   }

   ActivePosition positions[];
   ArrayResize(positions, 0);
   long history_start = start_ms - (long)LOOKBACK_MINUTES * 60 * 1000;
   if(history_start < 0)
      history_start = 0;

   if(!use_withdrawal_baseline && HistorySelect((datetime)(history_start/1000), (datetime)(start_ms/1000)))
   {
      for(int i=0; i<HistoryDealsTotal(); i++)
      {
         ulong ticket = HistoryDealGetTicket(i);
         if(ticket == 0) continue;
         long deal_time_msc = (long)HistoryDealGetInteger(ticket, DEAL_TIME_MSC);
         if(deal_time_msc >= start_ms)
            continue;

         ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
         ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
         bool is_trade = (type == DEAL_TYPE_BUY || type == DEAL_TYPE_SELL);
         bool is_balance = (type == DEAL_TYPE_BALANCE || type == DEAL_TYPE_CREDIT || type == DEAL_TYPE_CHARGE || type == DEAL_TYPE_CORRECTION);

         if(is_balance)
            continue;

         if(!is_trade)
            continue;

         Deal predeal;
         predeal.deal_id = ticket;
         predeal.pos_id = (ulong)HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
         predeal.symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
         predeal.deal_time_msc = deal_time_msc;
         predeal.entry = entry;
         predeal.type = type;
         predeal.volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
         predeal.price = HistoryDealGetDouble(ticket, DEAL_PRICE);
         predeal.profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         predeal.commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         predeal.swap = HistoryDealGetDouble(ticket, DEAL_SWAP);

         UpdateActivePositions(positions, predeal);

         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
            start_balance += predeal.profit + predeal.commission + predeal.swap;
      }
   }

   double balance = start_balance;
   double highest_balance = (!use_state || io_highest_balance <= 0) ? balance : io_highest_balance;
   double lowest_equity = (!use_state || io_lowest_equity <= 0) ? balance : io_lowest_equity;
   int deal_index = 0;

   for(int t=0; t<ArraySize(timeline); t++)
   {
      long now = timeline[t];
      while(deal_index < ArraySize(deals) && deals[deal_index].deal_time_msc <= now)
      {
         if(deals[deal_index].type == DEAL_TYPE_BUY || deals[deal_index].type == DEAL_TYPE_SELL)
         {
            UpdateActivePositions(positions, deals[deal_index]);
            if(deals[deal_index].entry == DEAL_ENTRY_OUT || deals[deal_index].entry == DEAL_ENTRY_OUT_BY)
               balance += deals[deal_index].profit + deals[deal_index].commission + deals[deal_index].swap;
         }
         else
         {
            balance += deals[deal_index].profit;
         }
         deal_index++;
      }

      double pnl = GetPNL(positions, symbols, now);
      double equity = balance + pnl;
      if(balance > highest_balance)
         highest_balance = balance;
      if(equity < lowest_equity)
         lowest_equity = equity;
      // Equity timeline debug removed for production.
   }

   io_highest_balance = highest_balance;
   io_lowest_equity = lowest_equity;
   return lowest_equity;
}

double ComputeDD(double highest_balance, double min_equity)
{
   if(highest_balance == 0.0) return 0.0;
   return ((highest_balance - min_equity) / highest_balance) * 100.0;
}

// 6. JSON Builder
string BuildTradesJSON(const TradeEvent &trades[])
{
   string json = "\"trades\":[";
   int written = 0;
   for(int i=0; i<ArraySize(trades); i++)
   {
      if(trades[i].deal_type != "TRADE")
         continue;

      if(written > 0) json += ",";
      json += "{";
      json += "\"ticket\":\"" + trades[i].ticket + "\",";
      json += "\"position_id\":\"" + trades[i].position_id + "\",";
      json += "\"symbol\":\"" + trades[i].symbol + "\",";
      json += "\"open_time\":\"" + trades[i].open_time + "\",";
      json += "\"close_time\":\"" + trades[i].close_time + "\",";
      json += "\"profit\":" + DoubleToString(trades[i].profit, 2) + ",";
      json += "\"dealType\":\"" + trades[i].deal_type + "\"";
      json += "}";
      written++;
   }
   json += "]";
   return json;
}

string BuildJSON(const Position &positions[], const TradeEvent &trades[], double balance, double equity, double min_equity)
{
   string json = "{";
   json += "\"account_number\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
   json += "\"platform\":\"mt5\",";
   json += "\"balance\":" + DoubleToString(balance,2) + ",";
   json += "\"equity\":" + DoubleToString(equity,2) + ",";
   json += "\"min_equity\":" + DoubleToString(min_equity,2) + ",";
   json += BuildTradesJSON(trades) + ",";
   json += "\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
   json += "}";
   return json;
}

// 7. Storage
void SaveMetricsToFile(const string json)
{
   string filename = METRICS_FILENAME_PREFIX + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ".json";
   int handle = FileOpen(filename, FILE_WRITE | FILE_TXT | FILE_COMMON | FILE_ANSI);

   if(handle != INVALID_HANDLE)
   {
      Print("Writing metrics file: ", filename);
      Print("Payload length: ", StringLen(json));
      FileWriteString(handle, json);
      FileClose(handle);
      // Metrics file saved.
   }
   else
   {
      Print("Failed to write metrics file. Error: ", GetLastError(), " Filename: ", filename);
   }
}

// 8. Main Flow
int OnInit()
{
   EventSetTimer(TIMER_SECONDS);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   Position positions[];
   GetPositions(positions);

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   bool terminal_connected = TerminalInfoInteger(TERMINAL_CONNECTED);
   bool trade_allowed = AccountInfoInteger(ACCOUNT_TRADE_ALLOWED);
   if(!terminal_connected || !trade_allowed || balance <= 0.0 || equity <= 0.0)
   {
      PrintFormat(
         "MT5 not ready (connected=%d, trade_allowed=%d, balance=%.2f, equity=%.2f). Skipping metrics.",
         terminal_connected, trade_allowed, balance, equity
      );
      return;
   }

   long now = (long)TimeCurrent() * 1000;
   long start = GetLastCheckpoint();
   double persisted_highest = 0.0;
   double persisted_lowest = 0.0;
   long persisted_last_checked = 0;
   bool has_state = LoadDDState(persisted_highest, persisted_lowest, persisted_last_checked);
   if(has_state && persisted_last_checked > 0)
      start = persisted_last_checked;

   long max_window = (long)LOOKBACK_MINUTES * 60 * 1000;
   if(!has_state && now - start > max_window)
      start = now - max_window;

   start -= CHECKPOINT_OVERLAP_MS;

   WithdrawalInfo withdrawal;
   bool has_withdrawal = FindLastWithdrawal(withdrawal);
   if(has_withdrawal && withdrawal.time_msc > 0)
   {
      start = withdrawal.time_msc + 1;
      has_state = false;
      persisted_highest = 0.0;
      persisted_lowest = 0.0;
   }

   TradeEvent trades[];
   GetRecentClosedTrades(trades, start, now);

   double highest_balance = has_state ? persisted_highest : balance;
   double lowest_equity = has_state ? persisted_lowest : 0.0;
   double min_equity = CalculateMinEquityTimeline(
      positions,
      start,
      now,
      balance,
      highest_balance,
      lowest_equity,
      has_state,
      has_withdrawal,
      balance
   );
   if(min_equity > balance)
      min_equity = balance;
   double dd_percent = ComputeDD(highest_balance, min_equity);

   string common_path = TerminalInfoString(TERMINAL_COMMONDATA_PATH);
   Print("Common Files Path: ", common_path, "\\Files");
   Print("=== TEST RESULT ===");
   Print("Balance: ", balance);
   Print("Equity: ", equity);
   Print("Min Equity: ", min_equity);
   Print("Highest Balance: ", highest_balance);
   Print("====================");

   string json = BuildJSON(positions, trades, balance, equity, min_equity);
   SaveMetricsToFile(json);
   SaveCheckpoint(now);
   SaveDDState(highest_balance, min_equity, now);
   // keep running for testing
   return;
}

// 9. Helpers: JSON Tick Parser (fast)
bool ParseTicksJson(const string json, Tick &outTicks[], int &outCount)
{
   outCount = 0;
   ArrayResize(outTicks, 0);

   int len = StringLen(json);
   if(len < 10) return false;

   int est = 0;
   for(int i=0;i<len;i++)
      if(StringGetCharacter(json,i)=='{')
         est++;

   if(est > 0)
      ArrayResize(outTicks, est);

   int pos = 0;
   while(true)
   {
      int b = StringFind(json, "{", pos);
      if(b < 0) break;

      int e = StringFind(json, "}", b);
      if(e < 0) break;

      long time_msc = 0;
      double bid = 0.0, ask = 0.0;

      int i = b+1;
      while(i < e)
      {
         if(StringGetCharacter(json,i) == 't')
         {
            if(StringSubstr(json,i,4)=="time" || StringSubstr(json,i,6)=="\"time\"")
            {
               int col = StringFind(json, ":", i);
               if(col>=0 && col<e)
               {
                  int p = col+1;
                  while(p<e && json[p]==' ') p++;
                  long val=0;
                  while(p<e && CharIsDigitEx((char)json[p]))
                  {
                     val = val*10 + (json[p]-'0');
                     p++;
                  }
                  time_msc = val;
               }
            }
         }
         else if(StringGetCharacter(json,i) == 'b')
         {
            if(StringSubstr(json,i,3)=="bid" || StringSubstr(json,i,5)=="\"bid\"")
            {
               int col = StringFind(json, ":", i);
               if(col>=0 && col<e)
                  bid = FastParseDouble(json, col+1, e);
            }
         }
         else if(StringGetCharacter(json,i) == 'a')
         {
            if(StringSubstr(json,i,3)=="ask" || StringSubstr(json,i,5)=="\"ask\"")
            {
               int col = StringFind(json, ":", i);
               if(col>=0 && col<e)
                  ask = FastParseDouble(json, col+1, e);
            }
         }
         i++;
      }

      outTicks[outCount].time_msc = time_msc;
      outTicks[outCount].bid = bid;
      outTicks[outCount].ask = ask;
      outCount++;

      pos = e+1;
   }

   ArrayResize(outTicks, outCount);
   return true;
}

double FastParseDouble(const string &s, int start, int limit)
{
   while(start<limit && s[start]==' ') start++;

   double val = 0.0;
   double frac = 0.0;
   double div = 1.0;
   bool dot = false;
   bool neg = false;

   while(start < limit)
   {
      int c = StringGetCharacter(s,start);
      if(c=='-') { neg=true; start++; continue; }
      if(c=='.') { dot=true; start++; continue; }

      if(!CharIsDigitEx((char)c)) break;

      if(!dot)
         val = val*10+(c-'0');
      else
      {
         frac = frac*10+(c-'0');
         div *= 10.0;
      }
      start++;
   }

   double r = val + (frac/div);
   if(neg) r = -r;
   return r;
}

int CharIsDigitEx(char c) { return (c >= '0' && c <= '9'); }
