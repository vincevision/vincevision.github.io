This documentation provides a comprehensive breakdown of the **Jujuie Pro Scalper** Expert Advisor (EA). It covers the logic, risk management parameters, and operational instructions for using this tool in MetaTrader 5.

---

## 📈 Strategy Overview: EMA Momentum Scalper

The **Jujuie Pro Scalper** is a high-frequency momentum strategy designed for liquid markets (Forex, Gold). It identifies short-term trend shifts using a fast-moving average crossover and employs institutional-style trade management to protect capital.

### 1. Core Logic (The "Trigger")

The strategy utilizes two **Exponential Moving Averages (EMA)** to identify entry points:

* **Fast EMA (9-period):** Tracks the immediate price action.
* **Slow EMA (21-period):** Establishes the short-term trend baseline.

**Trade Conditions:**

* **Buy (Long):** Triggered when the 9 EMA crosses **above** the 21 EMA.
* **Sell (Short):** Triggered when the 9 EMA crosses **below** the 21 EMA.

> *Note: The EA only enters a new trade if no existing position is open for that symbol.*

---

## 🛡️ Risk & Money Management

This EA replaces fixed lot sizes with a dynamic **Percentage-Based Risk** model to ensure account longevity.

### Volume Calculation

The lot size is calculated automatically before every trade using the formula:



This ensures that whether your Stop Loss is 10 pips or 50 pips, you only ever lose your defined risk (e.g., 1% of your balance).

### Partial Take Profit (The "Safety Switch")

To maximize the win rate, the EA uses a **Two-Stage Exit**:

1. **Target 1 (TP1):** Upon reaching the first pip target, the EA closes **50% of the position** volume.
2. **Break-Even (BE):** Simultaneously, the Stop Loss is moved to the **Entry Price**. This creates a "Risk-Free" trade for the remaining 50%.
3. **Target 2 (TP2):** The remaining 50% stays open to catch a larger trend extension.

---

## ⚙️ Input Parameters Defined

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| **Fast/Slow EMA** | Integer | 9 / 21 | The periods used for the crossover signal. |
| **RiskPercent** | Double | 1.0 | Percentage of account balance to risk per trade. |
| **StopLossPips** | Integer | 150 | Initial protection (in points/pips) from entry. |
| **TP1_Pips** | Integer | 150 | Price distance to close half the trade. |
| **TP2_Pips** | Integer | 400 | Final price target for the remaining half. |
| **UseBreakEven** | Boolean | True | If true, moves SL to entry after TP1 is hit. |

---

## 🚀 Deployment Instructions

1. **Installation:** Paste the code into MetaEditor (F4), compile it (F7), and ensure there are 0 errors.
2. **Activation:** Drag the EA from the Navigator onto a chart (Recommended: **M1 or M5** timeframe).
3. **Algo Trading:** Ensure the **"Algo Trading"** button at the top of your MT5 terminal is **Green**.
4. **Pair Selection:** Best suited for high-liquidity pairs like **EURUSD, GBPUSD, or XAUUSD**.

### Expert Advice for Best Results

* **Avoid Consolidation:** Do not run this EA during "flat" market hours (e.g., late Friday or Asian session).
* **Check Spreads:** Since this is a scalping EA, use a "Raw Spread" or ECN account. High spreads will significantly degrade the performance of the 150-pip TP1.

[Setup and Optimization for EMA Crossover EAs](https://www.youtube.com/watch?v=A3l2VTLBeVM)
This video explains how to properly backtest and optimize your Take Profit and Stop Loss values in MetaTrader 5 to find the "sweet spot" for your specific broker and asset.

**Would you like me to create a "News Filter" for this EA so it automatically stops trading 30 minutes before high-impact news events like the NFP?**
