## JaeFX-Style Liquidity + Structure Strategy (Using Standard Confirmations)

This is a rules-based system built around **trend + liquidity + market structure**, and it uses the **same “standard confirmation” at a zone** whether you’re trading higher TF or lower TF.

> Core idea: **Don’t predict. Mark structure, mark the zone that caused the shift, then wait for price to return and confirm again at that zone before entering.**

---

## 1) Concepts Used (JaeFX Language)

- **Trend / Market Structure**
  - Bullish structure: price makes higher highs/higher lows.
  - Bearish structure: price makes lower lows/lower highs.

- **Liquidity**
  - “Pools” are obvious areas where stops sit: prior highs/lows, equal highs/lows, clean swing points.
  - Price often **runs liquidity first** (sweeps a low/high) before moving the real direction.

- **Supply / Demand Zone (POI)**
  - The zone you care about is the one that **caused displacement** and **broke structure** (the zone that “did the damage”).
  - Example: if price breaks a low and shifts bearish, you mark the **supply** that caused that break.

- **Standard Confirmation**
  - When price returns to your POI (supply/demand), you wait for:
    1) a **liquidity event** (break/sweep of a local high/low)
    2) then a **structure shift** in your intended direction
    3) then you enter on a retracement (mitigation) with SL beyond the zone

---

## 2) The System in Two Parts

### Part A — Bias: “Mark the Trend + What Price Is Doing”
1) Identify current structure (bullish or bearish).
2) Mark important liquidity pools:
   - previous highs/lows
   - equal highs/equal lows
   - obvious swing points
3) Watch for a **break + shift** (structure changes character).

---

### Part B — Execution: Trade From the Zone That Caused the Shift

## 3) Continuation / Shift Example (Bearish Shift)

**Condition:**
- Price **breaks a high**, then **suddenly shifts bearish** and **breaks a low** (bearish change).

**What you mark:**
- Mark the **supply zone** that caused the low to break (the origin of the bearish move).

**Entry plan:**
- Wait for price to **retrace back into that supply**.
- Use the **standard confirmation at the zone** (see Section 5).

**Target:**
- The **next liquidity pool**, typically:
  - the next demand zone
  - a prior low
  - an obvious liquidity resting point below

---

## 4) Demand Zone Longs (Same Confirmation Logic)

When price taps a **demand zone**, you want to see the **same idea**: liquidity taken + shift.

### Demand Zone Confirmation (Long)
At the demand zone, wait for:
1) **A low break / sweep** (liquidity grab below a local low)
2) Then a **sudden bullish shift** (market structure shift to bullish)

**Stop loss:**
- Below the demand zone.

**Target:**
- Next liquidity pool above (prior high, equal highs, next supply, etc.).

---

## 5) The “Standard Confirmation” Checklist (Your Trigger)

Use this as a strict entry filter *at the zone*:

### For a Long (from Demand)
- Price taps demand (POI)
- **Sweeps/breaks a local low** (liquidity taken)
- Then **shifts bullish** (breaks a key swing high / structure flips)
- Enter on retracement after the shift (safer than chasing)

### For a Short (from Supply)
- Price taps supply (POI)
- **Sweeps/breaks a local high** (liquidity taken)
- Then **shifts bearish** (breaks a key swing low / structure flips)
- Enter on retracement after the shift

---

## 6) Exits / Trade Management

**Primary target:**
- “Next liquidity pool” in the direction of your trade.

**Stop placement:**
- Always beyond the zone you’re trading from:
  - longs: SL below demand
  - shorts: SL above supply

**Optional confluence (not required): 9 & 21 crossover**
- You can use a **9/21 EMA cross** to:
  - add confluence (only take longs when EMA alignment supports it, same for shorts)
  - trail the trade (manage exits as price moves)

---

## 7) Simple Rules Summary (One Page)

1) Mark trend + market structure.
2) Mark liquidity pools (highs/lows, equal highs/lows).
3) When structure shifts, mark the **zone that caused the break** (supply/demand).
4) Wait for price to return to the zone.
5) At the zone, only enter after **standard confirmation**:
   - sweep (liquidity taken) → shift → retracement entry
6) SL beyond zone.
7) TP at next liquidity pool.
8) Practice + journal (screenshots, reasons, outcome).
