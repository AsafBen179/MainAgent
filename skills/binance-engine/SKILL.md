---
name: binance-engine
description: UNIFIED BINANCE ENGINE - Central hub for market data, discovery, execution, and monitoring. Self-driven via direct Binance API. Includes intelligent memory-aware filtering, signal gatekeeper (duplicate/active trade prevention), trade lifecycle tracking, 75% confidence threshold, and 4-hour mute/cooldown system. Use for "scan market", "find opportunities", "execute trade", "check portfolio", "binance scan", "smart scan", "signals", "monitor".
version: 3.1.0
allowed-tools:
  - Bash
  - Read
  - Write
triggers:
  - market-intelligence
dependencies:
  - scripts/binance-client.js
storage:
  - data/analysis_history.json
  - data/observation_list.json
  - data/signals_history.json
---

# Binance Engine Skill - UNIFIED MARKET HUB

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           BINANCE ENGINE - UNIFIED MARKET HUB v3.1                            ║
║           Self-Driven Discovery, Analysis & Execution                         ║
║           + Memory-Aware Filtering + Signal Gatekeeper                        ║
║           + 75% Confidence Threshold + 4-Hour Mute/Cooldown                   ║
║                                                                               ║
║  This skill replaces all TradingView webhook dependencies.                    ║
║  Direct Binance API integration for real-time market intelligence.            ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  COMPONENT 1: MARKET SCANNER (Scout)                                    │  ║
║  │  → Polls Binance API every 10 minutes                                   │  ║
║  │  → Volume, Price Change, RVOL filtering                                 │  ║
║  │  → Identifies high-potential USDT pairs                                 │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  COMPONENT 2: SMART FILTER (Memory Check + Mute)    ★ UPDATED v3.1 ★   │  ║
║  │  → Rule 0: Check mute_until (4h cooldown after WAIT)                   │  ║
║  │  → Checks analysis_history.json for previous analysis                  │  ║
║  │  → Applies delta rules (time, price change)                            │  ║
║  │  → Prevents redundant 6-pillar analysis                                │  ║
║  │  → Skipped assets added to observation_list.json                       │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  COMPONENT 3: SIGNAL GATEKEEPER (Trade Lifecycle)       ★ NEW v3.0 ★   │  ║
║  │  → Checks signals_history.json for active trades                       │  ║
║  │  → Daily Direction Check: No duplicate signal same day                 │  ║
║  │  → Active Trade Check: Block if trade still open (SL/TP not hit)       │  ║
║  │  → Auto-updates trade status when SL/TP detected                       │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  COMPONENT 4: 6-PILLAR TRIGGER (Deep Analysis)      ★ UPDATED v3.1 ★   │  ║
║  │  → Only triggered for assets passing ALL filters                       │  ║
║  │  → Triggers market-intelligence orchestrator                            │  ║
║  │  → Full confluence analysis for each candidate                          │  ║
║  │  → 75% confidence threshold (12+ points of 15)                         │  ║
║  │  → WAIT or <75% → Mute asset 4 hours, NO WhatsApp                      │  ║
║  │  → SIGNAL ≥75% → Send WhatsApp with confidence %                       │  ║
║  │  → Records new signal to signals_history.json                          │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  COMPONENT 5: EXECUTION ENGINE (Scaffolded)                             │  ║
║  │  → Market/Limit order interface                                         │  ║
║  │  → Automatic SL/TP placement                                            │  ║
║  │  → Position tracking                                                    │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  COMPONENT 6: SIGNAL MONITOR (Background Task)          ★ NEW v3.0 ★   │  ║
║  │  → Runs every 5 minutes (configurable)                                  │  ║
║  │  → Checks all active signals against current prices                    │  ║
║  │  → Auto-updates status: Active → Hit_SL / Hit_TP1/2/3                  │  ║
║  │  → Tracks win rate and performance statistics                          │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  COMPONENT 7: MONITORING & LOGGING                                      │  ║
║  │  → KnowledgeBase trade logging                                          │  ║
║  │  → Real-time WhatsApp updates                                           │  ║
║  │  → Performance tracking                                                 │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## DEPRECATION NOTICE

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  ⚠️  DEPRECATED: TradingView Webhook System                                   ║
║                                                                               ║
║  The following are NO LONGER USED:                                            ║
║  ❌ TradingView Screener alerts                                               ║
║  ❌ External HTTP webhooks (/webhook/tv-alert)                                ║
║  ❌ CEX Screener automation                                                   ║
║  ❌ Crypto Screener automation                                                ║
║                                                                               ║
║  REPLACED BY:                                                                 ║
║  ✅ Direct Binance API polling (binance-client.js)                            ║
║  ✅ Self-driven 10-minute scan cycle                                          ║
║  ✅ Internal event-based triggers                                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## COMPONENT 1: MARKET SCANNER (Discovery Engine)

### Scanner Configuration

```
SCANNER_CONFIG:
═══════════════════════════════════════════════════════════════

TIMING:
  scan_interval: 10 minutes
  data_source: Binance REST API
  pairs: All USDT spot pairs

VOLUME FILTER:
  min_volume_24h: $20,000,000 USD
  description: "Ensures sufficient liquidity"

PRICE CHANGE FILTER:
  min_change_24h: 3%     (absolute value)
  min_change_4h: 1.5%    (momentum confirmation)
  description: "Identifies trending assets"

RELATIVE VOLUME (RVOL) FILTER:
  formula: RVOL = Volume_current_hour / Average_hourly_volume_24h
  threshold: RVOL > 1.5
  description: "Detects unusual activity spikes"

BLACKLIST:
  - Stablecoins: USDC, BUSD, TUSD, DAI, FDUSD
  - Wrapped tokens: WBTC, WBETH
  - Fiat pairs: EUR, GBP

═══════════════════════════════════════════════════════════════
```

### RVOL Calculation

```
RVOL_CALCULATION:
═══════════════════════════════════════════════════════════════

FORMULA:
                    Volume (Current Hour)
  RVOL = ─────────────────────────────────────────────
         Average Hourly Volume (Last 24 Hours)

INTERPRETATION:
  RVOL < 0.5   → DEAD (Below average activity)
  RVOL 0.5-1.0 → LOW (Normal/quiet)
  RVOL 1.0-1.5 → NORMAL (Average activity)
  RVOL 1.5-2.5 → ELEVATED (Above average - WATCH)
  RVOL 2.5-5.0 → HIGH (Significant activity - ALERT)
  RVOL > 5.0   → EXTREME (Unusual spike - INVESTIGATE)

EXAMPLE:
  24H Volume: $50,000,000
  Average Hourly: $50M / 24 = $2,083,333
  Current Hour Volume: $4,500,000
  RVOL = $4.5M / $2.08M = 2.16 (ELEVATED - qualifies)

═══════════════════════════════════════════════════════════════
```

### Scanner Workflow

```
SCANNER_WORKFLOW:
═══════════════════════════════════════════════════════════════

STEP 1: Fetch Market Data
─────────────────────────
Command: node scripts/binance-client.js scan
Action: Fetch 24h ticker data for all USDT pairs
Output: Raw ticker array

STEP 2: Apply Volume Filter
───────────────────────────
Filter: volume_24h_usd >= $20,000,000
Action: Remove low-liquidity pairs
Output: Volume-qualified pairs

STEP 3: Apply Price Change Filter
─────────────────────────────────
Filter: |change_24h| >= 3% AND |change_4h| >= 1.5%
Action: Identify trending assets
Output: Momentum-qualified pairs

STEP 4: Calculate RVOL
──────────────────────
Action: For each candidate, fetch hourly klines
Calculate: RVOL = current_hour_vol / avg_hourly_vol
Filter: RVOL >= 1.5
Output: RVOL-qualified pairs

STEP 5: Rank Candidates
───────────────────────
Sort by: RVOL (descending)
Limit: Top 20 candidates
Output: Scout candidate list

STEP 6: Apply Smart Filter (Memory Check)
─────────────────────────────────────────
For each candidate:
  → Check analysis_history.json
  → Apply delta rules (time, price)
  → Mark for ANALYZE or SKIP
Output: Filtered analysis list + observation list

STEP 7: Trigger 6-Pillar Analysis (If Needed)
─────────────────────────────────────────────
For each asset in toAnalyze[]:
  → Invoke market-intelligence orchestrator
  → Run full 6-pillar confluence check
  → Generate SIGNAL or WAIT
  → Update analysis_history.json

RECOMMENDED COMMAND: node scripts/binance-client.js smart-scan

═══════════════════════════════════════════════════════════════
```

### Scanner Output Format

```json
{
  "scan_id": "[UUID]",
  "timestamp": "[ISO]",
  "scan_type": "scheduled",
  "filters_applied": {
    "min_volume_24h": 20000000,
    "min_change_24h_pct": 3,
    "min_change_4h_pct": 1.5,
    "min_rvol": 1.5
  },
  "results": {
    "total_pairs_scanned": 443,
    "volume_qualified": 85,
    "momentum_qualified": 23,
    "rvol_qualified": 8,
    "top_candidates": [
      {
        "symbol": "SOLUSDT",
        "price": 198.50,
        "volume_24h_usd": 450000000,
        "change_24h_pct": 5.2,
        "change_4h_pct": 2.1,
        "rvol": 2.8,
        "rank": 1,
        "status": "PENDING_ANALYSIS"
      }
    ]
  }
}
```

---

## COMPONENT 2: SMART FILTER (Memory-Aware Analysis)

### Smart Filter Overview

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           SMART FILTER - PREVENTING REDUNDANT ANALYSIS                        ║
║           Memory-Aware Delta Checking + Mute/Cooldown System                  ║
║                                                                               ║
║  PURPOSE: Prevent re-analyzing assets with no significant market changes.     ║
║           Also enforces 4-hour cooldown after WAIT results.                   ║
║  STORAGE: data/analysis_history.json, data/observation_list.json              ║
║                                                                               ║
║  ★ NEW v3.1 ★  MUTE SYSTEM: Assets with WAIT or <75% confidence are          ║
║                muted for 4 hours to prevent analysis spam.                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Analysis History Storage Format

```json
{
  "assets": {
    "BTCUSDT": {
      "symbol": "BTCUSDT",
      "last_analysis_time": "2026-01-21T18:30:00.000Z",
      "last_price": 105250.00,
      "last_rvol": 1.85,
      "analysis_count": 5,
      "last_result": {
        "signal": "WAIT",
        "confidence": "NORMAL",
        "confluence_score": 6,
        "confidence_percent": 40
      },
      "mute_until": "2026-01-21T22:30:00.000Z",
      "mute_reason": "WAIT_RESULT"
    }
  },
  "lastUpdated": "2026-01-21T18:30:00.000Z"
}
```

### Mute/Cooldown Fields

```
MUTE_FIELDS:
═══════════════════════════════════════════════════════════════

mute_until:
  Type: ISO timestamp or null
  Purpose: Asset cannot be analyzed until this time passes
  Duration: 4 hours from mute trigger

mute_reason:
  Type: String enum
  Values:
    - "WAIT_RESULT" → Analysis returned WAIT decision
    - "LOW_CONFIDENCE" → Confidence < 75% threshold
    - "MANUAL" → Manually muted via CLI

═══════════════════════════════════════════════════════════════
```

### Smart Filter Rules

```
SMART_FILTER_RULES:
═══════════════════════════════════════════════════════════════

★ RULE 0: MUTE CHECK (FIRST PRIORITY)                    ★ NEW ★
─────────────────────────────────────
Condition: mute_until > current_time
Action:    → BLOCK (no analysis at all)
Reason:    Asset is in cooldown period after WAIT/low confidence
Log:       "Asset [Symbol] MUTED for [X]h [Y]m more"
Note:      This check runs BEFORE any other rule

MUTE TRIGGERS:
  - Analysis result = WAIT → Mute 4 hours
  - Confidence < 75% → Mute 4 hours (even if SIGNAL)
  - Manual mute via CLI → Mute 4 hours

RULE 1: NEW ASSET
─────────────────
Condition: Asset NOT in analysis_history.json
Action:    → ANALYZE
Reason:    First-time discovery, needs baseline analysis

RULE 2: TIME EXPIRED
────────────────────
Condition: current_time - last_analysis_time > 4 hours
Action:    → ANALYZE
Reason:    Market conditions may have changed significantly

RULE 3: PRICE DELTA
───────────────────
Condition: |current_price - last_price| / last_price > 2%
Formula:   |(P_now - P_last) / P_last| > 0.02
Action:    → ANALYZE
Reason:    Significant price movement warrants re-analysis

RULE 4: DEFAULT
───────────────
Condition: None of above rules triggered
Action:    → SKIP
Log:       "Asset [Symbol] already analyzed recently with no significant delta"
Side-effect: Add to observation_list.json

═══════════════════════════════════════════════════════════════
```

### Smart Filter Workflow

```
SMART_FILTER_WORKFLOW:
═══════════════════════════════════════════════════════════════

INPUT: Scout candidates (from Component 1)

FOR EACH candidate:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. Load analysis_history.json                              │
│                                                             │
│  ★ STEP 0: CHECK MUTE STATUS (FIRST!)                       │
│  ─────────────────────────────────────                      │
│  IF mute_until exists AND mute_until > NOW:                 │
│     └→ BLOCK analysis (reason: MUTED)                       │
│     └→ Log: "[Symbol] MUTED for Xh Ym remaining"            │
│     └→ SKIP to next candidate                               │
│                                                             │
│  2. Check if symbol exists in history                       │
│                                                             │
│  IF NOT in history:                                         │
│     └→ Mark for ANALYSIS (reason: NEW_ASSET)                │
│                                                             │
│  ELSE:                                                      │
│     │                                                       │
│     ├─ Calculate hours since last analysis                  │
│     │  IF hours > 4:                                        │
│     │     └→ Mark for ANALYSIS (reason: TIME_EXPIRED)       │
│     │                                                       │
│     ├─ Calculate price delta percentage                     │
│     │  IF |delta| > 2%:                                     │
│     │     └→ Mark for ANALYSIS (reason: PRICE_DELTA)        │
│     │                                                       │
│     └─ DEFAULT:                                             │
│        └→ SKIP analysis                                     │
│        └→ Add to observation_list.json                      │
│        └→ Log: "No significant delta"                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

OUTPUT:
  - toAnalyze[]: Assets requiring 6-pillar analysis
  - skipped[]: Assets skipped due to no delta
  - muted[]: Assets blocked due to active mute/cooldown
  - observations[]: Assets added to observation list

═══════════════════════════════════════════════════════════════
```

### Observation List Format

```json
{
  "assets": [
    {
      "symbol": "SOLUSDT",
      "added_time": "2026-01-21T18:45:00.000Z",
      "reason": "Scout criteria met, no significant delta",
      "check_count": 3
    }
  ],
  "lastUpdated": "2026-01-21T18:45:00.000Z"
}
```

### CLI Commands

```
SMART_FILTER_CLI:
═══════════════════════════════════════════════════════════════

# Run smart scan (scout + filter in one command)
node scripts/binance-client.js smart-scan

# Check if specific asset needs re-analysis
node scripts/binance-client.js check BTCUSDT

# View analysis history summary
node scripts/binance-client.js history

# View observation list
node scripts/binance-client.js observations

# Manually update history after analysis
node scripts/binance-client.js update-history BTCUSDT 105000 1.8

═══════════════════════════════════════════════════════════════

MUTE MANAGEMENT CLI:                                     ★ NEW ★
═══════════════════════════════════════════════════════════════

# View all muted assets with remaining time
node scripts/binance-client.js muted

# Manually mute an asset for 4 hours
node scripts/binance-client.js mute BTCUSDT

# Unmute an asset (remove cooldown)
node scripts/binance-client.js unmute BTCUSDT

# Check if points meet 75% confidence threshold
node scripts/binance-client.js check-confidence 11
node scripts/binance-client.js check-confidence 12

═══════════════════════════════════════════════════════════════
```

### Post-Analysis Update

```
AFTER SUCCESSFUL 6-PILLAR ANALYSIS:
═══════════════════════════════════════════════════════════════

Call: updateAnalysisHistory(symbol, price, rvol, analysisResult)

This updates:
  - last_analysis_time: Current timestamp
  - last_price: Price at time of analysis
  - last_rvol: RVOL at time of analysis
  - analysis_count: Incremented by 1
  - last_result: Signal type, confidence, confluence score

This ensures the next scan properly filters this asset.

═══════════════════════════════════════════════════════════════
```

### Post-Analysis Mute Logic ★ NEW v3.1 ★

```
MUTE_DECISION_FLOW:
═══════════════════════════════════════════════════════════════

AFTER 6-PILLAR ANALYSIS COMPLETES:
──────────────────────────────────

1. CALCULATE CONFIDENCE PERCENTAGE
   Formula: confidence_percent = (points / 15) × 100
   Example: 11 points → 73%
   Example: 12 points → 80%

2. CHECK THRESHOLD
   Minimum Required: 75% (configurable)

3. DECISION MATRIX:

   ┌────────────────────────────────────────────────────────────┐
   │  SCENARIO                    │  ACTION                     │
   ├────────────────────────────────────────────────────────────┤
   │  Result = WAIT               │  MUTE for 4 hours           │
   │  (any confidence)            │  NO WhatsApp message        │
   │                              │  Log to KnowledgeBase only  │
   ├────────────────────────────────────────────────────────────┤
   │  Result = SIGNAL             │  MUTE for 4 hours           │
   │  Confidence < 75%            │  NO WhatsApp message        │
   │                              │  Log as LOW_CONFIDENCE      │
   ├────────────────────────────────────────────────────────────┤
   │  Result = SIGNAL             │  DO NOT MUTE                │
   │  Confidence >= 75%           │  SEND WhatsApp message      │
   │                              │  Include confidence %       │
   └────────────────────────────────────────────────────────────┘

4. IF MUTING:
   - Set mute_until = NOW + 4 hours
   - Set mute_reason = "WAIT_RESULT" or "LOW_CONFIDENCE"
   - Log: "[Symbol] muted for 4 hours (reason: [X])"

5. WHATSAPP OUTPUT (SIGNAL >= 75% only):
   Message includes: 🛡️ Confidence: [X]% (threshold: 75%)

═══════════════════════════════════════════════════════════════

WHY 75% THRESHOLD?
──────────────────
- 12 points / 15 = 80% → PASS (strong confluence)
- 11 points / 15 = 73% → FAIL (insufficient confluence)
- Prevents marginal signals from cluttering notifications
- Ensures only high-conviction setups reach WhatsApp

═══════════════════════════════════════════════════════════════
```

---

## COMPONENT 3: SIGNAL GATEKEEPER (Trade Lifecycle)

### Gatekeeper Overview

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           SIGNAL GATEKEEPER - TRADE LIFECYCLE MANAGEMENT                      ║
║           Prevents Duplicate Signals & Respects Active Trades                 ║
║                                                                               ║
║  PURPOSE: Ensure no duplicate signals are sent and active trades are          ║
║           respected until they hit SL or TP.                                  ║
║                                                                               ║
║  STORAGE: data/signals_history.json                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Signal History Structure

```json
{
  "signals": [
    {
      "id": "SIG_1706912345678_BTCUSDT",
      "symbol": "BTCUSDT",
      "direction": "LONG",
      "timestamp": "2026-01-21T18:30:00.000Z",
      "status": "Active",
      "entry_price": 105000,
      "sl_price": 103000,
      "tp1_price": 108000,
      "tp2_price": 110000,
      "tp3_price": 115000,
      "confluence_score": 12,
      "confidence": "MODERATE",
      "trigger_reason": "Smart Scan - RVOL spike",
      "last_checked": "2026-01-21T19:00:00.000Z",
      "history": [
        { "timestamp": "...", "event": "SIGNAL_CREATED", "price": 105000 },
        { "timestamp": "...", "event": "STATUS_CHANGE: Active -> Hit_TP1", "price": 108000 }
      ]
    }
  ],
  "lastUpdated": "2026-01-21T19:00:00.000Z",
  "stats": { "total": 15, "wins": 10, "losses": 3, "active": 2 }
}
```

### Signal Status Types

```
SIGNAL_STATUS:
═══════════════════════════════════════════════════════════════

Active          → Trade is open, monitoring for SL/TP
Hit_SL          → Stop loss was hit (LOSS)
Hit_TP1         → First take profit hit (50% closed)
Hit_TP2         → Second take profit hit (30% closed)
Hit_TP3         → Final take profit hit (20% closed, FULL WIN)
Expired_Daily   → Signal expired at end of UTC day (unused)
Invalidated     → Signal invalidated by market conditions
Closed_Manual   → Manually closed by user

═══════════════════════════════════════════════════════════════
```

### Gatekeeper Rules

```
GATEKEEPER_RULES:
═══════════════════════════════════════════════════════════════

RULE 1: DAILY DIRECTIONAL LIMIT
───────────────────────────────
IF a signal for [Symbol] in [Direction] was already sent TODAY (since 00:00 UTC):
  → BLOCK analysis
  → Reason: "DAILY_LIMIT: [DIR] signal for [SYM] already sent today"

EXAMPLE:
  - BTCUSDT LONG sent at 08:00 UTC
  - Same-day BTCUSDT LONG request at 14:00 UTC → BLOCKED
  - Same-day BTCUSDT SHORT request at 14:00 UTC → ALLOWED (different direction)

RULE 2: ACTIVE TRADE CHECK
──────────────────────────
IF there's an active signal for [Symbol] in [Direction]:
  1. Fetch current market price via Binance API
  2. Check if price hit SL:
     - LONG: current_price <= sl_price → HIT_SL
     - SHORT: current_price >= sl_price → HIT_SL
  3. Check if price hit TP1:
     - LONG: current_price >= tp1_price → HIT_TP1
     - SHORT: current_price <= tp1_price → HIT_TP1

  IF neither SL nor TP1 hit:
    → BLOCK analysis
    → Reason: "ACTIVE_TRADE: Position still open"

  IF SL or TP1 hit:
    → UPDATE signal status to Hit_SL or Hit_TP1
    → ALLOW new analysis (previous trade closed)

═══════════════════════════════════════════════════════════════
```

### Gatekeeper Workflow

```
GATEKEEPER_WORKFLOW:
═══════════════════════════════════════════════════════════════

INPUT: Symbol, Direction (optional), Current Price

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. Load signals_history.json                               │
│                                                             │
│  FOR EACH direction (LONG, SHORT or specified):             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  CHECK 1: Daily Directional Limit                     │  │
│  │  ─────────────────────────────────────────────────────│  │
│  │  Search for signal with:                              │  │
│  │    - Same symbol                                      │  │
│  │    - Same direction                                   │  │
│  │    - Timestamp starts with today's UTC date           │  │
│  │                                                       │  │
│  │  IF found → BLOCK (reason: DAILY_LIMIT)               │  │
│  │  ELSE → Continue to Check 2                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                         ↓                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  CHECK 2: Active Trade                                │  │
│  │  ─────────────────────────────────────────────────────│  │
│  │  Search for signal with:                              │  │
│  │    - Same symbol                                      │  │
│  │    - Same direction                                   │  │
│  │    - Status = "Active"                                │  │
│  │                                                       │  │
│  │  IF found:                                            │  │
│  │    - Compare current price to SL and TP1              │  │
│  │    - IF SL hit → Update to Hit_SL, ALLOW              │  │
│  │    - IF TP1 hit → Update to Hit_TP1, ALLOW            │  │
│  │    - ELSE → BLOCK (reason: ACTIVE_TRADE)              │  │
│  │                                                       │  │
│  │  IF not found → ALLOW                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

OUTPUT:
  - results: { LONG: {allowed, reason}, SHORT: {allowed, reason} }
  - anyAllowed: true/false
  - allowedDirections: ['LONG'] or ['SHORT'] or ['LONG', 'SHORT'] or []

═══════════════════════════════════════════════════════════════
```

### CLI Commands

```
GATEKEEPER_CLI:
═══════════════════════════════════════════════════════════════

# View signals history and statistics
node scripts/binance-client.js signals

# View only active signals
node scripts/binance-client.js active-signals

# Check gatekeeper for specific symbol
node scripts/binance-client.js gatekeeper BTCUSDT
node scripts/binance-client.js gatekeeper BTCUSDT LONG

# Manually record a signal
node scripts/binance-client.js record-signal BTCUSDT LONG 105000 103000 108000

# Start signal monitor (background)
node scripts/binance-client.js monitor start 300

# Run single monitor check
node scripts/binance-client.js monitor once

═══════════════════════════════════════════════════════════════
```

---

## COMPONENT 4: SIGNAL MONITOR (Background Task)

### Monitor Overview

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           SIGNAL MONITOR - AUTOMATIC STATUS UPDATES                           ║
║           Checks Active Signals Against Current Prices                        ║
║                                                                               ║
║  INTERVAL: Every 5 minutes (configurable)                                     ║
║  PURPOSE: Auto-update trade status when SL/TP levels are hit                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Monitor Workflow

```
MONITOR_WORKFLOW:
═══════════════════════════════════════════════════════════════

EVERY 5 MINUTES (configurable):
───────────────────────────────

1. Load all signals with status = "Active"
2. Fetch current prices for all unique symbols
3. For each active signal:

   FOR LONG positions:
     IF current_price <= sl_price → Update to Hit_SL
     IF current_price >= tp3_price → Update to Hit_TP3
     IF current_price >= tp2_price → Update to Hit_TP2
     IF current_price >= tp1_price → Update to Hit_TP1
     ELSE → Still active (log P&L %)

   FOR SHORT positions:
     IF current_price >= sl_price → Update to Hit_SL
     IF current_price <= tp3_price → Update to Hit_TP3
     IF current_price <= tp2_price → Update to Hit_TP2
     IF current_price <= tp1_price → Update to Hit_TP1
     ELSE → Still active (log P&L %)

4. Update signals_history.json with new statuses
5. Log results and update stats

═══════════════════════════════════════════════════════════════
```

### Performance Tracking

```
PERFORMANCE_STATS:
═══════════════════════════════════════════════════════════════

Tracked in signals_history.json:
  - total: Total signals ever recorded
  - wins: Signals that hit any TP (TP1, TP2, TP3)
  - losses: Signals that hit SL
  - active: Currently open signals
  - winRate: wins / (wins + losses) * 100

View stats: node scripts/binance-client.js signals

═══════════════════════════════════════════════════════════════
```

---

## COMPONENT 5: 6-PILLAR TRIGGER (Deep Analysis)

### 6-Pillar Confluence System

```
6_PILLAR_SYSTEM:
═══════════════════════════════════════════════════════════════

PILLAR 1: SMC STRUCTURE (4 points)
──────────────────────────────────
Skill: smc-core
Checks:
  ☐ HTF (4H) trend direction clear
  ☐ LTF (1H) alignment with HTF
  ☐ Unmitigated POI identified (OB/FVG)
  ☐ Liquidity sweep confirmed

PILLAR 2: INDICATORS (3 points)
───────────────────────────────
Skill: indicator-logic
Checks:
  ☐ Fibonacci OTE zone (0.618-0.786)
  ☐ RSI divergence or extreme
  ☐ Volume Profile POC alignment

PILLAR 3: SOCIAL SENTIMENT (2 points)
─────────────────────────────────────
Skill: social-sentiment
Checks:
  ☐ Sentiment aligned with technical bias
  ☐ No contrarian warning (not extreme)

PILLAR 4: ON-CHAIN INTEL (2 points)
───────────────────────────────────
Skill: on-chain-intel
Checks:
  ☐ On-chain flow aligned with bias
  ☐ No whale divergence warning

PILLAR 5: FUNDAMENTAL INTEL (2 points) ★ NEW ★
──────────────────────────────────────────────
Source: RSS News Feeds
Checks:
  ☐ No negative news in last 24H (VETO check)
  ☐ Positive catalyst identified (bonus)

News Sources:
  - CoinDesk RSS
  - CoinTelegraph RSS
  - Decrypt RSS
  - Project-specific announcements

Veto Rules:
  ❌ Hack/exploit news → VETO (no trade)
  ❌ Regulatory action → VETO (no trade)
  ❌ Team controversy → VETO (no trade)
  ⚠️ Exchange delisting → MAJOR WARNING

PILLAR 6: RISK MANAGEMENT (2 points)
────────────────────────────────────
Skill: risk-management
Checks:
  ☐ R:R ratio >= 1:2
  ☐ Leverage <= 20x (calculated correctly)

TOTAL: 15 POINTS

SIGNAL THRESHOLDS:
  13-15 points → 🟢 STRONG SIGNAL (Full position)
  10-12 points → 🟡 MODERATE SIGNAL (75% position)
  7-9 points   → 🟠 WEAK SIGNAL (50% position)
  < 7 points   → 🔴 NO SIGNAL → WAIT

═══════════════════════════════════════════════════════════════
```

### Trigger Protocol

```
TRIGGER_PROTOCOL:
═══════════════════════════════════════════════════════════════

When Scanner identifies a candidate:

1. LOG CANDIDATE
   → Save to config/scan_results.json
   → Mark status: "PENDING_ANALYSIS"

2. INVOKE ORCHESTRATOR
   Command: "Analyze [SYMBOL] using market-intelligence skill"
   Pass: {
     symbol: "[SYMBOL]",
     source: "binance-engine",
     scan_id: "[SCAN_ID]",
     rvol: [VALUE],
     momentum: { change_24h, change_4h }
   }

3. WAIT FOR RESULT
   → Orchestrator runs 6-pillar analysis
   → Returns SIGNAL or WAIT

4. UPDATE STATUS
   → Update scan_results.json
   → Mark status: "SIGNAL" or "WAIT"
   → Log confluence score

5. IF SIGNAL
   → Format WhatsApp message
   → Include execution parameters
   → Queue for potential execution

═══════════════════════════════════════════════════════════════
```

---

## COMPONENT 3: EXECUTION ENGINE (Scaffolded)

### Order Interface

```
EXECUTION_INTERFACE:
═══════════════════════════════════════════════════════════════

NOTE: This is SCAFFOLDING for future implementation.
      Actual execution requires API keys and careful testing.

ORDER TYPES:
────────────
1. MARKET ORDER
   {
     "symbol": "SOLUSDT",
     "side": "BUY",
     "type": "MARKET",
     "quantity": 0.5,
     "quoteOrderQty": 100  // Or specify USD amount
   }

2. LIMIT ORDER
   {
     "symbol": "SOLUSDT",
     "side": "BUY",
     "type": "LIMIT",
     "timeInForce": "GTC",
     "quantity": 0.5,
     "price": 198.00
   }

3. STOP LOSS (OCO)
   {
     "symbol": "SOLUSDT",
     "side": "SELL",
     "quantity": 0.5,
     "price": 210.00,        // Take Profit
     "stopPrice": 190.00,    // Stop Loss trigger
     "stopLimitPrice": 189.50
   }

═══════════════════════════════════════════════════════════════
```

### Automatic SL/TP Protocol

```
AUTO_SLTP_PROTOCOL:
═══════════════════════════════════════════════════════════════

WHEN a SIGNAL is approved for execution:

1. CALCULATE POSITION SIZE
   Risk Amount = Portfolio × Risk% (2%)
   Position Size = Risk Amount × Leverage

2. SET STOP LOSS
   SL Price = Entry - (Entry × SL_Distance%)
   SL_Distance = from Layer 3 (risk-management)

3. SET TAKE PROFIT LEVELS
   TP1 = Entry + (SL_Distance × 2)  → Close 50%
   TP2 = Entry + (SL_Distance × 3)  → Close 30%
   TP3 = Entry + (SL_Distance × 5)  → Close 20%

4. PLACE ORDERS
   a. Entry Order (Market or Limit)
   b. OCO for TP1 + SL
   c. Trailing stop for remaining position

EXAMPLE (LONG):
───────────────
Entry: $200.00
SL Distance: 2%
SL Price: $196.00

TP1: $208.00 (1:2 R:R) - Close 50%
TP2: $212.00 (1:3 R:R) - Close 30%
TP3: $220.00 (1:5 R:R) - Close 20%

═══════════════════════════════════════════════════════════════
```

### Position Tracking

```
POSITION_TRACKING:
═══════════════════════════════════════════════════════════════

ACTIVE_POSITION_SCHEMA:
{
  "position_id": "[UUID]",
  "symbol": "SOLUSDT",
  "side": "LONG",
  "entry_price": 200.00,
  "entry_time": "[ISO]",
  "quantity": 0.5,
  "leverage": 5,
  "stop_loss": 196.00,
  "take_profits": [
    { "level": 1, "price": 208.00, "size_pct": 50, "status": "PENDING" },
    { "level": 2, "price": 212.00, "size_pct": 30, "status": "PENDING" },
    { "level": 3, "price": 220.00, "size_pct": 20, "status": "PENDING" }
  ],
  "current_price": 202.50,
  "unrealized_pnl": 1.25,
  "unrealized_pnl_pct": 1.25,
  "status": "OPEN",
  "source_scan_id": "[SCAN_ID]",
  "confluence_score": 12
}

═══════════════════════════════════════════════════════════════
```

---

## COMPONENT 4: MONITORING & LOGGING

### KnowledgeBase Integration

```
KNOWLEDGEBASE_LOGGING:
═══════════════════════════════════════════════════════════════

TRADE ENTRY LOG:
────────────────
BRIDGE_SIGNAL:TRADE_OPENED
{
  "position_id": "[UUID]",
  "symbol": "SOLUSDT",
  "side": "LONG",
  "entry_price": 200.00,
  "quantity": 0.5,
  "leverage": 5,
  "stop_loss": 196.00,
  "tp1": 208.00,
  "confluence_score": 12,
  "source": "binance-engine",
  "timestamp": "[ISO]"
}

TRADE EXIT LOG:
───────────────
BRIDGE_SIGNAL:TRADE_CLOSED
{
  "position_id": "[UUID]",
  "symbol": "SOLUSDT",
  "exit_price": 208.00,
  "exit_reason": "TP1_HIT",
  "pnl_usd": 4.00,
  "pnl_pct": 4.0,
  "duration_hours": 6.5,
  "timestamp": "[ISO]"
}

SCAN LOG:
─────────
BRIDGE_SIGNAL:SCAN_COMPLETED
{
  "scan_id": "[UUID]",
  "candidates_found": 5,
  "signals_generated": 2,
  "timestamp": "[ISO]"
}

═══════════════════════════════════════════════════════════════
```

### WhatsApp Notifications

```
WHATSAPP_NOTIFICATIONS:
═══════════════════════════════════════════════════════════════

SCAN COMPLETE NOTIFICATION:
───────────────────────────
📡 **SCAN COMPLETE**

⏰ Time: [timestamp]
🔍 Pairs Scanned: 443
✅ Candidates Found: 5

**Top Candidates (by RVOL):**
1. SOLUSDT - RVOL: 2.8 | +5.2% (24H)
2. XRPUSDT - RVOL: 2.1 | +4.8% (24H)
3. AVAXUSDT - RVOL: 1.9 | -6.2% (24H)

🎯 Triggering 6-Pillar Analysis...

───────────────────────────

POSITION OPENED NOTIFICATION:
─────────────────────────────
🚀 **POSITION OPENED**

📊 Symbol: SOLUSDT
📶 Direction: LONG
🎯 Entry: $200.00
🛑 Stop Loss: $196.00 (-2%)
🏆 Targets:
   • TP1: $208.00 (+4%)
   • TP2: $212.00 (+6%)
   • TP3: $220.00 (+10%)

💰 Position: $100 @ 5x leverage
🔗 Confluence: 12/15 points

───────────────────────────

POSITION CLOSED NOTIFICATION:
─────────────────────────────
✅ **POSITION CLOSED**

📊 Symbol: SOLUSDT
📶 Direction: LONG
🎯 Entry: $200.00
🏁 Exit: $208.00
📈 Result: +$4.00 (+4.0%)
⏱️ Duration: 6h 30m
🎯 Exit Reason: TP1 Hit

═══════════════════════════════════════════════════════════════
```

---

## COMMANDS

### Run Scanner

```bash
# Full scan with 6-pillar analysis
node scripts/binance-client.js scan --analyze

# Quick scan (no analysis, just candidates)
node scripts/binance-client.js scan --quick

# Scan specific symbols
node scripts/binance-client.js scan --symbols SOLUSDT,ETHUSDT,BTCUSDT
```

### Check Positions

```bash
# Get all open positions
node scripts/binance-client.js positions

# Get specific position
node scripts/binance-client.js position --id [POSITION_ID]
```

### Execute Trade (Scaffolded)

```bash
# Place market order (requires API keys)
node scripts/binance-client.js order --symbol SOLUSDT --side BUY --amount 100

# Place limit order
node scripts/binance-client.js order --symbol SOLUSDT --side BUY --price 198 --amount 100
```

---

## SERVICE RUNNER INTEGRATION

```
SERVICE_RUNNER:
═══════════════════════════════════════════════════════════════

The Binance Engine runs as a scheduled service:

CRON SCHEDULE:
  */10 * * * * node scripts/binance-client.js scan --analyze

FLOW:
  1. Service runner triggers scan every 10 minutes
  2. Scanner identifies high-potential candidates
  3. For each candidate, 6-pillar analysis runs
  4. Signals are generated and sent to WhatsApp
  5. (Future) Approved signals execute automatically

MANUAL TRIGGER:
  User can also trigger scan via WhatsApp:
  "scan market" or "find opportunities"

═══════════════════════════════════════════════════════════════
```

---

## FILES

```
FILE_STRUCTURE:
═══════════════════════════════════════════════════════════════

skills/
  binance-engine/
    SKILL.md              ← THIS FILE

scripts/
  binance-client.js       ← Binance API utility

config/
  scan_results.json       ← Latest scan results
  active_positions.json   ← Open position tracking
  dynamic_watchlist.json  ← Maintained watchlist

═══════════════════════════════════════════════════════════════
```

---

## ERROR HANDLING

```
ERROR_HANDLING:
═══════════════════════════════════════════════════════════════

BINANCE API ERRORS:
───────────────────
Rate Limited (429):
  → Wait 60 seconds, retry
  → Log warning

Connection Error:
  → Retry 3 times with exponential backoff
  → If still fails, skip scan cycle

Invalid Symbol:
  → Remove from watchlist
  → Log as delisted

ANALYSIS ERRORS:
────────────────
TradingView Unavailable:
  → Skip Pillar 1 & 2
  → Log warning, reduce confidence

X Session Expired:
  → Skip Pillar 3
  → Log warning to run capture-x-auth

On-Chain Platform Down:
  → Skip Pillar 4
  → Use cached data if available

═══════════════════════════════════════════════════════════════
```
