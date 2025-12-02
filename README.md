
- Use the **previous higher‑timeframe candle** as a frame.
- On a **lower timeframe**, trade **mean‑reversion back to the Donchian midband**, but only if that midband is **inside** the previous HTF candle’s range.
- Entries are confirmed with **Stoch RSI OB/OS** and **3/5 MA cross**.

I’ll write it as if you trade:

- HTF = **4H**
- LTF = **15m**

You can switch (e.g. 1H / 5m) later if you want.

---

## 1. Chart setup

On your **LTF chart (15m)**, load:

1. **Donchian Channel**
   - Length = 20 (you can tweak later).
   - Upper band, lower band, and **midband = (upper + lower) / 2**.

2. **3 & 5 Moving Averages**
   - 3‑period EMA (fast)
   - 5‑period EMA (slow)

3. **Stochastic RSI**
   - RSI length = 14
   - Stoch length = 14
   - %K = 3
   - %D = 3
   - Overbought = 80
   - Oversold = 20

(You can add MACD later as a higher‑TF filter if you want, but I’ll keep this core system MACD‑free to stay simple and mechanical.)

---

## 2. Higher timeframe (4H) step – build the “box”

Do this every time a **4H candle closes**.

On a **4H chart** of the same symbol:

1. Wait for the 4H candle to **close**.
2. Mark that candle’s:
   - **High** = `HTF_prev_high`
   - **Low**  = `HTF_prev_low`
3. Now go back to your **15m** chart and:
   - Draw a horizontal line (or a box) at `HTF_prev_high`.
   - Draw a horizontal line at `HTF_prev_low`.

That zone between `HTF_prev_low` and `HTF_prev_high` is your **HTF range** for the next 4H period.

---

## 3. Check the “midband inside range” condition

Still on the **15m chart**:

1. Look at your **Donchian midband** (from the 20‑period Donchian).
2. Ask:
   - Is the midband price **between** the HTF high and low?

   In words:
   - `HTF_prev_low ≤ Donchian_mid ≤ HTF_prev_high`

3. If **yes** → you are allowed to trade mean‑reversion for this 4H cycle.  
   If **no** → skip trades for this 4H cycle with this strategy (market is too imbalanced for “back to mid” logic).

Keep this very strict: **no midband in range = no trade**.

---

## 4. Long setup (buy back to midband)

You only look for longs when:

- The midband is inside the HTF range (step 3 condition = true).

Then follow these rules on the **15m**:

### 4.1. Location filter (where price is in the HTF box)

You want to buy near the **bottom** of the HTF range.

Define:
- HTF range size = `range = HTF_prev_high - HTF_prev_low`.

You want price in roughly the **lowest 1/3 of that range**, so:

- Price zone for longs ≈ `HTF_prev_low` up to `HTF_prev_low + (range / 3)`.

Visually: price is hanging around the bottom of the box.

Bonus confluence:

- 15m price is touching or breaking the **lower Donchian band** (20‑period).

### 4.2. Momentum / exhaustion: Stoch RSI

At or near that bottom zone:

1. **Stoch RSI oversold**:
   - %K < 20 and %D < 20 (or your oversold level).
2. Then **Stoch RSI turns up**:
   - %K crosses **above** %D and starts to curl up out of oversold.

This says: “the downside push is losing steam.”

### 4.3. Trigger: 3 / 5 MA bull cross

You now wait for price to actually start reverting:

- 3‑EMA crosses **above** 5‑EMA on the 15m chart.

This is your timing trigger.

### 4.4. Entry rule (long)

Once all three are true:

1. Midband is inside HTF range (step 3).
2. Price is in the **lower third** of the HTF range (and ideally near LTF Donchian low).
3. Stoch RSI was oversold and has crossed back up.
4. 3 EMA has crossed above 5 EMA.

→ **Enter long** on the close of the 15m candle that confirms the MA cross.

### 4.5. Stop loss (long)

A simple, robust rule:

- Place SL **just below the HTF low**:
  - e.g. a few ticks/pips below `HTF_prev_low`.
- Or, if that’s very far:
  - Below the most recent obvious swing low on 15m
  - But don’t place it *above* the HTF low – idea is: if HTF low breaks cleanly, the whole mean‑reversion idea is invalid.

Risk:
- Use fixed % per trade (e.g. 0.5–1% of account).
- Calculate position size from SL distance.

### 4.6. Take profit (long)

Main target:

- **Donchian midband** on the 15m chart.

You can:

- Close the full position at the midband, or
- Close 50–70% at midband, move stop to breakeven, and:
  - Let the rest ride to the top of the HTF range or a fixed R multiple (e.g. 2R).

---

## 5. Short setup (sell back to midband)

Exactly mirrored.

Only look for shorts when:

- Midband is inside the HTF range.

On the **15m**:

### 5.1. Location filter – top of the HTF box

Now you want price in the **upper 1/3** of the HTF range:

- Price zone for shorts ≈ `HTF_prev_high - (range / 3)` up to `HTF_prev_high`.

Bonus confluence:

- Price touching or poking above the **upper Donchian band** (20‑period).

### 5.2. Stoch RSI overbought and turning down

At or near that upper zone:

1. **Stoch RSI overbought**:
   - %K > 80 and %D > 80.
2. Then **Stoch RSI turns down**:
   - %K crosses **below** %D and curls down.

### 5.3. Trigger: 3 / 5 MA bear cross

- 3‑EMA crosses **below** 5‑EMA on the 15m.

### 5.4. Entry rule (short)

When all are true:

1. Midband inside the HTF range.
2. Price in upper third of HTF range (and ideally near LTF Donchian high).
3. Stoch RSI overbought → crosses down.
4. 3 EMA crosses below 5 EMA.

→ **Enter short** on the close of that 15m candle.

### 5.5. Stop loss (short)

- Place SL **just above the HTF high**:
  - A few ticks/pips above `HTF_prev_high`.
- Or, if that’s very far:
  - Above the recent swing high on 15m,
  - But idea is: if the previous HTF high is cleanly broken, mean‑reversion to midband is weaker.

### 5.6. Take profit (short)

- Target = **Donchian midband** on 15m.

Again, you can:
- Close full at midband, or  
- Take partials and trail the rest.

---

## 6. When NOT to trade

Skip trades when:

1. **Midband is not inside the HTF range.**
   - This is your main structural filter.

2. **Price has already cleanly broken the HTF range by a lot.**
   - Example: price is way above HTF high and not coming back → this is a breakout / trend move, not a mean‑reversion environment.

3. **News / extreme volatility** you don’t want to fade.
   - e.g. just before/after big economic events, or massive single candles breaking both HTF levels.

4. **Your R:R is terrible.**
   - If your stop (at/around HTF high/low) is much wider than the distance to midband, skip that trade (reward not worth the risk).

---

## 7. Summary as a checklist

For each new closed **4H** candle:

1. Mark previous 4H high and low on your 15m chart.
2. Confirm the **15m Donchian midband lies inside that high–low** range.
   - If not: no trades this 4H cycle.

Then, on the **15m**:

**LONGS:**

- Price in lower third of HTF range (ideally near 15m Donchian low).
- Stoch RSI oversold, then %K crosses up over %D.
- 3 EMA crosses above 5 EMA.
- Enter long; SL just below HTF low (or 15m swing low); TP at 15m Donch midband.

**SHORTS:**

- Price in upper third of HTF range (ideally near 15m Donchian high).
- Stoch RSI overbought, then %K crosses down under %D.
- 3 EMA crosses below 5 EMA.
- Enter short; SL just above HTF high (or 15m swing high); TP at 15m Donch midband.
