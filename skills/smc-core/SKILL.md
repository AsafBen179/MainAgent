---
name: smc-core
description: Layer 1 - Smart Money Concepts market structure analysis. Identifies BOS, CHoCH, Order Blocks, Fair Value Gaps, and determines HTF/LTF alignment for POI identification.
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

# SMC Core Skill - Layer 1: Market Structure Analysis

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           LAYER 1: SMART MONEY CONCEPTS (SMC) MARKET STRUCTURE                ║
║                                                                               ║
║  This skill identifies institutional order flow patterns:                     ║
║  - Break of Structure (BOS) / Change of Character (CHoCH)                    ║
║  - Order Blocks (OB) - Institutional supply/demand zones                     ║
║  - Fair Value Gaps (FVG) - Imbalance zones for entries                       ║
║  - Liquidity Pools - Equal highs/lows for stop hunts                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## OUTPUT FORMAT

This skill outputs a structured SMC analysis that feeds into the orchestrator:

```
SMC_LAYER1_OUTPUT:
{
  "layer": 1,
  "name": "SMC Market Structure",
  "asset": "[SYMBOL]",
  "timestamp": "[ISO]",

  "htf_analysis": {
    "timeframe": "4H",
    "trend": "BULLISH|BEARISH|RANGING",
    "last_bos": { "type": "BOS|CHoCH", "price": [X], "direction": "UP|DOWN" },
    "structure_valid": true|false
  },

  "ltf_analysis": {
    "timeframe": "1H|15m",
    "alignment": "ALIGNED|CONFLICTING",
    "last_bos": { "type": "BOS|CHoCH", "price": [X], "direction": "UP|DOWN" }
  },

  "poi_identified": {
    "type": "OB|FVG|OB+FVG",
    "zone_high": [price],
    "zone_low": [price],
    "mitigated": false,
    "strength": "STRONG|MODERATE|WEAK"
  },

  "liquidity": {
    "bsl_levels": [[price1], [price2]],  // Buy-side liquidity (equal highs)
    "ssl_levels": [[price1], [price2]],  // Sell-side liquidity (equal lows)
    "recent_sweep": { "type": "BSL|SSL", "price": [X], "swept": true|false }
  },

  "layer1_verdict": "BULLISH_BIAS|BEARISH_BIAS|NO_CLEAR_STRUCTURE",
  "confidence": 0.0-1.0,
  "notes": "[Key observation]"
}
```

---

## MARKET STRUCTURE DEFINITIONS

### Break of Structure (BOS)
```
BULLISH BOS:
  - Price breaks ABOVE a previous swing high
  - Confirms continuation of uptrend
  - Look for longs after BOS pullback

  Previous High: ────────●
                         │
  Price Action:    ──────┼──────●  ← NEW HIGH (BOS)

BEARISH BOS:
  - Price breaks BELOW a previous swing low
  - Confirms continuation of downtrend
  - Look for shorts after BOS pullback

  Price Action:    ──────┼──────
                         │
  Previous Low:   ───────●──────●  ← NEW LOW (BOS)
```

### Change of Character (CHoCH)
```
BULLISH CHoCH (Trend Reversal from Bearish to Bullish):
  - In a downtrend, price breaks ABOVE a swing high
  - First sign of potential trend reversal
  - More significant than regular BOS

BEARISH CHoCH (Trend Reversal from Bullish to Bearish):
  - In an uptrend, price breaks BELOW a swing low
  - First sign of potential trend reversal
```

### Order Blocks (OB)
```
BULLISH ORDER BLOCK:
  - Last bearish candle before a strong bullish move
  - Institutional buying zone
  - Entry: Retest of OB zone

  │  ┌───┐
  │  │ ▼ │ ← Last down candle = OB
  │  └───┘
  │      ┌───┐
  │      │ ▲ │ ← Strong up move
  │      │   │
  │      └───┘

BEARISH ORDER BLOCK:
  - Last bullish candle before a strong bearish move
  - Institutional selling zone
  - Entry: Retest of OB zone
```

### Fair Value Gaps (FVG)
```
BULLISH FVG (Imbalance to fill with buying):

  Candle 3: ───┬───
              │   │  ← GAP between C1 high and C3 low
  Candle 2: ──┼───┼──
              │   │
  Candle 1: ──┴───

  Entry: Price returns to fill the gap

BEARISH FVG (Imbalance to fill with selling):

  Candle 1: ──┬───
              │   │
  Candle 2: ──┼───┼──
              │   │  ← GAP between C1 low and C3 high
  Candle 3: ───┴───
```

---

## HTF/LTF ALIGNMENT PROTOCOL

```
MULTI-TIMEFRAME ALIGNMENT CHECK:
═══════════════════════════════════════════════════════════════

STEP 1: Determine HTF (4H) Bias
─────────────────────────────────
- Identify last significant BOS/CHoCH on 4H
- Determine trend direction: BULLISH / BEARISH / RANGING
- Mark key HTF Order Blocks and FVGs

STEP 2: Check LTF (1H/15m) Alignment
─────────────────────────────────────
- LTF trend should match HTF trend direction
- LTF BOS should confirm HTF direction
- LTF entry should be within HTF POI zone

ALIGNMENT MATRIX:
┌─────────────┬─────────────┬─────────────────────────┐
│ HTF (4H)    │ LTF (1H)    │ Action                  │
├─────────────┼─────────────┼─────────────────────────┤
│ BULLISH     │ BULLISH     │ ✅ ALIGNED - Look LONG  │
│ BULLISH     │ BEARISH     │ ⏳ WAIT - LTF pullback  │
│ BEARISH     │ BEARISH     │ ✅ ALIGNED - Look SHORT │
│ BEARISH     │ BULLISH     │ ⏳ WAIT - LTF pullback  │
│ RANGING     │ ANY         │ ⏳ WAIT - No clear bias │
└─────────────┴─────────────┴─────────────────────────┘
```

---

## POI IDENTIFICATION WORKFLOW

```
POI_IDENTIFICATION:
═══════════════════════════════════════════════════════════════

1. SCAN FOR ORDER BLOCKS
   └─ Find last bearish candle before bullish move (Bullish OB)
   └─ Find last bullish candle before bearish move (Bearish OB)
   └─ Check if OB is UNMITIGATED (price hasn't returned)

2. SCAN FOR FAIR VALUE GAPS
   └─ Look for 3-candle imbalance patterns
   └─ Mark gap zones (C1 high/low to C3 low/high)
   └─ Check if FVG is UNFILLED

3. DETERMINE POI STRENGTH
   ┌──────────────────────────────────────────────────────┐
   │ STRONG POI:                                          │
   │   - OB + FVG overlap (confluence)                    │
   │   - Near HTF structure level                         │
   │   - Multiple touches without mitigation              │
   │                                                      │
   │ MODERATE POI:                                        │
   │   - Single OB or FVG                                 │
   │   - In premium/discount zone                         │
   │                                                      │
   │ WEAK POI:                                            │
   │   - Already partially mitigated                      │
   │   - Against HTF trend                                │
   │   - In no-trade zone (middle of range)              │
   └──────────────────────────────────────────────────────┘

4. OUTPUT POI COORDINATES
   └─ Zone High: [price]
   └─ Zone Low: [price]
   └─ Type: OB / FVG / OB+FVG
   └─ Strength: STRONG / MODERATE / WEAK
```

---

## LIQUIDITY ANALYSIS

```
LIQUIDITY_MAPPING:
═══════════════════════════════════════════════════════════════

BUY-SIDE LIQUIDITY (BSL):
─────────────────────────
- Equal highs (double/triple tops)
- Swing highs with stop losses above
- Institutions target these before reversing down

  ●────●────●  ← Equal highs = BSL target
  │    │    │
  │    │    │
  Price pools stop losses here

SELL-SIDE LIQUIDITY (SSL):
──────────────────────────
- Equal lows (double/triple bottoms)
- Swing lows with stop losses below
- Institutions target these before reversing up

  │    │    │
  │    │    │
  ●────●────●  ← Equal lows = SSL target
  Price pools stop losses here

LIQUIDITY SWEEP DETECTION:
──────────────────────────
- Price takes out liquidity level
- Quick wick below/above the level
- Immediate reversal after sweep
- CONFIRMS entry validity

```

---

## VISUAL ANALYSIS ON TRADINGVIEW

```
TRADINGVIEW ANALYSIS STEPS:
═══════════════════════════════════════════════════════════════

1. Navigate to TradingView chart (already logged in via tv_auth.json)

2. Set 4H timeframe for HTF analysis
   mcp__playwright__browser_click({ selector: "[data-value='240']" })

3. Enable LuxAlgo SMC indicator (shows BOS, CHoCH, OB, FVG)
   - Indicator should already be loaded in saved layout
   - Look for: BOS labels, OB boxes, FVG zones

4. Identify on chart:
   - Last BOS/CHoCH (labeled by LuxAlgo)
   - Order Blocks (shaded rectangles)
   - Fair Value Gaps (highlighted zones)
   - Liquidity levels (equal highs/lows)

5. Switch to 1H/15m for LTF confirmation
   mcp__playwright__browser_click({ selector: "[data-value='60']" })

6. Take screenshots of both timeframes
   mcp__playwright__browser_take_screenshot()

7. Output structured SMC_LAYER1_OUTPUT
```

---

## INTEGRATION WITH ORCHESTRATOR

```
This skill is called by market-intelligence.md (Orchestrator)

CALL PATTERN:
─────────────
Orchestrator requests: "Analyze SMC structure for [ASSET]"
SMC-Core returns: SMC_LAYER1_OUTPUT JSON

CONFLUENCE CHECK:
─────────────────
SMC-Core provides:
  ✅ HTF trend direction
  ✅ LTF alignment status
  ✅ POI zone coordinates
  ✅ Liquidity sweep confirmation

If layer1_verdict is "BULLISH_BIAS" or "BEARISH_BIAS" with confidence >= 0.7:
  → Pass to Layer 2 (Indicator Logic) for validation

If layer1_verdict is "NO_CLEAR_STRUCTURE":
  → Orchestrator outputs WAIT immediately
```

---

## EXAMPLE OUTPUT

```json
{
  "layer": 1,
  "name": "SMC Market Structure",
  "asset": "SOLUSDT",
  "timestamp": "2026-01-19T10:30:00Z",

  "htf_analysis": {
    "timeframe": "4H",
    "trend": "BEARISH",
    "last_bos": { "type": "BOS", "price": 128.50, "direction": "DOWN" },
    "structure_valid": true
  },

  "ltf_analysis": {
    "timeframe": "1H",
    "alignment": "ALIGNED",
    "last_bos": { "type": "BOS", "price": 126.80, "direction": "DOWN" }
  },

  "poi_identified": {
    "type": "OB+FVG",
    "zone_high": 132.50,
    "zone_low": 130.20,
    "mitigated": false,
    "strength": "STRONG"
  },

  "liquidity": {
    "bsl_levels": [135.00, 138.50],
    "ssl_levels": [125.00, 122.00],
    "recent_sweep": { "type": "BSL", "price": 135.20, "swept": true }
  },

  "layer1_verdict": "BEARISH_BIAS",
  "confidence": 0.85,
  "notes": "Clear bearish structure with BSL sweep at 135.20. POI at 130-132 for short entry."
}
```
