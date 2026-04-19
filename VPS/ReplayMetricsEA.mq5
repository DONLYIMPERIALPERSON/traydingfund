#property strict
#property version   "1.00"
#property copyright "Copyright © 2026, MacheFunded"

// Replay metrics EA (minimal payload for server-side replay)

input int TIMER_SECONDS = 5;
input string TARGET_SYMBOL = "";
input ENUM_TIMEFRAMES TARGET_TIMEFRAME = PERIOD_CURRENT;
input string TARGET_TEMPLATE = "replay.tpl";

string FormatIso(datetime time)
{
   MqlDateTime dt;
   TimeToStruct(time, dt);
   return StringFormat(
      "%04d-%02d-%02dT%02d:%02d:%02d",
      dt.year,
      dt.mon,
      dt.day,
      dt.hour,
      dt.min,
      dt.sec
   );
}

long FindChart(const string symbol, const ENUM_TIMEFRAMES timeframe)
{
   long chart_id = ChartFirst();
   while(chart_id > 0)
   {
      if(ChartSymbol(chart_id) == symbol && (ENUM_TIMEFRAMES)ChartPeriod(chart_id) == timeframe)
         return chart_id;
      chart_id = ChartNext(chart_id);
   }
   return 0;
}

long EnsureChart(const string symbol, const ENUM_TIMEFRAMES timeframe)
{
   long chart_id = FindChart(symbol, timeframe);
   if(chart_id > 0)
      return chart_id;
   return ChartOpen(symbol, timeframe);
}

void AddSymbol(string symbol, string &symbols[], int &count)
{
   for(int i = 0; i < count; i++)
   {
      if(symbols[i] == symbol)
         return;
   }
   ArrayResize(symbols, count + 1);
   symbols[count] = symbol;
   count++;
}

datetime ResolveTradingCycleStart(string &source)
{
   datetime now = TimeCurrent();
   HistorySelect(0, now);

   datetime last_withdrawal = 0;
   datetime first_deposit = 0;

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0)
         continue;
      long deal_type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(deal_type != DEAL_TYPE_BALANCE)
         continue;
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      datetime deal_time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      if(profit < 0)
      {
         if(deal_time > last_withdrawal)
            last_withdrawal = deal_time;
      }
      else if(profit > 0)
      {
         if(first_deposit == 0 || deal_time < first_deposit)
            first_deposit = deal_time;
      }
   }

   if(last_withdrawal > 0)
   {
      source = "withdrawal";
      return last_withdrawal;
   }
   if(first_deposit > 0)
   {
      source = "deposit";
      return first_deposit;
   }

   source = "";
   return now;
}

string BuildPositionsJson(string &symbols[], int &symbol_count)
{
   string json = "[";
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket_value = PositionGetTicket(i);
      if(ticket_value == 0)
         continue;
      if(!PositionSelectByTicket(ticket_value))
         continue;
      string symbol = PositionGetString(POSITION_SYMBOL);
      AddSymbol(symbol, symbols, symbol_count);
      long ticket = PositionGetInteger(POSITION_TICKET);
      long identifier = PositionGetInteger(POSITION_IDENTIFIER);
      double volume = PositionGetDouble(POSITION_VOLUME);
      double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
      datetime open_time = (datetime)PositionGetInteger(POSITION_TIME);
      int type = (int)PositionGetInteger(POSITION_TYPE);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

      if(StringLen(json) > 1)
         json += ",";
      json += "{";
      json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
      json += "\"position_id\":\"" + IntegerToString(identifier) + "\",";
      json += "\"symbol\":\"" + symbol + "\",";
      json += "\"volume\":" + DoubleToString(volume, 2) + ",";
      json += "\"open_price\":" + DoubleToString(open_price, digits) + ",";
      json += "\"open_time_ms\":" + IntegerToString((long)open_time * 1000) + ",";
      json += "\"type\":" + IntegerToString(type);
      json += "}";
   }
   json += "]";
   return json;
}

string BuildDealsJson(datetime anchor_time, string &symbols[], int &symbol_count)
{
   datetime now = TimeCurrent();
   HistorySelect(anchor_time, now);

   string json = "[";
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0)
         continue;

      string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      long deal_type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      int type_value = 0;
      string deal_type_label = "";

      if(deal_type == DEAL_TYPE_BUY)
         type_value = 0;
      else if(deal_type == DEAL_TYPE_SELL)
         type_value = 1;
      else if(deal_type == DEAL_TYPE_BALANCE)
      {
         double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         deal_type_label = profit < 0 ? "WITHDRAWAL" : "DEPOSIT";
      }

      if(deal_type != DEAL_TYPE_BALANCE && StringLen(symbol) > 0)
         AddSymbol(symbol, symbols, symbol_count);

      double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
      datetime deal_time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      long position_id = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

      if(StringLen(json) > 1)
         json += ",";
      json += "{";
      json += "\"deal_id\":\"" + IntegerToString(ticket) + "\",";
      json += "\"position_id\":\"" + IntegerToString(position_id) + "\",";
      json += "\"symbol\":\"" + (StringLen(symbol) > 0 ? symbol : "BALANCE") + "\",";
      json += "\"time_ms\":" + IntegerToString((long)deal_time * 1000) + ",";
      json += "\"entry\":" + IntegerToString((int)entry) + ",";
      json += "\"type\":" + IntegerToString(type_value) + ",";
      json += "\"volume\":" + DoubleToString(volume, 2) + ",";
      json += "\"price\":" + DoubleToString(price, 8) + ",";
      json += "\"profit\":" + DoubleToString(profit, 2) + ",";
      json += "\"commission\":" + DoubleToString(commission, 2) + ",";
      json += "\"swap\":" + DoubleToString(swap, 2) + ",";
      json += "\"deal_type\":\"" + deal_type_label + "\"";
      json += "}";
   }

   json += "]";
   return json;
}

string BuildSymbolsJson(string &symbols[], int symbol_count)
{
   string json = "[";
   for(int i = 0; i < symbol_count; i++)
   {
      string symbol = symbols[i];
      double contract_size = SymbolInfoDouble(symbol, SYMBOL_TRADE_CONTRACT_SIZE);
      double tick_value = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
      double tick_size = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
      if(StringLen(json) > 1)
         json += ",";
      json += "{";
      json += "\"symbol\":\"" + symbol + "\",";
      json += "\"contract_size\":" + DoubleToString(contract_size, 2) + ",";
      json += "\"tick_value\":" + DoubleToString(tick_value, 5) + ",";
      json += "\"tick_size\":" + DoubleToString(tick_size, 8);
      json += "}";
   }
   json += "]";
   return json;
}

string BuildPayload()
{
   string cycle_source = "";
   datetime cycle_start = ResolveTradingCycleStart(cycle_source);
   long anchor_ms = (long)cycle_start * 1000;

   string symbols[];
   int symbol_count = 0;

   string positions_json = BuildPositionsJson(symbols, symbol_count);
   string deals_json = BuildDealsJson(cycle_start, symbols, symbol_count);
   string symbols_json = BuildSymbolsJson(symbols, symbol_count);

   string json = "{";
   json += "\"account_number\":\"" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
   json += "\"platform\":\"mt5\",";
   json += "\"current_balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   json += "\"current_equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
   json += "\"trading_cycle_start\":\"" + FormatIso(cycle_start) + "\",";
   json += "\"trading_cycle_source\":\"" + cycle_source + "\",";
   json += "\"anchor_time_ms\":" + IntegerToString(anchor_ms) + ",";
   json += "\"positions\":" + positions_json + ",";
   json += "\"closed_deals\":" + deals_json + ",";
   json += "\"symbols\":" + symbols_json;
   json += "}";
   return json;
}

bool HasValidAccountSnapshot()
{
   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   bool connected = (bool)TerminalInfoInteger(TERMINAL_CONNECTED);

   if(!connected)
   {
      Print("[ReplayMetricsEA] Skipping metrics capture: terminal not connected.");
      return false;
   }

   if(login <= 0)
   {
      Print("[ReplayMetricsEA] Skipping metrics capture: account login not ready.");
      return false;
   }

   if(balance <= 0 || equity <= 0)
   {
      PrintFormat(
         "[ReplayMetricsEA] Capturing zero/negative snapshot for logged-in account balance=%.2f equity=%.2f.",
         balance,
         equity
      );
   }

   return true;
}

bool WritePayloadToFile(string json)
{
   string filename = "metrics_" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + ".json";
   int handle = FileOpen(filename, FILE_WRITE | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE)
   {
      PrintFormat("FileOpen error %d (GetLastError=%d)", handle, GetLastError());
      return false;
   }
   FileWriteString(handle, json);
   FileClose(handle);
   return true;
}

int OnInit()
{
   string symbol = (StringLen(TARGET_SYMBOL) > 0 ? TARGET_SYMBOL : _Symbol);
   ENUM_TIMEFRAMES timeframe = (TARGET_TIMEFRAME == PERIOD_CURRENT ? (ENUM_TIMEFRAMES)_Period : TARGET_TIMEFRAME);
   long target_chart = EnsureChart(symbol, timeframe);
   if(target_chart <= 0)
   {
      Print("[ReplayMetricsEA] Failed to find or open chart.");
      return INIT_FAILED;
   }

   if(target_chart != ChartID())
   {
      bool applied = ChartApplyTemplate(target_chart, TARGET_TEMPLATE);
      PrintFormat("[ReplayMetricsEA] Moving EA to chart %I64d (template=%s, applied=%d)", target_chart, TARGET_TEMPLATE, applied);
      ChartClose(ChartID());
      return INIT_FAILED;
   }

   EventSetTimer(TIMER_SECONDS);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   if(HasValidAccountSnapshot())
   {
      string payload = BuildPayload();
      WritePayloadToFile(payload);
   }
   EventKillTimer();
   long chart_id = ChartID();
   if(chart_id > 0)
      ChartClose(chart_id);
   ExpertRemove();
   TerminalClose(0);
}