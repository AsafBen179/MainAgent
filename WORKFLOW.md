# Trading Agent Workflow Documentation

Complete technical documentation for the autonomous trading intelligence system.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Complete Trading Pipeline](#complete-trading-pipeline)
3. [Component 1: Market Scanner](#component-1-market-scanner)
4. [Component 2: Smart Filter](#component-2-smart-filter)
5. [Component 3: Signal Gatekeeper](#component-3-signal-gatekeeper)
6. [Component 4: 6-Pillar Analysis](#component-4-6-pillar-analysis)
7. [Component 5: Signal Monitor](#component-5-signal-monitor)
8. [Mute/Cooldown System](#mutecooldown-system)
9. [WhatsApp Integration](#whatsapp-integration)
10. [Data Flow Diagrams](#data-flow-diagrams)
11. [CLI Reference](#cli-reference)
12. [Troubleshooting](#troubleshooting)

---

## System Overview

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║                    AUTONOMOUS TRADING INTELLIGENCE SYSTEM                             ║
║                    ══════════════════════════════════════                             ║
║                                                                                       ║
║   ┌─────────────────────────────────────────────────────────────────────────────┐     ║
║   │                                                                             │     ║
║   │   INPUT SOURCES                         PROCESSING LAYERS                   │     ║
║   │   ═════════════                         ═════════════════                   │     ║
║   │                                                                             │     ║
║   │   ┌──────────────┐                     ┌──────────────────────────────┐     │     ║
║   │   │ Binance API  │────────────────────►│ Market Scanner               │     │     ║
║   │   │ (647 pairs)  │                     │ Volume, Momentum, RVOL       │     │     ║
║   │   └──────────────┘                     └─────────────┬────────────────┘     │     ║
║   │                                                      │                      │     ║
║   │   ┌──────────────┐                                   ▼                      │     ║
║   │   │ Analysis     │                     ┌──────────────────────────────┐     │     ║
║   │   │ Memory       │◄───────────────────►│ Smart Filter                 │     │     ║
║   │   │ (JSON)       │                     │ Mute, Time, Price Delta      │     │     ║
║   │   └──────────────┘                     └─────────────┬────────────────┘     │     ║
║   │                                                      │                      │     ║
║   │   ┌──────────────┐                                   ▼                      │     ║
║   │   │ Signal       │                     ┌──────────────────────────────┐     │     ║
║   │   │ History      │◄───────────────────►│ Signal Gatekeeper            │     │     ║
║   │   │ (JSON)       │                     │ Daily Limit, Active Trades   │     │     ║
║   │   └──────────────┘                     └─────────────┬────────────────┘     │     ║
║   │                                                      │                      │     ║
║   │   ┌──────────────┐                                   ▼                      │     ║
║   │   │ TradingView  │                     ┌──────────────────────────────┐     │     ║
║   │   │ X (Twitter)  │────────────────────►│ 6-Pillar Analysis            │     │     ║
║   │   │ On-Chain     │                     │ SMC, Indicators, Risk,       │     │     ║
║   │   │ News RSS     │                     │ Sentiment, Whale, News       │     │     ║
║   │   └──────────────┘                     └─────────────┬────────────────┘     │     ║
║   │                                                      │                      │     ║
║   │                                                      ▼                      │     ║
║   │                                        ┌──────────────────────────────┐     │     ║
║   │                                        │ Decision Engine              │     │     ║
║   │                                        │ 75% Confidence Threshold     │     │     ║
║   │                                        └─────────────┬────────────────┘     │     ║
║   │                                                      │                      │     ║
║   │                                         ┌────────────┴────────────┐         │     ║
║   │                                         │                         │         │     ║
║   │                                         ▼                         ▼         │     ║
║   │                              ┌──────────────────┐    ┌──────────────────┐   │     ║
║   │                              │ SIGNAL ≥75%     │    │ WAIT <75%        │   │     ║
║   │                              │ → WhatsApp      │    │ → Mute 4 hours   │   │     ║
║   │                              │ → Record signal │    │ → Log only       │   │     ║
║   │                              └──────────────────┘    └──────────────────┘   │     ║
║   │                                                                             │     ║
║   └─────────────────────────────────────────────────────────────────────────────┘     ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Complete Trading Pipeline

### End-to-End Flow

```
COMPLETE TRADING PIPELINE:
════════════════════════════════════════════════════════════════════════════════════════

PHASE 1: DISCOVERY (Every 10 minutes)
─────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Step 1.1: Fetch all USDT pairs from Binance                                    │
│  └─► Input: Binance 24h ticker API                                              │
│  └─► Output: ~647 trading pairs                                                 │
│                                                                                 │
│  Step 1.2: Apply volume filter                                                  │
│  └─► Filter: volume_24h >= $20,000,000                                          │
│  └─► Output: ~80-100 pairs                                                      │
│                                                                                 │
│  Step 1.3: Apply momentum filter                                                │
│  └─► Filter: |change_24h| >= 3% AND |change_4h| >= 1.5%                         │
│  └─► Output: ~15-30 pairs                                                       │
│                                                                                 │
│  Step 1.4: Calculate RVOL for each candidate                                    │
│  └─► Formula: RVOL = current_hour_volume / avg_hourly_volume_24h                │
│  └─► Filter: RVOL >= 1.5                                                        │
│  └─► Output: ~5-15 pairs (Scout Candidates)                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
PHASE 2: SMART FILTERING (Memory Check)
───────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  FOR EACH Scout Candidate:                                                      │
│                                                                                 │
│  Step 2.0: CHECK MUTE STATUS (FIRST!)                                           │
│  └─► If mute_until > NOW → BLOCK (reason: MUTED, Xh remaining)                  │
│  └─► Skip to next candidate                                                     │
│                                                                                 │
│  Step 2.1: Check if asset exists in analysis_history.json                       │
│  └─► If NOT found → ANALYZE (reason: NEW_ASSET)                                 │
│                                                                                 │
│  Step 2.2: Check time since last analysis                                       │
│  └─► If hours > 4 → ANALYZE (reason: TIME_EXPIRED)                              │
│                                                                                 │
│  Step 2.3: Check price delta                                                    │
│  └─► If |current_price - last_price| / last_price > 2%                          │
│  └─► → ANALYZE (reason: PRICE_DELTA)                                            │
│                                                                                 │
│  Step 2.4: Default                                                              │
│  └─► If none of above → SKIP                                                    │
│  └─► Add to observation_list.json                                               │
│                                                                                 │
│  Output: toAnalyze[] (2-5 assets typically)                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
PHASE 3: GATEKEEPER CHECK (Duplicate Prevention)
────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  FOR EACH asset in toAnalyze[]:                                                 │
│                                                                                 │
│  Step 3.1: Daily Direction Check                                                │
│  └─► Search signals_history.json for same symbol + direction + today            │
│  └─► If found → BLOCK (reason: DAILY_LIMIT)                                     │
│  └─► Note: Different direction allowed (LONG today = SHORT allowed)             │
│                                                                                 │
│  Step 3.2: Active Trade Check                                                   │
│  └─► Search for active signal (status = "Active")                               │
│  └─► If found:                                                                  │
│      └─► Fetch current price from Binance                                       │
│      └─► Check if SL hit (LONG: price <= sl_price)                              │
│      └─► Check if TP1 hit (LONG: price >= tp1_price)                            │
│      └─► If SL/TP hit → Update status, ALLOW new analysis                       │
│      └─► If neither → BLOCK (reason: ACTIVE_TRADE)                              │
│                                                                                 │
│  Output: allowedAssets[] (passed gatekeeper)                                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
PHASE 4: 6-PILLAR CONFLUENCE ANALYSIS
─────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  FOR EACH asset in allowedAssets[]:                                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ PILLAR 1: SMC CORE (4 points max)                                       │    │
│  │ ─────────────────────────────────                                       │    │
│  │ ☐ HTF (4H) trend clear (BOS confirmed)                          +1     │    │
│  │ ☐ LTF (1H) aligned with HTF                                     +1     │    │
│  │ ☐ Unmitigated POI (Order Block or FVG)                          +1     │    │
│  │ ☐ Liquidity sweep confirmed                                      +1     │    │
│  │                                                                         │    │
│  │ Source: TradingView with LuxAlgo SMC indicator                          │    │
│  │ Abort: If no clear structure → WAIT immediately                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                        │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ PILLAR 2: INDICATOR LOGIC (3 points max)                                │    │
│  │ ────────────────────────────────────                                    │    │
│  │ ☐ Fibonacci OTE zone (0.618-0.786)                              +1     │    │
│  │ ☐ RSI divergence or extreme reading                             +1     │    │
│  │ ☐ Volume Profile POC alignment                                   +1     │    │
│  │                                                                         │    │
│  │ Source: TradingView chart analysis                                      │    │
│  │ Minimum: 2/3 indicators must confirm                                    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                        │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ PILLAR 3: RISK MANAGEMENT (2 points max)                                │    │
│  │ ────────────────────────────────────                                    │    │
│  │ ☐ R:R ratio >= 1:2                                              +1     │    │
│  │ ☐ Leverage <= 20x (Risk% / SL_Distance%)                        +1     │    │
│  │                                                                         │    │
│  │ Calculations:                                                           │    │
│  │   Leverage = Max Risk (2%) / Distance to SL (%)                         │    │
│  │   Position = Portfolio × Risk% × Leverage                               │    │
│  │                                                                         │    │
│  │ Abort: If R:R < 1:2 → WAIT (risk too high)                              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                        │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ PILLAR 4: SOCIAL SENTIMENT (2 points max)                               │    │
│  │ ────────────────────────────────────                                    │    │
│  │ ☐ Sentiment aligned with technical bias                         +1     │    │
│  │ ☐ No contrarian warning (not extreme)                           +1     │    │
│  │                                                                         │    │
│  │ Source: X (Twitter) scraping with sessions/x_auth.json                  │    │
│  │ Contrarian Rule:                                                        │    │
│  │   If BULLISH setup + EXTREME GREED → Reduce position 50%                │    │
│  │   If BEARISH setup + EXTREME FEAR → Consider reversal                   │    │
│  │                                                                         │    │
│  │ Skip: If x_auth.json missing → Skip with warning (neutral score)        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                        │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ PILLAR 5: ON-CHAIN INTEL (2 points max)                                 │    │
│  │ ───────────────────────────────────                                     │    │
│  │ ☐ On-chain flow aligned with bias                               +1     │    │
│  │ ☐ No whale divergence warning                                   +1     │    │
│  │                                                                         │    │
│  │ Sources:                                                                │    │
│  │   SOL → Solscan (https://solscan.io/)                                   │    │
│  │   ETH → Etherscan, Arkham Intelligence                                  │    │
│  │   BTC → Arkham Intelligence                                             │    │
│  │                                                                         │    │
│  │ Whale Divergence Rule:                                                  │    │
│  │   If BULLISH + whales DISTRIBUTING → Reduce position 50%                │    │
│  │                                                                         │    │
│  │ High-Conviction Rule:                                                   │    │
│  │   If BULLISH + whales ACCUMULATING → +25% position (whale-confirmed)    │    │
│  │                                                                         │    │
│  │ Skip: If platform unavailable → Skip with warning (neutral score)       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                        │
│                                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ PILLAR 6: FUNDAMENTAL INTEL (2 points max)                              │    │
│  │ ──────────────────────────────────────                                  │    │
│  │ ☐ No negative news veto                                         +1     │    │
│  │ ☐ Positive catalyst OR neutral stance                           +1     │    │
│  │                                                                         │    │
│  │ Sources: RSS feeds (CoinDesk, CoinTelegraph, Decrypt)                   │    │
│  │                                                                         │    │
│  │ VETO TRIGGERS (Immediate ABORT):                                        │    │
│  │   - Hack/exploit news                                                   │    │
│  │   - Exchange delisting                                                  │    │
│  │   - Regulatory action                                                   │    │
│  │   - Team controversy/departure                                          │    │
│  │                                                                         │    │
│  │ Catalyst Bonus:                                                         │    │
│  │   - New listing, partnership, upgrade → +1 confidence                   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
PHASE 5: DECISION & OUTPUT
──────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Step 5.1: Calculate total points (max 15)                                      │
│                                                                                 │
│  Step 5.2: Calculate confidence percentage                                      │
│  └─► Formula: confidence_percent = (points / 15) × 100                          │
│                                                                                 │
│  Step 5.3: Apply 75% threshold                                                  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐      │
│  │                                                                       │      │
│  │  IF confidence >= 75% (12+ points):                                   │      │
│  │  ═══════════════════════════════════                                  │      │
│  │    → Generate SIGNAL output                                           │      │
│  │    → Send to WhatsApp                                                 │      │
│  │    → Record to signals_history.json                                   │      │
│  │    → Update analysis_history.json                                     │      │
│  │    → Log to KnowledgeBase                                             │      │
│  │                                                                       │      │
│  │  IF confidence < 75% (11 or fewer points):                            │      │
│  │  ═══════════════════════════════════════                              │      │
│  │    → Generate WAIT decision (internal only)                           │      │
│  │    → NO WhatsApp message                                              │      │
│  │    → MUTE asset for 4 hours                                           │      │
│  │    → Update analysis_history.json with mute_until                     │      │
│  │    → Log to KnowledgeBase                                             │      │
│  │                                                                       │      │
│  └───────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
PHASE 6: MONITORING (Ongoing)
─────────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Signal Monitor (every 5 minutes):                                              │
│                                                                                 │
│  Step 6.1: Load all signals with status = "Active"                              │
│                                                                                 │
│  Step 6.2: Fetch current prices from Binance                                    │
│                                                                                 │
│  Step 6.3: For each active signal:                                              │
│  └─► Check if SL hit:                                                           │
│      └─► LONG: current_price <= sl_price → Hit_SL                               │
│      └─► SHORT: current_price >= sl_price → Hit_SL                              │
│  └─► Check if TP hit:                                                           │
│      └─► LONG: current_price >= tp1/tp2/tp3_price → Hit_TP1/2/3                 │
│      └─► SHORT: current_price <= tp1/tp2/tp3_price → Hit_TP1/2/3                │
│                                                                                 │
│  Step 6.4: Update signals_history.json with new statuses                        │
│                                                                                 │
│  Step 6.5: Update stats (wins, losses, active count)                            │
│                                                                                 │
│  Step 6.6: Log changes to KnowledgeBase                                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════════════════
```

---

## Component 1: Market Scanner

### Scanner Configuration

```
SCANNER_CONFIG:
═══════════════════════════════════════════════════════════════════════════════════════

TIMING:
  scan_interval: 10 minutes
  data_source: Binance REST API (https://api.binance.com/api/v3/ticker/24hr)
  pairs: All USDT spot pairs

VOLUME FILTER:
  min_volume_24h: $20,000,000 USD
  purpose: Ensures sufficient liquidity for trading

PRICE CHANGE FILTER:
  min_change_24h: 3% (absolute value)
  min_change_4h: 1.5% (momentum confirmation)
  purpose: Identifies assets with significant movement

RELATIVE VOLUME (RVOL):
  formula: RVOL = Volume_current_hour / Average_hourly_volume_24h
  threshold: RVOL >= 1.5
  purpose: Detects unusual activity spikes

BLACKLIST (excluded from scan):
  Stablecoins: USDC, BUSD, TUSD, DAI, FDUSD
  Wrapped tokens: WBTC, WBETH
  Fiat pairs: EUR, GBP

═══════════════════════════════════════════════════════════════════════════════════════
```

### RVOL Interpretation

| RVOL Range | Label | Meaning |
|------------|-------|---------|
| < 0.5 | DEAD | Below average activity |
| 0.5 - 1.0 | LOW | Normal/quiet period |
| 1.0 - 1.5 | NORMAL | Average activity |
| 1.5 - 2.5 | ELEVATED | Above average - WATCH |
| 2.5 - 5.0 | HIGH | Significant activity - ALERT |
| > 5.0 | EXTREME | Unusual spike - INVESTIGATE |

---

## Component 2: Smart Filter

### Memory-Based Filtering Rules

```
SMART_FILTER_RULES:
═══════════════════════════════════════════════════════════════════════════════════════

RULE 0: MUTE CHECK (HIGHEST PRIORITY)
─────────────────────────────────────
Condition: mute_until > current_time
Action:    → BLOCK (no analysis at all)
Reason:    Asset is in cooldown period after WAIT/low confidence
Log:       "[SYMBOL] MUTED for Xh Ym more"

MUTE TRIGGERS:
  - Analysis result = WAIT → Mute 4 hours
  - Confidence < 75% → Mute 4 hours
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
Action:    → ANALYZE
Reason:    Significant price movement warrants re-analysis

RULE 4: DEFAULT
───────────────
Condition: None of above rules triggered
Action:    → SKIP
Effect:    Add to observation_list.json for monitoring

═══════════════════════════════════════════════════════════════════════════════════════
```

---

## Component 3: Signal Gatekeeper

### Duplicate Prevention Rules

```
GATEKEEPER_RULES:
═══════════════════════════════════════════════════════════════════════════════════════

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

═══════════════════════════════════════════════════════════════════════════════════════
```

---

## Component 4: 6-Pillar Analysis

### Confluence Scoring Matrix

```
6-PILLAR CONFLUENCE SCORING:
═══════════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PILLAR                         │  CHECKS                              │  POINTS   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  1. SMC CORE                    │  HTF trend clear                     │    +1     │
│                                 │  LTF aligned with HTF                │    +1     │
│                                 │  Unmitigated POI identified          │    +1     │
│                                 │  Liquidity sweep confirmed           │    +1     │
│                                 │                            Subtotal: │    4      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  2. INDICATOR LOGIC             │  Fibonacci OTE zone (0.618-0.786)    │    +1     │
│                                 │  RSI divergence or extreme           │    +1     │
│                                 │  Volume Profile POC alignment        │    +1     │
│                                 │                            Subtotal: │    3      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  3. RISK MANAGEMENT             │  R:R ratio >= 1:2                    │    +1     │
│                                 │  Leverage <= 20x                     │    +1     │
│                                 │                            Subtotal: │    2      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  4. SOCIAL SENTIMENT            │  Sentiment aligned with bias         │    +1     │
│                                 │  No contrarian warning               │    +1     │
│                                 │                            Subtotal: │    2      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  5. ON-CHAIN INTEL              │  On-chain flow aligned               │    +1     │
│                                 │  No whale divergence                 │    +1     │
│                                 │                            Subtotal: │    2      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  6. FUNDAMENTAL INTEL           │  No negative news veto               │    +1     │
│                                 │  Positive catalyst OR neutral        │    +1     │
│                                 │                            Subtotal: │    2      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                             TOTAL MAX: │   15      │
└─────────────────────────────────────────────────────────────────────────────────────┘

CONFIDENCE CALCULATION:
═══════════════════════════════════════════════════════════════════════════════════════
  Confidence % = (Points Scored / 15) × 100

  Examples:
    15 points → 100% (STRONG)
    14 points → 93% (STRONG)
    13 points → 87% (STRONG)
    12 points → 80% (MODERATE) ← Minimum for SIGNAL
    11 points → 73% (WAIT + MUTE)
    10 points → 67% (WAIT + MUTE)

DECISION THRESHOLDS:
═══════════════════════════════════════════════════════════════════════════════════════
  13-15 points (87-100%) → STRONG SIGNAL (Full position)
  12 points (80%)        → MODERATE SIGNAL (75% position)
  11 points (73%)        → WAIT + 4h mute (NO WhatsApp)
  <11 points (<73%)      → WAIT + 4h mute (NO WhatsApp)

  MINIMUM REQUIREMENT: 75% confidence (12+ points) for ANY signal

═══════════════════════════════════════════════════════════════════════════════════════
```

---

## Component 5: Signal Monitor

### Background Monitoring Process

```
SIGNAL_MONITOR:
═══════════════════════════════════════════════════════════════════════════════════════

INTERVAL: Every 5 minutes (configurable)
PURPOSE: Auto-update trade status when SL/TP levels are hit

WORKFLOW:
─────────
1. Load all signals with status = "Active"
2. Fetch current prices for all unique symbols
3. For each active signal:

   FOR LONG positions:
     IF current_price <= sl_price → Update to Hit_SL (LOSS)
     IF current_price >= tp3_price → Update to Hit_TP3 (FULL WIN)
     IF current_price >= tp2_price → Update to Hit_TP2
     IF current_price >= tp1_price → Update to Hit_TP1
     ELSE → Still active (log P&L %)

   FOR SHORT positions:
     IF current_price >= sl_price → Update to Hit_SL (LOSS)
     IF current_price <= tp3_price → Update to Hit_TP3 (FULL WIN)
     IF current_price <= tp2_price → Update to Hit_TP2
     IF current_price <= tp1_price → Update to Hit_TP1
     ELSE → Still active (log P&L %)

4. Update signals_history.json with new statuses
5. Update stats (wins, losses, active)
6. Log changes

PERFORMANCE TRACKING:
─────────────────────
  - total: Total signals ever recorded
  - wins: Signals that hit any TP (TP1, TP2, TP3)
  - losses: Signals that hit SL
  - active: Currently open signals
  - winRate: wins / (wins + losses) × 100

═══════════════════════════════════════════════════════════════════════════════════════
```

---

## Mute/Cooldown System

### How Muting Works

```
MUTE SYSTEM:
═══════════════════════════════════════════════════════════════════════════════════════

PURPOSE: Prevent repeated analysis of assets that returned WAIT or low confidence

MUTE DURATION: 4 hours (configurable via CONFIG.muteDurationHours)

MUTE TRIGGERS:
──────────────
1. Analysis result = WAIT → Mute 4 hours
2. Confidence < 75% → Mute 4 hours (even if technical SIGNAL)
3. Manual mute via CLI → Mute 4 hours

MUTE EFFECTS:
─────────────
- Asset is blocked from ALL analysis (scout + 6-pillar)
- Asset appears in scan results but marked as "MUTED"
- Smart Filter Rule 0 blocks before any other check
- No WhatsApp message sent

DATA STORAGE:
─────────────
In analysis_history.json:
{
  "BTCUSDT": {
    "mute_until": "2026-01-21T22:30:00.000Z",
    "mute_reason": "WAIT_RESULT"  // or "LOW_CONFIDENCE" or "MANUAL"
  }
}

AUTO-UNMUTE:
────────────
- Mute expires automatically when current_time > mute_until
- No action needed; next scan will analyze if other rules allow

═══════════════════════════════════════════════════════════════════════════════════════
```

---

## WhatsApp Integration

### Signal Output Format

```
SIGNAL OUTPUT (sent to WhatsApp when confidence >= 75%):
═══════════════════════════════════════════════════════════════════════════════════════

🚀 **SIGNAL: [SYMBOL]**

📶 **Direction:** [LONG/SHORT]
🎯 **Entry:** $[PRICE]
🛑 **Stop Loss:** $[SL_PRICE] ([SL_PERCENT]%)
🏆 **Targets:**
   • TP1: $[TP1_PRICE] (1:[RR1] R:R)
   • TP2: $[TP2_PRICE] (1:[RR2] R:R)
   • TP3: $[TP3_PRICE] (1:[RR3] R:R)

💰 **Risk Management:**
   • Leverage: [X]x
   • Risk: 2%
   • Position: $[POSITION_SIZE]
   • R:R Ratio: 1:[BEST_RR]

🛡️ **Confidence:** [X]% (threshold: 75%)
💡 **Rationale:** [SMC_SUMMARY]

📈 **Sentiment:** [BULLISH/BEARISH/NEUTRAL] ([SCORE]/10)
🐋 **Whale Activity:** [ACCUMULATING/DISTRIBUTING/NEUTRAL]
📰 **News:** [POSITIVE_CATALYST/NEUTRAL/NONE]

📊 Source: Binance API
🔗 Confluence: [POINTS]/15 points

═══════════════════════════════════════════════════════════════════════════════════════


WAIT OUTPUT (NOT sent to WhatsApp - internal only):
═══════════════════════════════════════════════════════════════════════════════════════

⏸️ WAIT: [SYMBOL]

Confidence: [X]% (below 75% threshold)
Points: [X]/15
Reason: [PRIMARY_REASON]

Action: Asset muted for 4 hours
Next eligible: [MUTE_UNTIL_TIME]

[Logged to KnowledgeBase only]

═══════════════════════════════════════════════════════════════════════════════════════
```

---

## Data Flow Diagrams

### Analysis History Flow

```
ANALYSIS HISTORY DATA FLOW:
═══════════════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────────┐
                    │         data/analysis_history.json  │
                    └─────────────────────────────────────┘
                                      ▲
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           │                          │                          │
    ┌──────┴──────┐           ┌───────┴───────┐          ┌───────┴───────┐
    │ Smart Scan  │           │ 6-Pillar      │          │ Mute Command  │
    │ (Read)      │           │ Analysis      │          │ (Write)       │
    │             │           │ (Read/Write)  │          │               │
    └─────────────┘           └───────────────┘          └───────────────┘

    Reads:                    Reads:                     Writes:
    - last_analysis_time      - last_analysis_time       - mute_until
    - last_price              - last_result              - mute_reason
    - mute_until
                              Writes:
                              - last_analysis_time
                              - last_price
                              - last_rvol
                              - last_result
                              - mute_until (if WAIT)
                              - mute_reason

═══════════════════════════════════════════════════════════════════════════════════════
```

### Signal History Flow

```
SIGNAL HISTORY DATA FLOW:
═══════════════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────────┐
                    │         data/signals_history.json   │
                    └─────────────────────────────────────┘
                                      ▲
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           │                          │                          │
    ┌──────┴──────┐           ┌───────┴───────┐          ┌───────┴───────┐
    │ Gatekeeper  │           │ Record Signal │          │ Signal Monitor│
    │ (Read)      │           │ (Write)       │          │ (Read/Write)  │
    │             │           │               │          │               │
    └─────────────┘           └───────────────┘          └───────────────┘

    Reads:                    Writes:                    Reads:
    - signals[]               - New signal entry         - signals[] (Active)
    - status                  - history[] event
    - direction               - stats update             Writes:
    - timestamp                                          - status update
                                                         - history[] event
                                                         - stats update

═══════════════════════════════════════════════════════════════════════════════════════
```

---

## CLI Reference

### Complete Command List

```bash
# ═══════════════════════════════════════════════════════════════════════════════════════
# MARKET SCANNING
# ═══════════════════════════════════════════════════════════════════════════════════════

npm run binance:scan              # Basic market scan (volume, momentum, RVOL)
npm run binance:smart-scan        # Full pipeline with memory filter
node scripts/binance-client.js scan --analyze   # Scan + trigger 6-pillar

# ═══════════════════════════════════════════════════════════════════════════════════════
# ANALYSIS HISTORY
# ═══════════════════════════════════════════════════════════════════════════════════════

npm run binance:history           # View all analyzed assets
npm run binance:check             # Check if specific asset needs analysis
npm run binance:observations      # View observation watchlist

node scripts/binance-client.js check BTCUSDT    # Check specific symbol
node scripts/binance-client.js history          # Full history view

# ═══════════════════════════════════════════════════════════════════════════════════════
# SIGNAL MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════════════

npm run signals                   # View full signal history with stats
npm run signals:active            # View only active (open) signals
npm run signals:gatekeeper        # Check gatekeeper status for symbol

node scripts/binance-client.js signals                    # View all signals
node scripts/binance-client.js active-signals             # Active only
node scripts/binance-client.js gatekeeper BTCUSDT         # Check both directions
node scripts/binance-client.js gatekeeper BTCUSDT LONG    # Check specific direction
node scripts/binance-client.js record-signal BTCUSDT LONG 105000 103000 108000

# ═══════════════════════════════════════════════════════════════════════════════════════
# SIGNAL MONITORING
# ═══════════════════════════════════════════════════════════════════════════════════════

npm run signals:monitor           # Single status check of all active signals
npm run signals:monitor-start     # Start background monitor (every 5 min)

node scripts/binance-client.js monitor once      # One-time check
node scripts/binance-client.js monitor start 300 # Start with 300s interval

# ═══════════════════════════════════════════════════════════════════════════════════════
# MUTE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════════════

node scripts/binance-client.js muted             # View all muted assets
node scripts/binance-client.js mute BTCUSDT      # Manually mute for 4 hours
node scripts/binance-client.js unmute BTCUSDT    # Remove mute early

# ═══════════════════════════════════════════════════════════════════════════════════════
# CONFIDENCE CHECKING
# ═══════════════════════════════════════════════════════════════════════════════════════

node scripts/binance-client.js check-confidence 11   # Returns: 73% - BELOW threshold
node scripts/binance-client.js check-confidence 12   # Returns: 80% - ABOVE threshold
node scripts/binance-client.js check-confidence 15   # Returns: 100% - ABOVE threshold

# ═══════════════════════════════════════════════════════════════════════════════════════
# UTILITY
# ═══════════════════════════════════════════════════════════════════════════════════════

npm run binance:rvol BTCUSDT      # Calculate RVOL for specific symbol
npm run binance:ticker BTCUSDT    # Get current ticker data
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Asset always skipped | Recently analyzed with no delta | Wait for 4h or 2% price change |
| Asset muted | WAIT result or <75% confidence | Wait for mute to expire or unmute manually |
| Signal blocked | Daily limit or active trade | Check gatekeeper status |
| No candidates | Market quiet or filters too strict | Check RVOL and momentum thresholds |
| 6-pillar aborts | No clear SMC structure | Normal behavior, wait for structure |

### Debug Commands

```bash
# Check why asset was skipped
node scripts/binance-client.js check BTCUSDT

# Check if asset is muted
node scripts/binance-client.js muted

# Check gatekeeper status
node scripts/binance-client.js gatekeeper BTCUSDT

# View recent analysis history
node scripts/binance-client.js history

# Force unmute an asset
node scripts/binance-client.js unmute BTCUSDT
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.1.0 | 2026-01-22 | Added 75% confidence threshold, 4-hour mute system |
| 3.0.0 | 2026-01-21 | Added Signal Gatekeeper, Signal Monitor, trade lifecycle |
| 2.0.0 | 2026-01-21 | Added Smart Filter, analysis memory, observation list |
| 1.0.0 | 2026-01-20 | Initial Binance Engine with market scanner |

---

*Documentation generated for Unified WhatsApp Trading Agent v3.1*
