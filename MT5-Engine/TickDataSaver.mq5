//+------------------------------------------------------------------+
//|     LiveTickSender_BATCH_FINAL_CLEAN.mq5                        |
//+------------------------------------------------------------------+
#property strict

string SERVICE_URL = "http://127.0.0.1:8200/submit_ticks";
int TIMEOUT = 5000;

#define BATCH_SIZE 20

MqlTick tick_buffer[];
int tick_count = 0;

long last_time_msc = 0;

//+------------------------------------------------------------------+
string ToStrLong(long v)
{
    return StringFormat("%.0f", (double)v);
}

string ToStrDouble(double v)
{
    return StringFormat("%.5f", v);
}

bool IsValidNumber(double v)
{
    return (v == v && v != DBL_MAX && v != -DBL_MAX);
}

//+------------------------------------------------------------------+
void OnTick()
{
    MqlTick tick;

    if(!SymbolInfoTick(_Symbol, tick))
        return;

    if(tick.time_msc == last_time_msc)
        return;

    last_time_msc = tick.time_msc;

    ArrayResize(tick_buffer, tick_count + 1);
    tick_buffer[tick_count] = tick;
    tick_count++;

    if(tick_count >= BATCH_SIZE)
    {
        SendBatch();
        tick_count = 0;
        ArrayResize(tick_buffer, 0);
    }
}

//+------------------------------------------------------------------+
void SendBatch()
{
    int total = ArraySize(tick_buffer);
    if(total == 0)
        return;

    string parts[];
    ArrayResize(parts, total);

    int valid_count = 0;

    for(int i=0; i<total; i++)
    {
        double bid_val = tick_buffer[i].bid;
        double ask_val = tick_buffer[i].ask;

        if(!IsValidNumber(bid_val) || !IsValidNumber(ask_val))
            continue;

        string obj = "{";
        obj += "\"time\":" + ToStrLong(tick_buffer[i].time_msc) + ",";
        obj += "\"bid\":" + ToStrDouble(bid_val) + ",";
        obj += "\"ask\":" + ToStrDouble(ask_val);
        obj += "}";

        parts[valid_count] = obj;
        valid_count++;
    }

    if(valid_count == 0)
        return;

    string ticks_json = parts[0];
    for(int i=1; i<valid_count; i++)
        ticks_json += "," + parts[i];

    string json = "{";
    json += "\"symbol\":\"" + _Symbol + "\",";
    json += "\"ticks\":[" + ticks_json + "]";
    json += "}";

    char data[];
    int len = StringToCharArray(json, data, 0, StringLen(json), CP_UTF8);
    ArrayResize(data, len);

    char response[];
    string headers = "Content-Type: application/json\r\n";

    int result = WebRequest("POST", SERVICE_URL, headers, TIMEOUT, data, response, headers);

    // 🔥 ONLY LOG ERRORS
    if(result == -1)
    {
        Print("❌ Send failed: ", GetLastError());
    }
}
//+------------------------------------------------------------------+