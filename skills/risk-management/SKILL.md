---
name: risk-management
description: Layer 3 - Execution math and position sizing. Calculates leverage, stop loss, take profit targets, and validates R:R ratio for final signal generation.
version: 1.0.0
allowed-tools:
  - Read
---

# Risk Management Skill - Layer 3: Execution Math

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           LAYER 3: RISK MANAGEMENT & EXECUTION MATH                           ║
║                                                                               ║
║  This skill calculates precise execution parameters:                          ║
║  - Leverage calculation (Risk% / SL_Distance%)                               ║
║  - Position sizing for $1,000 portfolio                                       ║
║  - Stop Loss placement (below/above POI)                                      ║
║  - Take Profit targets (1:2, 1:3, 1:5 R:R)                                   ║
║                                                                               ║
║  MINIMUM R:R REQUIRED: 1:2 for signal generation                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## OUTPUT FORMAT

This skill outputs execution parameters that complete the signal:

```
RISK_LAYER3_OUTPUT:
{
  "layer": 3,
  "name": "Risk Management",
  "asset": "[SYMBOL]",
  "timestamp": "[ISO]",

  "entry_calculation": {
    "entry_price": [price],
    "entry_zone_high": [price],
    "entry_zone_low": [price],
    "entry_type": "LIMIT|MARKET"
  },

  "stop_loss": {
    "sl_price": [price],
    "sl_distance_percent": [X.XX],
    "sl_distance_dollars": [X.XX],
    "sl_placement": "BELOW_POI|ABOVE_POI|BELOW_SWING|ABOVE_SWING"
  },

  "take_profit": {
    "tp1_price": [price],
    "tp1_rr": "1:2",
    "tp1_percent": [X.XX],
    "tp2_price": [price],
    "tp2_rr": "1:3",
    "tp2_percent": [X.XX],
    "tp3_price": [price],
    "tp3_rr": "1:5",
    "tp3_percent": [X.XX]
  },

  "leverage_calculation": {
    "max_risk_percent": 2.0,
    "sl_distance_percent": [X.XX],
    "calculated_leverage": [X],
    "capped_leverage": [X],
    "leverage_cap": 20
  },

  "position_sizing": {
    "portfolio_value": 1000,
    "risk_amount": [X.XX],
    "position_size_usd": [X.XX],
    "position_size_units": [X.XXXX]
  },

  "risk_validation": {
    "minimum_rr_met": true|false,
    "minimum_rr_required": "1:2",
    "actual_rr": "1:X.X",
    "risk_per_trade_valid": true|false
  },

  "layer3_verdict": "EXECUTABLE|ADJUST_REQUIRED|REJECTED",
  "confidence": 0.0-1.0,
  "notes": "[Risk assessment summary]"
}
```

---

## LEVERAGE CALCULATION

```
LEVERAGE FORMULA:
═══════════════════════════════════════════════════════════════

             Max Risk %
Leverage = ─────────────────
           SL Distance %

CONSTRAINTS:
  - Max Risk: 1-2% of portfolio per trade
  - Leverage Cap: 20x maximum
  - If calculated > 20x → Use 20x

EXAMPLE CALCULATIONS:
─────────────────────
Example 1: Tight Stop Loss
  Max Risk: 2%
  SL Distance: 1%
  Leverage = 2% / 1% = 2x ✅

Example 2: Normal Stop Loss
  Max Risk: 2%
  SL Distance: 3%
  Leverage = 2% / 3% = 0.67x → Round to 1x (minimum)

Example 3: Wide Stop Loss
  Max Risk: 2%
  SL Distance: 0.5%
  Leverage = 2% / 0.5% = 4x ✅

Example 4: Very Tight Stop Loss
  Max Risk: 2%
  SL Distance: 0.08%
  Leverage = 2% / 0.08% = 25x → CAP AT 20x ⚠️

╔═══════════════════════════════════════════════════════════════╗
║                   LEVERAGE DECISION MATRIX                    ║
╠═══════════════════════════════════════════════════════════════╣
║  SL Distance    │  Calculated   │  Final Leverage             ║
║─────────────────┼───────────────┼─────────────────────────────║
║  > 2%           │  < 1x         │  1x (spot equivalent)       ║
║  1% - 2%        │  1x - 2x      │  Use calculated             ║
║  0.5% - 1%      │  2x - 4x      │  Use calculated             ║
║  0.2% - 0.5%    │  4x - 10x     │  Use calculated             ║
║  0.1% - 0.2%    │  10x - 20x    │  Use calculated             ║
║  < 0.1%         │  > 20x        │  CAP AT 20x                 ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## POSITION SIZING

```
POSITION SIZE FORMULA:
═══════════════════════════════════════════════════════════════

Position Size = Portfolio × Risk % × Leverage

For $1,000 Portfolio with 2% Risk:
───────────────────────────────────
Base Risk Amount = $1,000 × 2% = $20

With Leverage:
  1x  → Position = $20 × 1  = $20
  5x  → Position = $20 × 5  = $100
  10x → Position = $20 × 10 = $200
  20x → Position = $20 × 20 = $400

UNIT CALCULATION:
─────────────────
Position Units = Position Size USD / Entry Price

Example:
  Position Size: $200
  Entry Price: $128.50
  Units = $200 / $128.50 = 1.5564 SOL

╔═══════════════════════════════════════════════════════════════╗
║                 POSITION SIZE QUICK REFERENCE                 ║
║                   ($1,000 Portfolio, 2% Risk)                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Leverage  │  Position Size  │  Max Loss (2%)                ║
║────────────┼─────────────────┼────────────────────────────────║
║  1x        │  $20            │  $20                          ║
║  3x        │  $60            │  $20                          ║
║  5x        │  $100           │  $20                          ║
║  10x       │  $200           │  $20                          ║
║  15x       │  $300           │  $20                          ║
║  20x       │  $400           │  $20                          ║
╚═══════════════════════════════════════════════════════════════╝

NOTE: Position size increases with leverage, but MAX LOSS stays
constant at 2% ($20) regardless of leverage used.
```

---

## STOP LOSS PLACEMENT

```
STOP LOSS RULES:
═══════════════════════════════════════════════════════════════

FOR LONG POSITIONS:
────────────────────
SL Placement Options (in order of preference):
1. Below POI zone low (Order Block / FVG bottom)
2. Below recent swing low
3. Below liquidity sweep level

  Entry Zone ──────────────
       │
       ▼
  ┌─────────────┐
  │    POI      │ ← Entry here
  └─────────────┘
       │
       ▼  ← SL below POI (with buffer)

Buffer: Add 0.2-0.5% below the level for safety

FOR SHORT POSITIONS:
─────────────────────
SL Placement Options (in order of preference):
1. Above POI zone high (Order Block / FVG top)
2. Above recent swing high
3. Above liquidity sweep level

       ▲  ← SL above POI (with buffer)
       │
  ┌─────────────┐
  │    POI      │ ← Entry here
  └─────────────┘
       │
       ▼
  Entry Zone ──────────────

Buffer: Add 0.2-0.5% above the level for safety

SL DISTANCE CALCULATION:
────────────────────────
SL Distance % = |Entry Price - SL Price| / Entry Price × 100

Example (Long):
  Entry: $128.50
  SL: $125.00
  Distance = |128.50 - 125.00| / 128.50 × 100 = 2.72%
```

---

## TAKE PROFIT TARGETS

```
RISK:REWARD RATIO TARGETS:
═══════════════════════════════════════════════════════════════

MINIMUM R:R REQUIRED: 1:2 (2x your risk)

TP CALCULATION FORMULA:
───────────────────────
For LONG:
  TP = Entry + (Risk Distance × R:R Multiplier)

For SHORT:
  TP = Entry - (Risk Distance × R:R Multiplier)

STANDARD TP LEVELS:
───────────────────
TP1: 1:2 R:R → Close 50% of position
TP2: 1:3 R:R → Close 30% of position
TP3: 1:5 R:R → Close 20% of position (runner)

EXAMPLE CALCULATION (LONG):
───────────────────────────
Entry: $128.50
SL: $125.00
Risk Distance: $3.50 (2.72%)

TP1 (1:2): $128.50 + ($3.50 × 2) = $135.50 (+5.45%)
TP2 (1:3): $128.50 + ($3.50 × 3) = $139.00 (+8.17%)
TP3 (1:5): $128.50 + ($3.50 × 5) = $146.00 (+13.62%)

╔═══════════════════════════════════════════════════════════════╗
║                    TP DISTRIBUTION STRATEGY                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Target  │  R:R   │  Position %  │  Purpose                   ║
║──────────┼────────┼──────────────┼────────────────────────────║
║  TP1     │  1:2   │  50%         │  Secure profit, move SL    ║
║  TP2     │  1:3   │  30%         │  Additional profit         ║
║  TP3     │  1:5   │  20%         │  Runner for big moves      ║
╚═══════════════════════════════════════════════════════════════╝

AFTER TP1 HIT:
─────────────
Move Stop Loss to Break Even (Entry Price)
→ Risk-free trade from this point
```

---

## RISK VALIDATION CHECKLIST

```
PRE-SIGNAL VALIDATION:
═══════════════════════════════════════════════════════════════

MANDATORY CHECKS (ALL must pass):
┌─────────────────────────────────────────────────────────────┐
│ ☐ R:R Ratio ≥ 1:2                                          │
│ ☐ SL Distance ≤ 5% (avoid excessive risk)                  │
│ ☐ Leverage ≤ 20x (hard cap)                                │
│ ☐ Position Size ≤ 40% of portfolio ($400 max)              │
│ ☐ Risk Amount ≤ 2% of portfolio ($20 max)                  │
└─────────────────────────────────────────────────────────────┘

VALIDATION MATRIX:
┌─────────────────┬─────────────┬──────────────────────────────┐
│ Check           │ Status      │ Action                       │
├─────────────────┼─────────────┼──────────────────────────────┤
│ R:R < 1:2       │ ❌ FAIL     │ WAIT - Poor risk/reward      │
│ SL Distance > 5%│ ⚠️ WARNING  │ Reduce position or WAIT      │
│ Leverage > 20x  │ ⚠️ CAP      │ Auto-cap at 20x              │
│ All checks pass │ ✅ PASS     │ Proceed to SIGNAL            │
└─────────────────┴─────────────┴──────────────────────────────┘

LAYER 3 VERDICT LOGIC:
──────────────────────
IF all mandatory checks pass:
  → layer3_verdict = "EXECUTABLE"

IF adjustable issues (SL too tight, can be widened):
  → layer3_verdict = "ADJUST_REQUIRED"

IF fundamental R:R issue (target not achievable):
  → layer3_verdict = "REJECTED"
```

---

## COMPLETE CALCULATION WORKFLOW

```
LAYER 3 EXECUTION FLOW:
═══════════════════════════════════════════════════════════════

INPUT FROM LAYER 1 & 2:
  - POI zone (high/low) from SMC-Core
  - Current price from Indicator-Logic
  - Trade direction (LONG/SHORT)

STEP 1: DETERMINE ENTRY
────────────────────────
Entry = Middle of POI zone OR current price if already in zone
Entry Type = LIMIT (if price not in zone) or MARKET (if in zone)

STEP 2: CALCULATE STOP LOSS
────────────────────────────
For LONG: SL = POI_Low - (POI_Low × 0.003)  // 0.3% buffer
For SHORT: SL = POI_High + (POI_High × 0.003)

STEP 3: CALCULATE SL DISTANCE
──────────────────────────────
SL_Distance_% = |Entry - SL| / Entry × 100

STEP 4: CALCULATE LEVERAGE
───────────────────────────
Leverage = 2% / SL_Distance_%
IF Leverage > 20: Leverage = 20

STEP 5: CALCULATE POSITION SIZE
────────────────────────────────
Position_USD = $1000 × 2% × Leverage
Position_Units = Position_USD / Entry

STEP 6: CALCULATE TAKE PROFITS
───────────────────────────────
Risk_Distance = |Entry - SL|
TP1 = Entry ± (Risk_Distance × 2)
TP2 = Entry ± (Risk_Distance × 3)
TP3 = Entry ± (Risk_Distance × 5)

STEP 7: VALIDATE R:R
─────────────────────
Actual_RR = |TP1 - Entry| / |Entry - SL|
IF Actual_RR < 2: REJECTED

STEP 8: OUTPUT RISK_LAYER3_OUTPUT
```

---

## INTEGRATION WITH ORCHESTRATOR

```
This skill is called by market-intelligence.md (Orchestrator)
AFTER Layer 2 (Indicator Logic) confirms technical confluence.

CALL PATTERN:
─────────────
Orchestrator provides:
  - SMC_LAYER1_OUTPUT (POI zone, direction)
  - INDICATOR_LAYER2_OUTPUT (validation status)

Risk-Management calculates:
  - Entry, SL, TP levels
  - Leverage and position size
  - R:R validation

Returns: RISK_LAYER3_OUTPUT

DECISION FLOW:
──────────────
IF layer3_verdict == "EXECUTABLE":
  → Orchestrator generates SIGNAL

IF layer3_verdict == "ADJUST_REQUIRED":
  → Orchestrator notes adjustment needed

IF layer3_verdict == "REJECTED":
  → Orchestrator outputs WAIT with reason
```

---

## EXAMPLE OUTPUT

```json
{
  "layer": 3,
  "name": "Risk Management",
  "asset": "SOLUSDT",
  "timestamp": "2026-01-19T10:40:00Z",

  "entry_calculation": {
    "entry_price": 128.50,
    "entry_zone_high": 129.50,
    "entry_zone_low": 127.50,
    "entry_type": "LIMIT"
  },

  "stop_loss": {
    "sl_price": 125.00,
    "sl_distance_percent": 2.72,
    "sl_distance_dollars": 3.50,
    "sl_placement": "BELOW_POI"
  },

  "take_profit": {
    "tp1_price": 135.50,
    "tp1_rr": "1:2",
    "tp1_percent": 5.45,
    "tp2_price": 139.00,
    "tp2_rr": "1:3",
    "tp2_percent": 8.17,
    "tp3_price": 146.00,
    "tp3_rr": "1:5",
    "tp3_percent": 13.62
  },

  "leverage_calculation": {
    "max_risk_percent": 2.0,
    "sl_distance_percent": 2.72,
    "calculated_leverage": 0.74,
    "capped_leverage": 1,
    "leverage_cap": 20
  },

  "position_sizing": {
    "portfolio_value": 1000,
    "risk_amount": 20.00,
    "position_size_usd": 20.00,
    "position_size_units": 0.1556
  },

  "risk_validation": {
    "minimum_rr_met": true,
    "minimum_rr_required": "1:2",
    "actual_rr": "1:2",
    "risk_per_trade_valid": true
  },

  "layer3_verdict": "EXECUTABLE",
  "confidence": 0.85,
  "notes": "Trade parameters valid. 1x leverage due to wider SL. R:R 1:2 minimum met."
}
```
