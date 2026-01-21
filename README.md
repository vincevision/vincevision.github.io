
## 1. Strategy Overview

This strategy combines:

1. **OB/OS Oscillator (from your Pine script)**  
   - Custom oscillator derived from EMA and standard deviation of a price composite.  
   - Signals:
     - **BUY** when `up` crosses **above** `down` (crossover).
     - **SELL** when `up` crosses **below** `down` (crossunder).

2. **200‑period SMA Trend Filter (on the Signal TF)**  
   - If price (close) is **above** the 200 SMA → only allow **BUY** signals.  
   - If price is **below** the 200 SMA → only allow **SELL** signals.  
   - This can be turned on/off via EA input.

3. **Anchor Timeframe Previous Candle (for TP/SL)**  
   - On a higher timeframe (Anchor TF), use the **previous candle’s high/low** as key levels.
   - For each trade:
     - **BUY:**
       - **TP** = previous Anchor candle **HIGH**
       - **SL** = previous Anchor candle **LOW** minus a small buffer
     - **SELL:**
       - **TP** = previous Anchor candle **LOW**
       - **SL** = previous Anchor candle **HIGH** plus a small buffer

4. **Late Entry Logic**  
   - Even if the original OB/OS crossover happened several bars ago:
     - As long as the oscillator is still in the same direction,
     - And the 200 MA trend filter still agrees,
     - And no trade has yet been opened for that signal,
   - The EA is allowed to **enter late** into that signal.

---

## 2. Timeframe Structure

The strategy uses two timeframes:

1. **Signal Timeframe (LTF)** – where signals are generated and trades are executed.  
   - EA input: `InpSignalTF`  
   - Examples: M5, M15, M30.

2. **Anchor Timeframe (HTF)** – where TP/SL levels are taken from the previous candle.  
   - EA input: `InpAnchorTF`  
   - Examples: H1, H4, D1.

Typical combinations:

- LTF = M5, HTF = H1  
- LTF = M15, HTF = H1 or H4  
- LTF = M30, HTF = H4

Higher Anchor TF → wider TP/SL, fewer but larger trades.

---

## 3. Entry Rules (Conceptual)

### 3.1 BUY Setup

On the **Signal TF**:

1. OB/OS oscillator:
   - `up` crosses **above** `down` on the last closed candle → raw BUY signal.

2. Trend filter (if enabled):
   - 200 SMA (on Signal TF) on the last closed candle.
   - **BUY only if**:
     - `close[1]` (last closed candle close) is **greater than** the MA value.

3. Anchor TF:
   - Previous candle (shift 1) exists with valid **high** and **low**.

If all conditions are satisfied, the EA is allowed to open a **BUY**.

### 3.2 SELL Setup

On the **Signal TF**:

1. OB/OS oscillator:
   - `up` crosses **below** `down` on the last closed candle → raw SELL signal.

2. Trend filter (if enabled):
   - **SELL only if**:
     - `close[1]` is **less than** the 200 SMA value.

3. Anchor TF:
   - Previous candle (shift 1) has valid **high** and **low**.

If all conditions are satisfied, the EA is allowed to open a **SELL**.

---

## 4. TP and SL Placement

On each trade, the EA reads the **previous candle** (`shift=1`) on the **Anchor TF**:

- `ancHigh = iHigh(symbol, AnchorTF, 1)`
- `ancLow  = iLow (symbol, AnchorTF, 1)`

Then:

### BUY Trades

- **Entry price**: current Ask.
- **Take Profit (TP)**:  
  - TP = `ancHigh` (previous Anchor TF candle high).
- **Stop Loss (SL)**:  
  - SL = `ancLow` – `InpSL_Buffer_Points * Point`  
    (i.e. just below the Anchor low with a small buffer).

### SELL Trades

- **Entry price**: current Bid.
- **Take Profit (TP)**:  
  - TP = `ancLow` (previous Anchor TF candle low).
- **Stop Loss (SL)**:  
  - SL = `ancHigh` + `InpSL_Buffer_Points * Point`  
    (i.e. just above the Anchor high with a small buffer).

The EA also enforces broker minimum stop distance (`SYMBOL_TRADE_STOPS_LEVEL`) to avoid invalid SL/TP.

---

## 5. Late Entry Logic

The EA tracks:

- `g_lastSignalDir`: last OB/OS signal direction:
  - `1` = BUY, `-1` = SELL, `0` = none.
- `g_tradeOpenedForSignal`: whether a trade has already been opened for that signal.
- Current oscillator direction (on last closed bar).

**Late entry condition:**

The EA will open a trade if:

1. No current position on this symbol.
2. `g_lastSignalDir` is not 0 (there was a valid signal in the past).
3. No trade has yet been opened for that signal (`g_tradeOpenedForSignal == false`).
4. The oscillator is still in that same direction on the last closed bar:
   - `up1 > down1` and `g_lastSignalDir == 1`, or
   - `up1 < down1` and `g_lastSignalDir == -1`.
5. Trend filter (if enabled) still agrees with `g_lastSignalDir`.

This is what allows the EA to **enter late** into ongoing signals.

---

## 6. EA Inputs Explained

When you attach the EA in MT5, you will see inputs similar to:

- **Trading**
  - `InpLots`: fixed lot size per trade.
  - `InpSlippagePoints`: maximum slippage in points.
  - `InpMagicNumber`: unique ID to distinguish this EA’s trades.

- **Timeframes**
  - `InpSignalTF`: timeframe where entries and OB/OS logic run (e.g., `PERIOD_M5`).
  - `InpAnchorTF`: timeframe used for previous candle high/low TP/SL (e.g., `PERIOD_H1`).

- **Oscillator & Trend**
  - `InpOscLength`: length for the OB/OS oscillator (matches Pine `lenOsc`, default 5).
  - `InpMALength`: moving average length (usually 200).
  - `InpUseTrendFilter`: `true` to use 200 MA trend filter; `false` to ignore trend and allow all OB/OS signals.

- **Stop Loss Buffer**
  - `InpSL_Buffer_Points`: number of points beyond the Anchor candle high/low to place SL.  
    Example: 5 points on a 2‑digit instrument = 0.05 units; on a 5‑digit forex pair, 5 points = 0.5 pip.

---

## 7. Step‑by‑Step: How to Use the EA in MT5

### Step 1 – Install the EA

1. Open **MetaTrader 5**.
2. In MetaEditor:  
   - `File → New → Expert Advisor (template)` → name it `OB_OS_HTF_TP_EA`.
   - Replace the template code with the EA code you have.
   - `File → Save` and then click **Compile** (F7).
3. In MT5, the EA should appear under **Navigator → Expert Advisors**.

### Step 2 – Choose Symbol and Timeframes

1. Open the chart for the symbol you want to trade (e.g., a Deriv synthetic index or forex pair).
2. Set the chart to your **Signal TF** (this can be independent from the input, but they should match for clarity).
3. Decide:
   - Signal TF (e.g. M5).
   - Anchor TF (e.g. H1).

### Step 3 – Attach the EA

1. Drag the EA onto the chart or right-click → **Attach to chart**.
2. In the EA settings:
   - On the **Common** tab:
     - Enable **Allow Algo Trading**.
   - On the **Inputs** tab:
     - Set:
       - `InpLots` – your desired fixed lot size.
       - `InpSignalTF` – e.g. `PERIOD_M5`.
       - `InpAnchorTF` – e.g. `PERIOD_H1`.
       - `InpUseTrendFilter` – usually `true` (recommended).
       - `InpSL_Buffer_Points` – small buffer (e.g. 5–20 points depending on instrument).
3. Click **OK**.

Make sure the main MT5 toolbar “Algo Trading” button is **enabled**.

### Step 4 – What Happens Internally

On initialization (`OnInit`):

- The EA:
  - Validates parameters.
  - Sets `g_signalTF` and `g_anchorTF`.
  - Creates the 200 SMA handle for the Signal TF.
  - Scans history on the Signal TF to find the **last OB/OS signal** and stores:
    - `g_lastSignalDir` (1, -1, or 0),
    - `g_lastSignalTime`,
    - flags `g_tradeOpenedForSignal = false`.

On each new **Signal TF bar** (`OnTick` + `OnNewBar`):

1. Recalculate OB/OS values for the last two closed bars.
2. Read MA(200) value for the last closed bar.
3. Detect **new raw BUY/SELL** OB/OS crossovers.
4. Apply the 200 MA trend filter if enabled.
5. If a **fresh signal**:
   - Update `g_lastSignalDir`.
   - Possibly close opposite position.
   - Mark `g_tradeOpenedForSignal = false`.
6. Check for **late entry** condition:
   - If no current position and the last signal is still valid and trend agrees → open trade using Anchor TF previous candle high/low as TP/SL.

---

## 8. Example Workflow (Manual Understanding)

Let’s say:

- `Signal TF` = M15.
- `Anchor TF` = H1.
- 200 MA trend filter is ON.

### BUY Example

1. On **H1**, candle [1] (previous hour) has:
   - High = 1.2050
   - Low  = 1.2000

2. On **M15**:
   - The OB/OS oscillator produces a **BUY** signal (up crosses above down).
   - The last closed M15 candle closes at 1.2015 **above** the M15 200 SMA.
   - The EA checks:
     - No current position.
     - There is a valid Anchor TF previous candle.
   - EA opens a **BUY** at market.

3. EA sets:
   - TP = 1.2050 (H1 previous candle high).
   - SL = 1.2000 – buffer (e.g., 5 points) = 1.1995.

### Late Entry for the Same BUY Signal

- Suppose the EA was attached after that M15 crossover already happened.
- If:
  - The oscillator is still in buy regime (up > down on last closed bar),
  - Price still above 200 SMA,
  - No trade has been opened yet for `g_lastSignalDir = 1`,
- The EA will still **enter BUY** with the same Anchor TF logic.

---

## 9. Risk Management & Tips

- **Lot size**: Adjust `InpLots` so that distance from entry → SL (using your Anchor TF) is compatible with your risk per trade (e.g., 1–2% of account).
- **Timeframe combination**:
  - Smaller Signal TF vs larger Anchor TF = fewer trades but larger TP/SL.
  - You can experiment, but keep Signal TF at least 3–4x smaller than Anchor TF for clean structure.
- **Trend filter**:
  - Recommended to keep `InpUseTrendFilter = true` to avoid counter‑trend signals.
- **Spread / Volatility**:
  - On very volatile symbols, consider raising `InpSL_Buffer_Points` to avoid SL exactly at the Anchor candle extreme.
- **One position at a time**:
  - This EA uses net position logic per symbol; it assumes one net position.

---

## 10. How to Use the Strategy Manually (Discretionary)

If you want to apply the same logic manually (without or alongside the EA):

1. Choose **Anchor TF** (H1/H4/D1) and **Signal TF** (M5/M15/M30).
2. On Anchor TF:
   - Mark the **previous candle’s high** and **low**.
3. On Signal TF:
   - Apply:
     - OB/OS oscillator.
     - 200 SMA.
   - In uptrend (price above 200 SMA):
     - Wait for **BUY** OB/OS crossover.
     - Entry: near lower part of range, or as soon as you see the signal.
     - TP: Anchor previous candle **high**.
     - SL: Anchor previous candle **low** minus a small buffer.
   - In downtrend (price below 200 SMA):
     - Wait for **SELL** OB/OS crossover.
     - TP: Anchor previous candle **low**.
     - SL: Anchor previous candle **high** plus buffer.

The EA automates exactly this logic, including letting you enter even if you’re late, as long as the conditions remain valid.
