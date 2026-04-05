#property strict
#property version   "1.00"
#property copyright "Copyright © 2026, MacheFunded"

// =========================================================
// MT5MetricsEA.mq5
// Clean architecture metrics sender
// =========================================================

// 1. Config
#define SERVICE_URL "http://127.0.0.1:8200"
#define BACKEND_URL "http://127.0.0.1:9000/metrics"
#define WEB_TIMEOUT 5000

input int LOOKBACK_MINUTES = 60;
input int TIMER_SECONDS = 2;
input string ENGINE_SECRET = "";
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
   string position_id;
   string open_time;
   string close_time;
   double amount;
   string deal_type;
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

      ulong positionId = (ulong)HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
      datetime closeTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      double dealAmount = HistoryDealGetDouble(ticket, DEAL_PROFIT);

      datetime openTime = 0;
      if(is_trade && HistorySelectByPosition(positionId))
      {
         for(int j=0; j<HistoryDealsTotal(); j++)
         {
            ulong iticket = HistoryDealGetTicket(j);
            if(iticket == 0) continue;
            if((ENUM_DEAL_ENTRY)HistoryDealGetInteger(iticket, DEAL_ENTRY) == DEAL_ENTRY_IN)
            {
               openTime = (datetime)HistoryDealGetInteger(iticket, DEAL_TIME);
               break;
            }
         }
      }

      int idx = ArraySize(trades);
      ArrayResize(trades, idx+1);
      trades[idx].position_id = is_trade ? IntegerToString((long)positionId) : IntegerToString((long)ticket);
      trades[idx].open_time = openTime > 0 ? ToISOString(openTime) : "";
      trades[idx].close_time = ToISOString(closeTime);
      trades[idx].amount = dealAmount;
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

   Print("Tick fetch failed for ", symbol, " -> fallback to M1");

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
double ComputeMinEquity(const Position &positions[], const string &symbols[], long start, long end, double current_equity)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double min_equity = MathMin(balance, current_equity);

   long timeline[];
   ArrayResize(timeline, 0);

   Tick symbolTicks[];
   int count=0;

   for(int s=0; s<ArraySize(symbols); s++)
   {
      if(!FetchTicksFromService(symbols[s], start, end, symbolTicks, count))
         continue;

      int old = ArraySize(timeline);
      ArrayResize(timeline, old + count);

      for(int i=0; i<count; i++)
         timeline[old + i] = symbolTicks[i].time_msc;
   }

   if(ArraySize(timeline) == 0)
      return min_equity;

   ArraySort(timeline);

   for(int t=0; t<ArraySize(timeline); t++)
   {
      long time = timeline[t];
      double pnl = 0;

      for(int p=0; p<ArraySize(positions); p++)
      {
         string sym = positions[p].symbol;

         Tick ticks[];
         int cnt=0;

         if(!FetchTicksFromService(sym, time-1000, time, ticks, cnt))
            continue;

         if(cnt == 0) continue;

         Tick last = ticks[cnt-1];

         double price = (positions[p].type==POSITION_TYPE_BUY) ? last.bid : last.ask;

         double diff = (positions[p].type==POSITION_TYPE_BUY)
                     ? price - positions[p].open_price
                     : positions[p].open_price - price;

         double tick_size  = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_SIZE);
         double tick_value = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE);

         pnl += (diff / tick_size) * tick_value * positions[p].volume;
      }

      double equity = balance + pnl;
      if(equity < 0) equity = 0;
      if(equity < min_equity)
         min_equity = equity;
   }

   return min_equity;
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
   for(int i=0; i<ArraySize(trades); i++)
   {
      if(i > 0) json += ",";
      json += "{";
      json += "\"position_id\":\"" + trades[i].position_id + "\",";
      json += "\"open_time\":\"" + trades[i].open_time + "\",";
      json += "\"close_time\":\"" + trades[i].close_time + "\",";
      json += "\"amount\":" + DoubleToString(trades[i].amount, 2) + ",";
      json += "\"deal_type\":\"" + trades[i].deal_type + "\"";
      json += "}";
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
   json += "\"min_equity\":" + DoubleToString(min_equity,2);
   json += "," + BuildTradesJSON(trades);
   json += ",\"timestamp\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
   json += "}";
   return json;
}

// 7. Sender
bool SendMetrics(string json)
{
   char data[];
   StringToCharArray(json, data);

   char response[];
   string headers = "Content-Type: application/json\r\n";
   if (StringLen(ENGINE_SECRET) > 0)
      headers += "X-ENGINE-SECRET: " + ENGINE_SECRET + "\r\n";

   int res = WebRequest("POST", BACKEND_URL, headers, WEB_TIMEOUT, data, response, headers);
   if(res == -1)
   {
      PrintFormat("WebRequest error %d (GetLastError=%d)", res, GetLastError());
      return false;
   }
   return true;
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

   string symbols[];
   CollectSymbolsUnique(positions, symbols);

   long now = (long)TimeCurrent() * 1000;
   long start = GetLastCheckpoint();

   long max_window = (long)LOOKBACK_MINUTES * 60 * 1000;
   if(now - start > max_window)
      start = now - max_window;

   start -= CHECKPOINT_OVERLAP_MS;

   TradeEvent trades[];
   GetRecentClosedTrades(trades, start, now);

   double min_equity = ComputeMinEquity(positions, symbols, start, now, equity);
   double highest_balance = MathMax(balance, equity);
   double dd_percent = ComputeDD(highest_balance, min_equity);

   string json = BuildJSON(positions, trades, balance, equity, min_equity);

   Print("DD% (lookback): "+DoubleToString(dd_percent, 2));
   Print("Payload: "+json);

   if(SendMetrics(json))
      SaveCheckpoint(now);

   ExpertRemove();
   TerminalClose(0);
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
