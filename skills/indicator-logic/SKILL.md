---
name: indicator-logic
description: Layer 2 - Technical indicator validation. Executes Fibonacci OTE, RSI divergence, and Volume Profile analysis to validate SMC setups with confluence criteria.
version: 1.0.0
allowed-tools:
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_wait
  - mcp__playwright__browser_type
  - Read
---

# Indicator Logic Skill - Layer 2: Technical Validation

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           LAYER 2: TECHNICAL INDICATOR VALIDATION                             ║
║                                                                               ║
║  This skill validates SMC setups with technical confluence:                   ║
║  - Fibonacci OTE (Optimal Trade Entry) - 0.618-0.786 zone                    ║
║  - RSI Divergence - Momentum exhaustion detection                            ║
║  - Volume Profile - POC and HVN alignment                                    ║
║                                                                               ║
║  CONFLUENCE REQUIRED: At least 2/3 indicators must confirm                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## OUTPUT FORMAT

This skill outputs technical validation that feeds into the orchestrator:

```
INDICATOR_LAYER2_OUTPUT:
{
  "layer": 2,
  "name": "Technical Validation",
  "asset": "[SYMBOL]",
  "timestamp": "[ISO]",

  "fibonacci_ote": {
    "swing_high": [price],
    "swing_low": [price],
    "fib_0618": [price],
    "fib_0786": [price],
    "current_price": [price],
    "in_ote_zone": true|false,
    "ote_status": "IN_ZONE|ABOVE_ZONE|BELOW_ZONE"
  },

  "rsi_analysis": {
    "timeframe": "15m",
    "current_rsi": [value],
    "divergence_detected": true|false,
    "divergence_type": "BULLISH|BEARISH|NONE",
    "momentum_status": "OVERSOLD|OVERBOUGHT|NEUTRAL"
  },

  "volume_profile": {
    "poc_price": [price],
    "hvn_zones": [[low, high], ...],
    "lvn_zones": [[low, high], ...],
    "entry_near_poc": true|false,
    "entry_in_hvn": true|false
  },

  "confluence_check": {
    "fib_ote_confirmed": true|false,
    "rsi_confirmed": true|false,
    "volume_confirmed": true|false,
    "total_confirmations": 0-3,
    "minimum_required": 2
  },

  "layer2_verdict": "CONFIRMED|PARTIAL|REJECTED",
  "confidence": 0.0-1.0,
  "notes": "[Key observation]"
}
```

---

## FIBONACCI OTE (OPTIMAL TRADE ENTRY)

```
FIBONACCI RETRACEMENT LEVELS:
═══════════════════════════════════════════════════════════════

Standard Levels:
  0.0%   → Swing extreme (High for shorts, Low for longs)
  0.236  → Shallow retracement
  0.382  → Standard retracement
  0.5    → Mid-point
  0.618  → Golden ratio (OTE START) ← ENTRY ZONE START
  0.705  → Mid-OTE
  0.786  → Deep retracement (OTE END) ← ENTRY ZONE END
  1.0    → Full retracement

╔═══════════════════════════════════════════════════════════════╗
║                    OTE ZONE: 0.618 - 0.786                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  This is the OPTIMAL zone for entries because:                ║
║  - Institutions accumulate positions here                     ║
║  - Best risk:reward ratio                                     ║
║  - Aligns with SMC order blocks typically                     ║
║                                                               ║
║  Entry ABOVE 0.618 → Too shallow, poor R:R                    ║
║  Entry BELOW 0.786 → Risk of full retracement                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

BULLISH OTE CALCULATION:
────────────────────────
Swing Low (recent): $100
Swing High (recent): $120
Range: $20

OTE Zone:
  0.618 level: $120 - ($20 × 0.618) = $107.64  ← OTE TOP
  0.786 level: $120 - ($20 × 0.786) = $104.28  ← OTE BOTTOM

Entry Zone: $104.28 - $107.64

BEARISH OTE CALCULATION:
────────────────────────
Swing High (recent): $150
Swing Low (recent): $130
Range: $20

OTE Zone:
  0.618 level: $130 + ($20 × 0.618) = $142.36  ← OTE BOTTOM
  0.786 level: $130 + ($20 × 0.786) = $145.72  ← OTE TOP

Entry Zone: $142.36 - $145.72
```

### OTE Validation Logic

```
OTE_VALIDATION:
═══════════════════════════════════════════════════════════════

INPUT: Current price, Swing High, Swing Low, Trade Direction

IF direction == LONG:
  fib_0618 = swing_high - (range × 0.618)
  fib_0786 = swing_high - (range × 0.786)

  IF current_price >= fib_0786 AND current_price <= fib_0618:
    → IN OTE ZONE ✅
  ELSE IF current_price > fib_0618:
    → ABOVE OTE (Too shallow) ⚠️
  ELSE:
    → BELOW OTE (Risk zone) ⚠️

IF direction == SHORT:
  fib_0618 = swing_low + (range × 0.618)
  fib_0786 = swing_low + (range × 0.786)

  IF current_price >= fib_0618 AND current_price <= fib_0786:
    → IN OTE ZONE ✅
  ELSE IF current_price < fib_0618:
    → BELOW OTE (Too shallow) ⚠️
  ELSE:
    → ABOVE OTE (Risk zone) ⚠️
```

---

## RSI DIVERGENCE ANALYSIS

```
RSI DIVERGENCE TYPES:
═══════════════════════════════════════════════════════════════

BULLISH DIVERGENCE (Reversal from bearish to bullish):
──────────────────────────────────────────────────────
Price:  ↘ Lower Low
RSI:    ↗ Higher Low
Signal: Momentum exhaustion, potential reversal UP

  Price:   ●
            \
             ●  ← Lower low
  RSI:      ●
           /
          ●  ← Higher low (divergence!)

BEARISH DIVERGENCE (Reversal from bullish to bearish):
──────────────────────────────────────────────────────
Price:  ↗ Higher High
RSI:    ↘ Lower High
Signal: Momentum exhaustion, potential reversal DOWN

  Price:      ●  ← Higher high
             /
            ●
  RSI:     ●  ← Lower high (divergence!)
            \
             ●

HIDDEN BULLISH DIVERGENCE (Continuation in uptrend):
────────────────────────────────────────────────────
Price:  ↗ Higher Low
RSI:    ↘ Lower Low
Signal: Pullback in uptrend, continuation UP

HIDDEN BEARISH DIVERGENCE (Continuation in downtrend):
──────────────────────────────────────────────────────
Price:  ↘ Lower High
RSI:    ↗ Higher High
Signal: Pullback in downtrend, continuation DOWN
```

### RSI Validation Logic

```
RSI_VALIDATION:
═══════════════════════════════════════════════════════════════

TIMEFRAME: 15m (for entry timing precision)

OVERSOLD ZONE: RSI < 30
  → Bullish bias (potential bounce)
  → Look for bullish divergence
  → Confirms long entries

OVERBOUGHT ZONE: RSI > 70
  → Bearish bias (potential drop)
  → Look for bearish divergence
  → Confirms short entries

NEUTRAL ZONE: 30 < RSI < 70
  → No extreme reading
  → Divergence still valid if detected
  → Less weight in confluence

CONFLUENCE CRITERIA:
────────────────────
For LONG entry:
  ✅ RSI < 40 OR bullish divergence detected

For SHORT entry:
  ✅ RSI > 60 OR bearish divergence detected
```

---

## VOLUME PROFILE ANALYSIS

```
VOLUME PROFILE COMPONENTS:
═══════════════════════════════════════════════════════════════

POC (Point of Control):
───────────────────────
- Price level with HIGHEST traded volume
- Acts as a magnet for price
- Strong support/resistance level
- Entry near POC = high probability

  Volume Profile:
  ████████████████████████████  ← POC (highest volume)
  █████████████████
  ████████████████████
  ███████████
  ████████

HVN (High Volume Node):
───────────────────────
- Areas of high volume accumulation
- Strong support/resistance zones
- Price tends to consolidate here
- Good for entries (institutional interest)

LVN (Low Volume Node):
──────────────────────
- Areas of low volume (thin liquidity)
- Price moves QUICKLY through these
- Bad for entries (can slice through)
- Good for targets

VALUE AREA:
───────────
- Range containing 70% of volume
- Value Area High (VAH): Top of range
- Value Area Low (VAL): Bottom of range
- Trading within VA = range-bound
```

### Volume Profile Validation Logic

```
VOLUME_VALIDATION:
═══════════════════════════════════════════════════════════════

ENTRY CONFLUENCE CRITERIA:

1. POC ALIGNMENT:
   - Entry within 1% of POC → STRONG ✅
   - Entry within 2% of POC → MODERATE ✅
   - Entry > 2% from POC → WEAK ⚠️

2. HVN ALIGNMENT:
   - Entry inside HVN zone → STRONG ✅
   - Entry near HVN edge → MODERATE ✅
   - Entry in LVN → WEAK ⚠️ (avoid)

3. VALUE AREA POSITION:
   - Long entry at/below VAL → Discount ✅
   - Short entry at/above VAH → Premium ✅
   - Entry in middle of VA → Neutral ⚠️

CONFLUENCE CHECK:
─────────────────
volume_confirmed = entry_near_poc OR entry_in_hvn
```

---

## CONFLUENCE SCORING SYSTEM

```
TRIPLE-LAYER CONFLUENCE CHECK:
═══════════════════════════════════════════════════════════════

LAYER 2 VALIDATION PILLARS:
┌─────────────────────┬─────────────────────────────────────────┐
│ Pillar              │ Confirmation Criteria                   │
├─────────────────────┼─────────────────────────────────────────┤
│ 1. Fibonacci OTE    │ Entry in 0.618-0.786 zone              │
│ 2. RSI Divergence   │ Divergence detected OR extreme reading │
│ 3. Volume Profile   │ Entry near POC OR in HVN               │
└─────────────────────┴─────────────────────────────────────────┘

SCORING:
─────────
3/3 confirmations → STRONG CONFLUENCE ✅ (Proceed to Layer 3)
2/3 confirmations → MODERATE CONFLUENCE ✅ (Proceed with caution)
1/3 confirmations → WEAK CONFLUENCE ⚠️ (Consider WAIT)
0/3 confirmations → NO CONFLUENCE ❌ (WAIT)

MINIMUM REQUIRED: 2/3 for signal generation
```

---

## VISUAL ANALYSIS ON TRADINGVIEW

```
TRADINGVIEW INDICATOR ANALYSIS:
═══════════════════════════════════════════════════════════════

1. FIBONACCI TOOL (Manual or Auto):
   - Draw from swing low to swing high (bullish)
   - Draw from swing high to swing low (bearish)
   - Mark 0.618 and 0.786 levels
   - Check if current price is in OTE zone

2. RSI INDICATOR (15m timeframe):
   - Switch to 15m: mcp__playwright__browser_click({ selector: "[data-value='15']" })
   - Look at RSI panel below chart
   - Check for divergence with price
   - Note RSI value and zone

3. VOLUME PROFILE (if available):
   - Look for POC line (red/blue horizontal)
   - Identify HVN zones (thick histogram)
   - Note entry alignment with POC/HVN

4. CAPTURE EVIDENCE:
   mcp__playwright__browser_take_screenshot()
   → Include Fib levels, RSI, and Volume Profile visible
```

---

## INTEGRATION WITH ORCHESTRATOR

```
This skill is called by market-intelligence.md (Orchestrator)
AFTER Layer 1 (SMC Core) provides a directional bias.

CALL PATTERN:
─────────────
Orchestrator provides: SMC_LAYER1_OUTPUT (with POI and bias)
Indicator-Logic validates: Technical confluence for the setup
Returns: INDICATOR_LAYER2_OUTPUT

DECISION FLOW:
──────────────
IF layer2_verdict == "CONFIRMED" (2+ confirmations):
  → Pass to Layer 3 (Risk Management) for calculations

IF layer2_verdict == "PARTIAL" (1 confirmation):
  → Orchestrator may still proceed with lower confidence

IF layer2_verdict == "REJECTED" (0 confirmations):
  → Orchestrator outputs WAIT
```

---

## EXAMPLE OUTPUT

```json
{
  "layer": 2,
  "name": "Technical Validation",
  "asset": "SOLUSDT",
  "timestamp": "2026-01-19T10:35:00Z",

  "fibonacci_ote": {
    "swing_high": 135.00,
    "swing_low": 125.00,
    "fib_0618": 128.82,
    "fib_0786": 127.14,
    "current_price": 128.20,
    "in_ote_zone": true,
    "ote_status": "IN_ZONE"
  },

  "rsi_analysis": {
    "timeframe": "15m",
    "current_rsi": 35,
    "divergence_detected": true,
    "divergence_type": "BULLISH",
    "momentum_status": "NEUTRAL"
  },

  "volume_profile": {
    "poc_price": 128.50,
    "hvn_zones": [[127.00, 129.50], [132.00, 134.00]],
    "lvn_zones": [[129.50, 132.00]],
    "entry_near_poc": true,
    "entry_in_hvn": true
  },

  "confluence_check": {
    "fib_ote_confirmed": true,
    "rsi_confirmed": true,
    "volume_confirmed": true,
    "total_confirmations": 3,
    "minimum_required": 2
  },

  "layer2_verdict": "CONFIRMED",
  "confidence": 0.90,
  "notes": "Strong confluence: Entry in OTE zone (0.618-0.786), bullish RSI divergence on 15m, price at POC level."
}
```
