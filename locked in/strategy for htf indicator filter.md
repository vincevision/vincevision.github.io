Using a **Higher Timeframe (HTF)** EMA crossover alongside **Market Structure** is how you turn a basic "indicator bot" into a high-probability trading system.

Instead of taking every 9/21 cross you see, you are using the HTF to decide the **direction** and Market Structure to decide the **timing**.

---

### 1. How to use HTF EMA Crossover on a Lower TF

The goal is to only trade in the direction of the "Big Trend." If the 9/21 cross on the HTF is Bullish, you **only** look for Buy signals on your lower timeframe.

* **The Multiplier Rule:** Use a 4x to 15x multiplier.
* If trading the **M1**, use the **M15** for HTF Bias.
* If trading the **M5**, use the **H1** for HTF Bias.


* **Implementation (TradingView):** You don't need to switch tabs constantly. In your indicator settings (or the Pine Script I can provide), you can use the `request.security()` function to pull the EMA values from the M15 chart directly onto your M1 chart.
* **The Filter:**
* **9 HTF > 21 HTF:** Only take "Buy" crosses on your M1.
* **9 HTF < 21 HTF:** Only take "Sell" crosses on your M1.



---

### 2. Using Market Structure (The Secret Sauce)

Market structure helps you avoid "Fakeouts" where the EMAs cross but the price immediately reverses. You are looking for a **Break of Structure (BOS)** or a **Change of Character (CHoCH)**.

#### The "Structure + Cross" Workflow:

1. **Identify HTF Bias:** Check M15. Is 9 EMA > 21 EMA? (Bias = Bullish).
2. **Wait for the LTF Setup:** On M1, wait for the price to drop and the 9 EMA to cross below the 21 EMA (this is a pullback).
3. **The CHoCH:** Don't buy as soon as they cross back up. Wait for the price to break above the **recent Swing High**.
4. **Entry:** Once the 9 crosses back above the 21 **AND** that high is broken, you enter.

---

### 3. Pine Script Example (HTF Filter + Structure)

This script adds an HTF filter to the EMA logic. It will only color the background green or red if the **M15** trend matches your **M1** cross.

```pinescript
//@version=5
indicator("EMA 9/21 with HTF Filter", overlay=true)

// Inputs
htf = input.timeframe("15", "Higher Timeframe")
fastLen = 9
slowLen = 21

// LTF EMAs (Current Chart)
fastEMA = ta.ema(close, fastLen)
slowEMA = ta.ema(close, slowLen)

// HTF EMAs (Requested from M15)
htfFast = request.security(syminfo.tickerid, htf, ta.ema(close, fastLen))
htfSlow = request.security(syminfo.tickerid, htf, ta.ema(close, slowLen))

// Bias Logic
htfBullish = htfFast > htfSlow
htfBearish = htfFast < htfSlow

// Signals
buySignal = ta.crossover(fastEMA, slowEMA) and htfBullish
sellSignal = ta.crossunder(fastEMA, slowEMA) and htfBearish

// Plotting
plot(fastEMA, color=color.blue, title="9 EMA")
plot(slowEMA, color=color.orange, title="21 EMA")

// Visualizing HTF Trend
bgcolor(htfBullish ? color.new(color.green, 90) : color.new(color.red, 90))

plotshape(buySignal, style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small)
plotshape(sellSignal, style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small)

```

---

### Summary Checklist

| Step | Action | Purpose |
| --- | --- | --- |
| **1. Filter** | Is the 9/21 EMA crossed up on the **M15**? | Establish the "Big Picture" trend. |
| **2. Setup** | Did a 9/21 cross happen on the **M1**? | Momentum signal. |
| **3. Structure** | Did the price break the **Last High/Low**? | Confirming that buyers/sellers are actually in control. |

[How to trade Market Structure with EMAs](https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DS2fF_T346Fk)

**Would you like me to refine the MT5 code so it only takes trades when the price breaks the previous candle's High/Low (Market Structure confirmation)?**
