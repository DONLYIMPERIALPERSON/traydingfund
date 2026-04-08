#property script_show_inputs
#property strict

string NormalizeSymbolName(const string symbol)
{
   string normalized = symbol;
   int len = StringLen(normalized);
   if(len == 0) return normalized;

   string last_char = StringSubstr(normalized, len - 1, 1);
   if(last_char == "m" || last_char == "_")
      normalized = StringSubstr(normalized, 0, len - 1);

   len = StringLen(normalized);
   if(len >= 2 && StringSubstr(normalized, len - 2, 2) == ".r")
      normalized = StringSubstr(normalized, 0, len - 2);

   return normalized;
}

void OnStart()
{
   const string file_name = "exness_symbols.json";
   int handle = FileOpen(file_name, FILE_WRITE | FILE_COMMON | FILE_TXT);
   if(handle == INVALID_HANDLE)
   {
      Print("Failed to open export file. Error: ", GetLastError());
      return;
   }

   int total = SymbolsTotal(true);
   FileWriteString(handle, "[\n", CP_UTF8);

   int written = 0;
   for(int i = 0; i < total; i++)
   {
      string symbol = SymbolName(i, true);
      if(symbol == "")
         continue;

      string category = SymbolInfoString(symbol, SYMBOL_CATEGORY);
      long trade_mode = SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE);
      string normalized = NormalizeSymbolName(symbol);

      if(written > 0)
         FileWriteString(handle, ",\n", CP_UTF8);

      string row = "  {\n";
      row += "    \"symbol\": \"" + symbol + "\",\n";
      row += "    \"normalized\": \"" + normalized + "\",\n";
      row += "    \"category\": \"" + category + "\",\n";
      row += "    \"trade_mode\": " + IntegerToString((int)trade_mode) + "\n";
      row += "  }";

      FileWriteString(handle, row, CP_UTF8);
      written++;
   }

   FileWriteString(handle, "\n]\n", CP_UTF8);
   FileClose(handle);

   Print("Export completed");
}