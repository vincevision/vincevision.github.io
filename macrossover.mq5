//+------------------------------------------------------------------+
//|  MA Crossover + Donchian Filter (TP = Midband) - MT5 EA          |
//|  SMA only, based on your TradingView strategy                    |
//+------------------------------------------------------------------+
#property strict
#property copyright ""
#property link      ""
#property version   "1.00"

//--- include trading class
#include <Trade\Trade.mqh>

//--- input parameters (all adjustable in EA properties)
input int    FastMAPeriod       = 9;      // Fast SMA length
input int    SlowMAPeriod       = 21;     // Slow SMA length

input int    DonchianPeriod     = 20;     // Donchian channel length
input int    DonchLookbackBars  = 3;      // Max bars since OB/OS allowed

input int    ATRPeriod          = 14;     // ATR length
input double SL_ATR_Multiplier  = 2.0;    // SL = ATR * multiplier

input bool   AllowLongs         = true;   // Allow long trades (oversold)
input bool   AllowShorts        = true;   // Allow short trades (overbought)

input double Lots               = 0.10;   // Fixed lot size
input ulong  MagicNumber        = 123456; // Magic number
input uint   SlippagePoints     = 50;     // Max deviation in points

//--- global trading object
CTrade   trade;

//--- indicator handles
int      handleFastMA = INVALID_HANDLE;
int      handleSlowMA = INVALID_HANDLE;
int      handleATR    = INVALID_HANDLE;

//--- last processed bar time
datetime lastBarTime  = 0;

//+------------------------------------------------------------------+
//| Helper: max of two ints                                          |
//+------------------------------------------------------------------+
int MaxInt(int a, int b)
{
   return (a > b ? a : b);
}

//+------------------------------------------------------------------+
//| Get current position direction for this symbol & magic           |
//| returns: 1 = long, -1 = short, 0 = flat or different magic      |
//+------------------------------------------------------------------+
int GetPositionDirection()
{
   if(!PositionSelect(_Symbol))
      return 0;

   ulong pos_magic = (ulong)PositionGetInteger(POSITION_MAGIC);
   if(pos_magic != MagicNumber)
      return 0;

   ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
   if(type == POSITION_TYPE_BUY)
      return 1;
   if(type == POSITION_TYPE_SELL)
      return -1;

   return 0;
}

//+------------------------------------------------------------------+
//| Compute Donchian mid for bar[1] and OB/OS recency                |
//| overboughtRecent / oversoldRecent mimic Pine barssince logic     |
//+------------------------------------------------------------------+
bool GetDonchianSignals(bool &overboughtRecent, bool &oversoldRecent,
                        double &donchUpper1, double &donchLower1)
{
   overboughtRecent = false;
   oversoldRecent   = false;

   int bars = Bars(_Symbol, PERIOD_CURRENT);
   if(bars <= DonchianPeriod + DonchLookbackBars + 2)
      return false;

   // Donchian for bar[1]: highest/lowest over last DonchianPeriod bars up to bar[1]
   // iHighest/iLowest in MT5: (symbol, timeframe, type, start, count)
   int hiIndex1 = iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, 1, DonchianPeriod);
   int loIndex1 = iLowest (_Symbol, PERIOD_CURRENT, MODE_LOW,  1, DonchianPeriod);
   if(hiIndex1 < 0 || loIndex1 < 0)
      return false;

   donchUpper1 = iHigh(_Symbol, PERIOD_CURRENT, hiIndex1);
   donchLower1 = iLow (_Symbol, PERIOD_CURRENT, loIndex1);

   // Check last (DonchLookbackBars + 1) closed bars: shifts 1..(1+DonchLookbackBars)
   for(int k = 0; k <= DonchLookbackBars; k++)
   {
      int shift = 1 + k;
      if(shift + DonchianPeriod - 1 >= bars)
         break;

      int hiIndex = iHighest(_Symbol, PERIOD_CURRENT, MODE_HIGH, shift, DonchianPeriod);
      int loIndex = iLowest (_Symbol, PERIOD_CURRENT, MODE_LOW,  shift, DonchianPeriod);
      if(hiIndex < 0 || loIndex < 0)
         continue;

      double donchUpper = iHigh(_Symbol, PERIOD_CURRENT, hiIndex);
      double donchLower = iLow (_Symbol, PERIOD_CURRENT, loIndex);

      double barHigh = iHigh(_Symbol, PERIOD_CURRENT, shift);
      double barLow  = iLow (_Symbol, PERIOD_CURRENT, shift);

      // Overbought: bar high >= Donchian upper
      if(!overboughtRecent && barHigh >= donchUpper)
         overboughtRecent = true;

      // Oversold: bar low <= Donchian lower
      if(!oversoldRecent && barLow <= donchLower)
         oversoldRecent = true;

      if(overboughtRecent && oversoldRecent)
         break;
   }

   return true;
}

//+------------------------------------------------------------------+
//| Open long position                                                |
//+------------------------------------------------------------------+
void OpenLong(double sl, double tp)
{
   if(Lots <= 0.0)
      return;

   sl = NormalizeDouble(sl, _Digits);
   tp = NormalizeDouble(tp, _Digits);

   if(!trade.Buy(Lots, _Symbol, 0.0, sl, tp, "MA Donchian Long"))
   {
      Print(__FUNCTION__, ": Buy failed. Error ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Open short position                                               |
//+------------------------------------------------------------------+
void OpenShort(double sl, double tp)
{
   if(Lots <= 0.0)
      return;

   sl = NormalizeDouble(sl, _Digits);
   tp = NormalizeDouble(tp, _Digits);

   if(!trade.Sell(Lots, _Symbol, 0.0, sl, tp, "MA Donchian Short"))
   {
      Print(__FUNCTION__, ": Sell failed. Error ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| Expert initialization                                             |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber((int)MagicNumber);
   trade.SetDeviationInPoints((int)SlippagePoints);
   trade.SetTypeFillingBySymbol(_Symbol);

   //--- create indicator handles (SMA only)
   handleFastMA = iMA(_Symbol, PERIOD_CURRENT, FastMAPeriod, 0, MODE_SMA, PRICE_CLOSE);
   handleSlowMA = iMA(_Symbol, PERIOD_CURRENT, SlowMAPeriod, 0, MODE_SMA, PRICE_CLOSE);
   handleATR    = iATR(_Symbol, PERIOD_CURRENT, ATRPeriod);

   if(handleFastMA == INVALID_HANDLE ||
      handleSlowMA == INVALID_HANDLE ||
      handleATR    == INVALID_HANDLE)
   {
      Print("Failed to create indicator handles. Error = ", GetLastError());
      return INIT_FAILED;
   }

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(handleFastMA != INVALID_HANDLE)
      IndicatorRelease(handleFastMA);
   if(handleSlowMA != INVALID_HANDLE)
      IndicatorRelease(handleSlowMA);
   if(handleATR != INVALID_HANDLE)
      IndicatorRelease(handleATR);
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   //--- work only once per new bar (bar close logic)
   datetime currentBarTime = iTime(_Symbol, PERIOD_CURRENT, 0);
   if(currentBarTime == 0)
      return;

   if(currentBarTime == lastBarTime)
      return;

   lastBarTime = currentBarTime;

   //--- ensure enough history
   int bars = Bars(_Symbol, PERIOD_CURRENT);
   int minBars = MaxInt(MaxInt(FastMAPeriod, SlowMAPeriod),
                        MaxInt(DonchianPeriod + DonchLookbackBars,
                               ATRPeriod + 2)) + 5;
   if(bars < minBars)
      return;

   //--- Donchian + OB/OS recency (context: bar[1])
   bool overboughtRecent = false;
   bool oversoldRecent   = false;
   double donchUpper1, donchLower1;
   if(!GetDonchianSignals(overboughtRecent, oversoldRecent, donchUpper1, donchLower1))
      return;

   double donchMid1 = (donchUpper1 + donchLower1) / 2.0;

   //--- ATR on bar[1]
   double atrBuf[1];
   if(CopyBuffer(handleATR, 0, 1, 1, atrBuf) != 1)
      return;
   double atrVal = atrBuf[0];
   if(atrVal <= 0.0)
      return;

   //--- SMA values on bar[1] and bar[2] (SMA ONLY)
   double buf[1];

   if(CopyBuffer(handleFastMA, 0, 1, 1, buf) != 1) return;
   double fastMA1 = buf[0];

   if(CopyBuffer(handleFastMA, 0, 2, 1, buf) != 1) return;
   double fastMA2 = buf[0];

   if(CopyBuffer(handleSlowMA, 0, 1, 1, buf) != 1) return;
   double slowMA1 = buf[0];

   if(CopyBuffer(handleSlowMA, 0, 2, 1, buf) != 1) return;
   double slowMA2 = buf[0];

   if(fastMA1 == 0.0 || fastMA2 == 0.0 || slowMA1 == 0.0 || slowMA2 == 0.0)
      return;

   //--- MA cross logic (equivalent to Pine crossover / crossunder)
   bool maBullCross = (fastMA2 < slowMA2 && fastMA1 >= slowMA1);
   bool maBearCross = (fastMA2 > slowMA2 && fastMA1 <= slowMA1);

   bool longSignal  = AllowLongs  && maBullCross && oversoldRecent;
   bool shortSignal = AllowShorts && maBearCross && overboughtRecent;

   if(!longSignal && !shortSignal)
      return;

   //--- current position: 1=long, -1=short, 0=flat
   int posDir = GetPositionDirection();

   //--- reference close price for signal bar (bar[1])
   double entryRefPrice = iClose(_Symbol, PERIOD_CURRENT, 1);
   if(entryRefPrice <= 0.0)
      return;

   //--- compute SL/TP from signal bar
   double longSL  = NormalizeDouble(entryRefPrice - atrVal * SL_ATR_Multiplier, _Digits);
   double longTP  = NormalizeDouble(donchMid1, _Digits);
   double shortSL = NormalizeDouble(entryRefPrice + atrVal * SL_ATR_Multiplier, _Digits);
   double shortTP = NormalizeDouble(donchMid1, _Digits);

   //--- execute trading logic
   if(longSignal)
   {
      // if currently short, close it
      if(posDir < 0)
         trade.PositionClose(_Symbol);

      // open long only if flat
      if(GetPositionDirection() == 0)
         OpenLong(longSL, longTP);
   }
   else if(shortSignal)
   {
      // if currently long, close it
      if(posDir > 0)
         trade.PositionClose(_Symbol);

      // open short only if flat
      if(GetPositionDirection() == 0)
         OpenShort(shortSL, shortTP);
   }
}
//+------------------------------------------------------------------+
