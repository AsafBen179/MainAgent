---
name: market-intelligence
description: ORCHESTRATOR - 6-Pillar Confluence Trading System. Coordinates SMC Core (Layer 1), Indicator Logic (Layer 2), Risk Management (Layer 3), Social Sentiment (Layer 4), On-Chain Intel (Layer 5), and Fundamental Intel (Layer 6) for high-probability trade signals. Use for "market analysis", "price check", "trade thesis", "chart analysis", "crypto analysis", "technical analysis", "SMC analysis", or any trading-related research.
version: 7.0.0
allowed-tools:
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_wait
  - mcp__playwright__browser_hover
  - mcp__playwright__browser_type
  - mcp__playwright__browser_press
  - mcp__playwright__browser_scroll
  - Read
  - Write
orchestrates:
  - smc-core
  - indicator-logic
  - risk-management
  - social-sentiment
  - on-chain-intel
  - fundamental-intel
---

# Market Intelligence Skill - ORCHESTRATOR

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           MARKET INTELLIGENCE ORCHESTRATOR                                    ║
║           6-Pillar Confluence Trading System                                  ║
║                                                                               ║
║  This skill orchestrates 6 specialized analysis layers:                       ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 1: SMC CORE (smc-core)                                           │  ║
║  │  → Market Structure: BOS, CHoCH, Order Blocks, FVGs, Liquidity         │  ║
║  │  → HTF/LTF Alignment Protocol                                          │  ║
║  │  → Output: SMC_LAYER1_OUTPUT                                           │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 2: INDICATOR LOGIC (indicator-logic)                             │  ║
║  │  → Fibonacci OTE (0.618-0.786 zone)                                    │  ║
║  │  → RSI Divergence Analysis                                              │  ║
║  │  → Volume Profile (POC, HVN alignment)                                  │  ║
║  │  → Output: INDICATOR_LAYER2_OUTPUT                                     │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 3: RISK MANAGEMENT (risk-management)                             │  ║
║  │  → Leverage Calculation (Risk% / SL_Distance%)                         │  ║
║  │  → Position Sizing ($1,000 portfolio)                                   │  ║
║  │  → Take Profit Targets (1:2, 1:3, 1:5 R:R)                             │  ║
║  │  → Output: RISK_LAYER3_OUTPUT                                          │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 4: SOCIAL SENTIMENT (social-sentiment)                           │  ║
║  │  → Live X (Twitter) sentiment scraping                                  │  ║
║  │  → Influencer/Whale signal detection                                   │  ║
║  │  → Hype volume and contrarian analysis                                 │  ║
║  │  → Session: sessions/x_auth.json required                              │  ║
║  │  → Output: SENTIMENT_LAYER4_OUTPUT                                     │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 5: ON-CHAIN INTEL (on-chain-intel)                               │  ║
║  │  → Whale transaction tracking (Arkham/Solscan/Etherscan)               │  ║
║  │  → Smart Money flow detection (accumulation/distribution)              │  ║
║  │  → Exchange inflow/outflow analysis                                    │  ║
║  │  → High-Conviction Rule: Whale-confirmed setups                        │  ║
║  │  → Output: ONCHAIN_LAYER5_OUTPUT                                       │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  LAYER 6: FUNDAMENTAL INTEL (fundamental-intel)         ★ NEW ★         │  ║
║  │  → RSS/News feed monitoring for breaking announcements                 │  ║
║  │  → Partnership, listing, and upgrade detection                         │  ║
║  │  → Negative news veto (hacks, delistings, regulatory action)           │  ║
║  │  → Catalyst timeline tracking (scheduled events)                       │  ║
║  │  → Output: FUNDAMENTAL_LAYER6_OUTPUT                                   │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  ORCHESTRATOR CONFLUENCE CHECK                                          │  ║
║  │  → All 6 pillars evaluated for confluence                              │  ║
║  │  → Contrarian Rule: Flag extreme sentiment/whale divergence            │  ║
║  │  → High-Conviction Rule: Whale-confirmed = EXTREME confidence          │  ║
║  │  → News Veto Rule: Negative fundamentals = ABORT signal                │  ║
║  │  → Output: SIGNAL or WAIT (WhatsApp + Social + Whale + Fundamentals)   │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## ORCHESTRATION WORKFLOW

```
6-PILLAR_ORCHESTRATION:
═══════════════════════════════════════════════════════════════

STEP 1: INVOKE LAYER 1 (SMC Core)
─────────────────────────────────────
→ Analyze market structure on 4H and 1H
→ Identify BOS, CHoCH, Order Blocks, FVGs
→ Check HTF/LTF alignment
→ Identify POI zone and liquidity
→ Receive: SMC_LAYER1_OUTPUT

CHECK: If layer1_verdict == "NO_CLEAR_STRUCTURE"
  → ABORT and output WAIT immediately

STEP 2: INVOKE LAYER 2 (Indicator Logic)
─────────────────────────────────────────
→ Calculate Fibonacci OTE zone from swing points
→ Check if entry is in OTE (0.618-0.786)
→ Analyze RSI for divergence on 15m
→ Check Volume Profile POC alignment
→ Receive: INDICATOR_LAYER2_OUTPUT

CHECK: Count confirmations (2/3 minimum required)

STEP 3: INVOKE LAYER 3 (Risk Management)
─────────────────────────────────────────
→ Calculate entry, stop loss, take profit levels
→ Calculate leverage: Risk% / SL_Distance%
→ Calculate position size for $1,000 portfolio
→ Validate R:R ratio (minimum 1:2)
→ Receive: RISK_LAYER3_OUTPUT

CHECK: If layer3_verdict == "REJECTED"
  → ABORT and output WAIT with reason

STEP 4: INVOKE LAYER 4 (Social Sentiment)
──────────────────────────────────────────
→ Check if sessions/x_auth.json exists
→ If missing: Skip Layer 4, output warning
→ If exists: Navigate to X with asset search
→ Scrape latest 15-20 posts
→ Calculate sentiment score (1-10)
→ Detect influencer/whale signals
→ Check hype volume
→ Apply Contrarian Rule
→ Receive: SENTIMENT_LAYER4_OUTPUT

CHECK: If layer4_verdict == "CONTRARIAN_WARNING"
  → Flag in output, reduce position to 50%

STEP 5: INVOKE LAYER 5 (On-Chain Intel) ★ NEW ★
────────────────────────────────────────────────
→ Identify asset type (SOL/ETH/BTC)
→ Navigate to appropriate platform:
    - SOL: Solscan (https://solscan.io/)
    - ETH: Etherscan/Arkham
    - BTC: Arkham Intelligence
→ Check whale transactions (last 24H)
→ Analyze exchange inflows/outflows
→ Track smart money wallet activity
→ Calculate on-chain score (1-10)
→ Apply High-Conviction Rule
→ Receive: ONCHAIN_LAYER5_OUTPUT

CHECK: If layer5_verdict == "WHALE_DIVERGENCE"
  → Flag in output, reduce position to 50%

CHECK: If layer5_verdict == "WHALE_CONFIRMED"
  → Set confidence to EXTREME
  → Allow position size +25%

STEP 6: INVOKE LAYER 6 (Fundamental Intel) ★ NEW ★
────────────────────────────────────────────────────
→ Check RSS feeds for recent news (last 24H)
→ Scan for positive catalysts:
    - Exchange listings
    - Partnerships/integrations
    - Protocol upgrades
    - Ecosystem events
→ Scan for negative news (VETO triggers):
    - Hacks/exploits
    - Delistings
    - Regulatory actions
    - Team departures
→ Calculate fundamental score (1-10)
→ Receive: FUNDAMENTAL_LAYER6_OUTPUT

CHECK: If layer6_verdict == "NEWS_VETO"
  → ABORT and output WAIT immediately
  → Reason: "Negative fundamental event detected"

CHECK: If layer6_verdict == "CATALYST_DETECTED"
  → Add +1 confidence modifier
  → Flag: "Upcoming catalyst detected"

STEP 7: FINAL CONFLUENCE CHECK
───────────────────────────────
→ Count total confirmations from all 6 layers
→ Apply 6-pillar confluence matrix
→ Check for contrarian/divergence signals
→ Apply High-Conviction Rule if whale-confirmed
→ Apply News Veto Rule if negative fundamentals
→ Determine SIGNAL or WAIT
→ Include Social Pulse + Whale Activity + Fundamentals in output

═══════════════════════════════════════════════════════════════
```

### CONFLUENCE MATRIX

```
6-PILLAR_CONFLUENCE_SCORING:
═══════════════════════════════════════════════════════════════

LAYER 1 - SMC CORE CONFIRMATIONS:
┌─────────────────────────────────────────────────────────────┐
│ ☐ HTF (4H) Trend Clear (BOS confirmed)              +1     │
│ ☐ LTF (1H) Aligned with HTF                         +1     │
│ ☐ Unmitigated POI Identified (OB or FVG)            +1     │
│ ☐ Liquidity Sweep Confirmed                         +1     │
└─────────────────────────────────────────────────────────────┘
Layer 1 Max: 4 points

LAYER 2 - INDICATOR CONFIRMATIONS:
┌─────────────────────────────────────────────────────────────┐
│ ☐ Fibonacci OTE Zone (entry in 0.618-0.786)         +1     │
│ ☐ RSI Divergence or Extreme Reading                 +1     │
│ ☐ Volume Profile POC/HVN Alignment                  +1     │
└─────────────────────────────────────────────────────────────┘
Layer 2 Max: 3 points

LAYER 3 - RISK VALIDATION:
┌─────────────────────────────────────────────────────────────┐
│ ☐ R:R Ratio ≥ 1:2                                   +1     │
│ ☐ Leverage ≤ 20x (valid calculation)                +1     │
└─────────────────────────────────────────────────────────────┘
Layer 3 Max: 2 points

LAYER 4 - SOCIAL SENTIMENT:
┌─────────────────────────────────────────────────────────────┐
│ ☐ Sentiment aligned with technical bias             +1     │
│ ☐ No contrarian warning (not extreme)               +1     │
└─────────────────────────────────────────────────────────────┘
Layer 4 Max: 2 points

LAYER 5 - ON-CHAIN INTEL:
┌─────────────────────────────────────────────────────────────┐
│ ☐ On-chain flow aligned with technical bias         +1     │
│   (Accumulation for LONG, Distribution for SHORT)          │
│ ☐ No whale divergence warning                       +1     │
│   (Whales not selling into bullish setup, etc.)           │
└─────────────────────────────────────────────────────────────┘
Layer 5 Max: 2 points

LAYER 6 - FUNDAMENTAL INTEL (NEW):
┌─────────────────────────────────────────────────────────────┐
│ ☐ No negative news veto (no hacks/delistings)       +1     │
│   (If negative news detected → IMMEDIATE ABORT)            │
│ ☐ Positive catalyst detected OR neutral stance      +1     │
│   (Listings, partnerships, upgrades = +1)                  │
└─────────────────────────────────────────────────────────────┘
Layer 6 Max: 2 points

TOTAL POSSIBLE: 15 points

CONFIDENCE CALCULATION:
─────────────────────────────────────────────────────────────
  Confidence % = (Points Scored / 15) × 100

  Example: 11 points → (11/15) × 100 = 73%
  Example: 12 points → (12/15) × 100 = 80%

SIGNAL THRESHOLDS (Updated for 6 Pillars):
─────────────────────────────────────────────────────────────
🛡️ MINIMUM REQUIREMENT: Confidence ≥ 75% for ANY signal

13-15 points (87-100%) → 🟢 STRONG SIGNAL (Full position)
12 points (80%)        → 🟡 MODERATE SIGNAL (75% position)
11 points (73%)        → 🔴 NO SIGNAL → WAIT + 4H MUTE
< 11 points (<73%)     → 🔴 NO SIGNAL → WAIT + 4H MUTE

⚠️  CRITICAL: If Confidence < 75%:
    → Result = WAIT (not SIGNAL)
    → Asset is MUTED for 4 hours
    → NO WhatsApp message sent
    → Logged: "Asset [Symbol] WAIT. Muted for 4 hours."

HIGH-CONVICTION MODIFIER:
─────────────────────────────────────────────────────────────
IF SMC is BULLISH AND On-chain shows HEAVY ACCUMULATION (≥8):
  → Confidence: +5% bonus
  → Position: +25% (125% of normal)
  → Label: "WHALE-CONFIRMED SETUP"

IF SMC is BEARISH AND On-chain shows HEAVY DISTRIBUTION (≤2):
  → Confidence: +5% bonus
  → Position: +25% (125% of normal)
  → Label: "WHALE-CONFIRMED SETUP"
═══════════════════════════════════════════════════════════════
```

### CONTRARIAN RULE (Layer 4 & 5 Special Check)

```
╔═══════════════════════════════════════════════════════════════╗
║                    CONTRARIAN RULE                            ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  LAYER 4 - SOCIAL SENTIMENT CONTRARIAN:                       ║
║  ─────────────────────────────────────────────────────────────║
║  IF technicals are BULLISH but Sentiment is EXTREME GREED:    ║
║  → Flag as HIGH RISK for potential reversal (Liquidity Grab)  ║
║  → Reduce position size to 50%                                ║
║  → Add warning to output                                      ║
║                                                               ║
║  IF technicals are BEARISH but Sentiment is EXTREME FEAR:     ║
║  → Flag as HIGH RISK for potential bottom                     ║
║  → Consider waiting for reversal confirmation                 ║
║  → Add warning to output                                      ║
║                                                               ║
║  Extreme = Sentiment Score ≤ 2 (EXTREME FEAR)                 ║
║         or Sentiment Score ≥ 9 (EXTREME GREED)                ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  LAYER 5 - WHALE DIVERGENCE:                                  ║
║  ─────────────────────────────────────────────────────────────║
║  IF technicals are BULLISH but On-chain shows DISTRIBUTION:   ║
║  → Flag as "WHALE DIVERGENCE WARNING"                         ║
║  → Whales selling into strength = potential trap              ║
║  → Reduce position size to 50%                                ║
║  → Add warning: "Whales selling into bullish setup"           ║
║                                                               ║
║  IF technicals are BEARISH but On-chain shows ACCUMULATION:   ║
║  → Flag as "SMART MONEY DIVERGENCE"                           ║
║  → Whales buying into weakness = possible bottom              ║
║  → Consider waiting for reversal confirmation                 ║
║  → Add warning: "Whales buying into weakness"                 ║
║                                                               ║
║  Distribution = On-chain Score ≤ 3                            ║
║  Accumulation = On-chain Score ≥ 7                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### MANDATORY LAYER REQUIREMENTS

```
HARD REQUIREMENTS (Must ALL pass for any signal):
─────────────────────────────────────────────────────────────
☐ Layer 1: HTF trend must be clear (not ranging)
☐ Layer 1: LTF must be aligned (not conflicting)
☐ Layer 2: Minimum 2/3 indicator confirmations
☐ Layer 3: R:R ratio must be ≥ 1:2
☐ Layer 4: If session exists, must complete analysis
☐ Layer 5: On-chain analysis attempted (if platform available)
☐ Layer 6: No news veto detected (negative events = ABORT)

SOFT REQUIREMENTS (Adjust position if fails):
─────────────────────────────────────────────────────────────
☐ Layer 4: If contrarian warning → Reduce to 50% position
☐ Layer 4: If x_auth.json missing → Skip with warning
☐ Layer 5: If whale divergence → Reduce to 50% position
☐ Layer 5: If platform unavailable → Skip with warning
☐ Layer 6: If no news data → Skip with warning (neutral)
☐ Layer 6: If catalyst detected → Flag in output (+1 confidence)

POSITION MODIFIERS:
─────────────────────────────────────────────────────────────
☐ Whale-confirmed setup → +25% position (125% of normal)
☐ Contrarian warning → -50% position (50% of normal)
☐ Whale divergence → -50% position (50% of normal)
☐ Positive catalyst → +10% confidence boost

NEWS VETO RULE (Layer 6 Special):
─────────────────────────────────────────────────────────────
☐ If NEWS_VETO detected → IMMEDIATE ABORT (no signal)
☐ Veto triggers: Hacks, exploits, delistings, regulatory action
☐ Override: Only user can override a news veto manually

If ANY hard requirement fails → WAIT (no signal generated)
```

---

## 🚨 CRITICAL: READ THIS FIRST - MANDATORY WORKFLOW 🚨

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║              ⚠️  STOP! FOLLOW THIS EXACT WORKFLOW - NO EXCEPTIONS ⚠️           ║
║                                                                               ║
║  Your output MUST use the SIGNAL/WAIT format - NOT Executive Summary!         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### STEP-BY-STEP MANDATORY WORKFLOW:

**STEP 1: Navigate to TradingView**
```
mcp__playwright__browser_navigate({ url: "https://www.tradingview.com/chart/" })
mcp__playwright__browser_wait({ time: 4000 })
```

**STEP 2: DISMISS ALL POPUPS (DO THIS BEFORE ANYTHING ELSE)**
```
// Dismiss cookie consent, ads, or notification popups
mcp__playwright__browser_click({ selector: "button:has-text('Accept')" })
mcp__playwright__browser_click({ selector: "button:has-text('Got it')" })
mcp__playwright__browser_click({ selector: "button:has-text('Maybe Later')" })
mcp__playwright__browser_click({ selector: "[class*='close']" })
mcp__playwright__browser_click({ selector: "[aria-label='Close']" })

// Press Escape to close any modal
mcp__playwright__browser_press({ key: "Escape" })
mcp__playwright__browser_wait({ time: 1000 })
```

**STEP 3: SEARCH FOR SYMBOL (Use '/' or 'Enter' key)**
```
// Method 1: Press '/' to open symbol search
mcp__playwright__browser_press({ key: "/" })
mcp__playwright__browser_wait({ time: 500 })

// Type the symbol (e.g., SOLUSDT, BTCUSDT, ETHUSDT)
mcp__playwright__browser_type({ selector: "input[data-role='search']", text: "SOLUSDT" })
// Alternative selector:
mcp__playwright__browser_type({ selector: "[class*='search'] input", text: "SOLUSDT" })
mcp__playwright__browser_wait({ time: 1000 })

// Press Enter to select first result
mcp__playwright__browser_press({ key: "Enter" })
mcp__playwright__browser_wait({ time: 2000 })
```

**STEP 4: SET TIMEFRAME (Use top bar buttons)**
```
// TradingView timeframe selectors on top bar:
// 4H timeframe
mcp__playwright__browser_click({ selector: "[data-value='240']" })
// OR
mcp__playwright__browser_click({ selector: "button:has-text('4h')" })

// 1H timeframe
mcp__playwright__browser_click({ selector: "[data-value='60']" })
// OR
mcp__playwright__browser_click({ selector: "button:has-text('1h')" })

// 15m timeframe
mcp__playwright__browser_click({ selector: "[data-value='15']" })

mcp__playwright__browser_wait({ time: 1500 })
```

**STEP 5: VERIFY INDICATORS (TV Free Tier - MAX 2 INDICATORS)**
```
╔═══════════════════════════════════════════════════════════════════╗
║  REQUIRED INDICATORS (already saved in TV layout):                ║
║                                                                   ║
║  1. Smart Money Concepts [LuxAlgo]                                ║
║  2. Liquidity Sweeps                                              ║
║                                                                   ║
║  If indicators NOT visible, add them:                             ║
╚═══════════════════════════════════════════════════════════════════╝

// Open indicators panel
mcp__playwright__browser_click({ selector: "[data-name='open-indicators-dialog']" })
// Alternative:
mcp__playwright__browser_click({ selector: "button[aria-label*='Indicator']" })
mcp__playwright__browser_wait({ time: 1000 })

// Search for LuxAlgo SMC
mcp__playwright__browser_type({ selector: "input[placeholder*='Search']", text: "Smart Money Concepts LuxAlgo" })
mcp__playwright__browser_wait({ time: 500 })
mcp__playwright__browser_click({ selector: "[class*='indicator-item']:first-child" })

// Search for Liquidity Sweeps
mcp__playwright__browser_type({ selector: "input[placeholder*='Search']", text: "Liquidity Sweeps" })
mcp__playwright__browser_wait({ time: 500 })
mcp__playwright__browser_click({ selector: "[class*='indicator-item']:first-child" })

// Close indicator panel
mcp__playwright__browser_press({ key: "Escape" })
```

**STEP 6: TAKE SCREENSHOT WITH INDICATORS VISIBLE**
```
mcp__playwright__browser_take_screenshot()
```

**STEP 7: ANALYZE AND OUTPUT IN SIGNAL/WAIT FORMAT**

### ⚠️ OUTPUT FORMAT - USE THIS EXACTLY ⚠️

**IF conditions are met (6-Pillar Confluence ≥7 points):**
```
🚀 **SIGNAL: [ASSET]**

📶 **Direction:** [LONG/SHORT]
🎯 **Entry:** $[Price]
🛑 **Stop Loss:** $[Price] ([X%] from entry)
🏆 **Targets:**
   • TP1: $[Price] (1:2 R:R) - Close 50%
   • TP2: $[Price] (1:3 R:R) - Close 30%
   • TP3: $[Price] (1:5 R:R) - Close 20%

💰 **Risk Management:**
   • Leverage: [X]x (calculated: 2% / [SL distance]%)
   • Risk: 2%
   • Position: $[X] (of $1000 portfolio)
   • R:R Ratio: 1:[X]

📊 **Confluence Rationale:**
   Layer 1 (SMC): [✅/❌] [Brief SMC finding - BOS direction, POI type]
   Layer 2 (Technical): [✅/❌] [Brief indicator finding - OTE/RSI/Volume]
   Layer 3 (Risk): [✅/❌] [Brief risk finding - R:R and leverage]
   Layer 4 (Sentiment): [✅/❌] [Brief sentiment - aligned/contrarian]
   Layer 5 (On-Chain): [✅/❌] [Brief on-chain - accumulation/distribution]
   Layer 6 (Fundamental): [✅/❌] [Brief fundamental - catalyst/neutral/veto]

🌐 **Social Pulse:** [Score]/10 - [Key insight from X]
   [If contrarian warning: ⚠️ CONTRARIAN: Extreme sentiment detected]

🐋 **Whale Activity:** [Score]/10 - [Summary: e.g., "3 Top Wallets accumulated $2M in last 1H"]
   [If whale-confirmed: ⭐ WHALE CONFIRMED: High-conviction setup]
   [If whale divergence: ⚠️ WHALE DIVERGENCE: Whales [selling/buying] against trend]

📰 **Fundamentals:** [Score]/10 - [Summary: e.g., "Exchange listing announced" or "No significant news"]
   [If catalyst: 🚀 CATALYST: [Event description]]
   [If veto: ⛔ NEWS VETO: [Negative event - signal aborted]]

⏰ **Valid Until:** [Invalidation condition]

───────────────────────────
📊 Source: TradingView + X + On-Chain
🔗 Confluence Score: [X]/15 points
🛡️ Confidence: [X]% (threshold: 75%)
🎯 Signal Strength: [STRONG/MODERATE/WEAK]
[If whale-confirmed: 🏆 CONFIDENCE: EXTREME (+5%)]
```

**IF conditions are NOT met (Confidence < 75% OR recommendation is WAIT):**

⚠️ **IMPORTANT: DO NOT SEND WAIT MESSAGES TO WHATSAPP**
   → Asset is automatically MUTED for 4 hours
   → Log to KnowledgeBase only
   → Next analysis allowed after mute expires

```
[INTERNAL LOG ONLY - NOT SENT TO WHATSAPP]

⏸️ **WAIT: [ASSET]** 🔇 MUTED 4H

📊 Current Price: $[Price]
🛡️ Confidence: [X]% (threshold: 75%)
🔍 Reason: [Single sentence - why no signal]

📋 Layer Status:
   Layer 1 (SMC): [✅/❌] [Status]
   Layer 2 (Technical): [✅/❌] [Status]
   Layer 3 (Risk): [✅/❌] [Status]
   Layer 4 (Sentiment): [✅/❌/⚠️] [Status or "Session missing"]
   Layer 5 (On-Chain): [✅/❌/⚠️] [Status or "Platform unavailable"]
   Layer 6 (Fundamental): [✅/❌/⚠️] [Status or "No data"]

🌐 **Social Pulse:** [Score]/10 - [Key insight or "N/A"]

🐋 **Whale Activity:** [Score]/10 - [Summary or "N/A"]

📰 **Fundamentals:** [Score]/10 - [Summary or "N/A"]

───────────────────────────
Confluence Score: [X]/15 points
🛡️ Confidence: [X]% (need ≥75%)
🔇 Asset muted until: [mute_until timestamp]
Next analysis: After 4-hour cooldown expires
```

### ⛔ DO NOT USE EXECUTIVE SUMMARY FORMAT ⛔
```
The old "📌 EXECUTIVE SUMMARY" format is DEPRECATED.
Always use 🚀 SIGNAL or ⏸️ WAIT format above.
```

---

## ⛔ MANDATORY PLATFORM RULE ⛔

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ALL TRADING ANALYSIS MUST USE TRADINGVIEW - NO EXCEPTIONS                   ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ✅ PRIMARY URL: https://www.tradingview.com/chart/                          ║
║                                                                               ║
║   📁 SESSION AUTH: Use sessions/tv_auth.json for logged-in state              ║
║                                                                               ║
║   📊 INDICATORS (TV Free Tier - MAX 2):                                       ║
║      1. Smart Money Concepts [LuxAlgo]                                        ║
║      2. Liquidity Sweeps                                                      ║
║                                                                               ║
║   ⛔ FORBIDDEN:                                                               ║
║      - www.binance.com (REAL MONEY)                                           ║
║      - demo.binance.com (use TradingView instead)                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**SESSION HANDLING:**
```
TradingView Session (Required for chart analysis):
  File: sessions/tv_auth.json
  Maintains: Logged-in state with saved chart layouts
  Env: PLAYWRIGHT_MCP_STORAGE_STATE=sessions/tv_auth.json

X (Twitter) Session (Required for Layer 4 sentiment):
  File: sessions/x_auth.json
  Maintains: Logged-in X session for live scraping
  Capture: npm run capture-x-auth (if missing)
```

**X SESSION CHECK (Layer 4 Prerequisite):**
```
╔═══════════════════════════════════════════════════════════════════╗
║  BEFORE Layer 4 (Social Sentiment) analysis:                      ║
║                                                                   ║
║  1. Check if sessions/x_auth.json exists                          ║
║  2. If MISSING:                                                   ║
║     → Output warning: "⚠️ X session missing. Run: npm run         ║
║       capture-x-auth to enable sentiment analysis."               ║
║     → Skip Layer 4, proceed with Layers 1-3 only                  ║
║     → Note in output: "Social Pulse: N/A (session missing)"       ║
║  3. If EXISTS:                                                    ║
║     → Proceed with full Layer 4 analysis                          ║
║     → Navigate to X search for asset                              ║
║     → Scrape and analyze sentiment                                ║
╚═══════════════════════════════════════════════════════════════════╝
```

**URL VALIDATION (REQUIRED BEFORE EVERY ACTION):**
```
BEFORE clicking, typing, or interacting:
1. Check current URL
2. If URL contains "tradingview.com" → PROCEED
3. If URL contains "binance.com" → ABORT (wrong platform)
```

---

## CRITICAL: VISUAL BROWSER AUTOMATION ONLY

**The user MUST see all browser actions in real-time. This is non-negotiable.**

### REQUIRED Tools (Playwright MCP):
```
mcp__playwright__browser_navigate  - Open URLs visually
mcp__playwright__browser_wait      - Wait for page load
mcp__playwright__browser_click     - Click elements
mcp__playwright__browser_take_screenshot - Capture charts
mcp__playwright__browser_snapshot  - Get page state
```

### FORBIDDEN Tools for Trading Analysis:
```
WebFetch  - NEVER use for trading (invisible to user)
WebSearch - NEVER use for chart data (no visual)
curl      - NEVER use (command line, invisible)
```

### Why Browser-Only?
1. User can WATCH the analysis happen live
2. User can verify the correct charts are loaded
3. Screenshots provide visual proof
4. Builds trust through transparency

---

## PRIMARY EXECUTION ENVIRONMENT: BINANCE DEMO

**All trading analysis and execution is performed on Binance DEMO (Paper Trading).**

```
╔═══════════════════════════════════════════════════════════════════╗
║                    CRITICAL SAFETY RULE                           ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ✅ ONLY USE: https://demo.binance.com/en/*                       ║
║  ❌ NEVER USE: https://www.binance.com/* (REAL MONEY)             ║
║  ❌ NEVER USE: https://binance.com/* (REAL MONEY)                 ║
║                                                                   ║
║  If URL does not contain "demo.binance.com" → ABORT               ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Why Binance DEMO?
```
✅ Up to 5 indicators simultaneously (vs 3 on free TradingView)
✅ Integrated TradingView charts with pro features
✅ Paper Trading with virtual funds (NO REAL MONEY RISK)
✅ Real-time order book and trade execution practice
✅ Seamless transition from analysis to paper execution
✅ Safe environment to test strategies
```

### Primary URLs (DEMO ONLY)

```
SPOT TRADING (Default):
────────────────────────────────────────────────────────
Base URL: https://demo.binance.com/en/trade/[BASE]_[QUOTE]?type=spot

Examples:
  SOL/USDT:  https://demo.binance.com/en/trade/SOL_USDT?type=spot
  BTC/USDT:  https://demo.binance.com/en/trade/BTC_USDT?type=spot
  ETH/USDT:  https://demo.binance.com/en/trade/ETH_USDT?type=spot

FUTURES TRADING:
────────────────────────────────────────────────────────
Base URL: https://demo.binance.com/en/futures/[SYMBOL]

Examples:
  SOL Perpetual: https://demo.binance.com/en/futures/SOLUSDT
  BTC Perpetual: https://demo.binance.com/en/futures/BTCUSDT
```

### Binance Interface Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  BINANCE TRADING INTERFACE                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────┐  ┌────────────────────────┐  │
│  │                              │  │   ORDER BOOK           │  │
│  │     TRADINGVIEW CHART        │  │   (Live bids/asks)     │  │
│  │     (Center - Main Area)     │  │                        │  │
│  │                              │  ├────────────────────────┤  │
│  │   - Click "TradingView" tab  │  │   ORDER FORM           │  │
│  │   - Apply indicators here    │  │   [Buy] [Sell]         │  │
│  │   - MTF analysis area        │  │   Price: ____          │  │
│  │                              │  │   Amount: ____         │  │
│  └──────────────────────────────┘  │   [Mock Trading]       │  │
│                                     └────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TRADE HISTORY / OPEN ORDERS (Bottom)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CRITICAL: Popup & Dialog Handling

```
╔═══════════════════════════════════════════════════════════════════╗
║              BROWSER POPUP HANDLING - MUST DISMISS                ║
╠═══════════════════════════════════════════════════════════════════╣
║  These popups BLOCK chart interaction. Dismiss them FIRST!        ║
╚═══════════════════════════════════════════════════════════════════╝

POPUP TYPE 1: Chrome "Restore Pages" Dialog
────────────────────────────────────────────
Trigger: Browser crashed or was force-closed previously
Action: Click "No" or dismiss button
Selectors:
  - button:has-text("No")
  - button:has-text("Don't restore")
  - [data-testid="restore-no"]
  - Press Escape key

POPUP TYPE 2: Binance Notification Permission
─────────────────────────────────────────────
Text: "Binance wants to send you notifications"
Action: Click "Block" or "No thanks" or dismiss
Selectors:
  - button:has-text("Block")
  - button:has-text("No thanks")
  - button:has-text("Not now")
  - button:has-text("Maybe later")
  - [class*="notification-close"]
  - Press Escape key

POPUP TYPE 3: Cookie Consent Banner
───────────────────────────────────
Action: Accept or dismiss
Selectors:
  - button:has-text("Accept")
  - button:has-text("Accept All")
  - [class*="cookie-accept"]
  - [id*="cookie-accept"]

POPUP TYPE 4: Welcome/Tutorial Modal
────────────────────────────────────
Action: Close/Skip
Selectors:
  - button:has-text("Skip")
  - button:has-text("Got it")
  - button:has-text("Close")
  - [class*="modal-close"]
  - [aria-label="Close"]
  - .close-button

POPUP HANDLING WORKFLOW (Run BEFORE indicator setup):
═══════════════════════════════════════════════════════
1. After page loads, wait 2 seconds
2. Try to dismiss any visible popups using selectors above
3. Press Escape key to close any modal
4. Click outside any popup (body click)
5. THEN proceed with chart setup

Code Pattern:
─────────────
// Dismiss popups after navigation
await mcp__playwright__browser_wait({ time: 2000 })

// Try clicking dismiss buttons (ignore if not found)
try { await mcp__playwright__browser_click({ selector: 'button:has-text("No")' }) } catch {}
try { await mcp__playwright__browser_click({ selector: 'button:has-text("Block")' }) } catch {}
try { await mcp__playwright__browser_click({ selector: 'button:has-text("Not now")' }) } catch {}
try { await mcp__playwright__browser_click({ selector: '[aria-label="Close"]' }) } catch {}

// Press Escape to close any modal
await mcp__playwright__browser_press({ key: 'Escape' })
```

---

### Navigation Workflow

```
BINANCE_DEMO_NAVIGATION:
════════════════════════════════════════════════════════

STEP 0: URL Safety Check (MANDATORY)
─────────────────────────────────────
BEFORE ANY ACTION: Verify URL is demo.binance.com
If www.binance.com or binance.com → ABORT IMMEDIATELY

STEP 0.5: Dismiss Popups (REQUIRED)
───────────────────────────────────
After page load, dismiss any popups:
- Chrome "Restore pages" → Click "No"
- Notification requests → Click "Block" or "Not now"
- Cookie banners → Click "Accept"
- Tutorial modals → Click "Close" or press Escape

STEP 1: Navigate to Trading Pair (DEMO)
───────────────────────────────────────
Action: mcp__playwright__browser_navigate
URL: https://demo.binance.com/en/trade/SOL_USDT?type=spot
Wait: 3-4 seconds for full load

STEP 2: Verify DEMO URL
───────────────────────
Check: window.location.hostname === 'demo.binance.com'
If NOT demo.binance.com → ABORT and report

STEP 3: Switch to TradingView Chart
───────────────────────────────────
Action: mcp__playwright__browser_click
Selector: button:has-text("TradingView") OR [data-testid="tv-chart-tab"]
Wait: 2 seconds for chart to render

STEP 4: Verify Chart Loaded
───────────────────────────
Check: Canvas element visible
Selector: .chart-markup-table canvas OR [class*="chart-container"]

STEP 5: Open Indicators Panel
─────────────────────────────
Action: mcp__playwright__browser_click
Selector: [data-name="indicators"] OR button[aria-label="Indicators"]
Wait: 1 second for panel

════════════════════════════════════════════════════════
```

### Binance Key Selectors

```
CHART CONTROLS:
───────────────
TradingView Tab:     button:has-text("TradingView")
                     [data-testid="tv-chart-tab"]
Original Chart:      button:has-text("Original")
Depth Chart:         button:has-text("Depth")
Timeframe Buttons:   [data-value="240"] (4H), [data-value="60"] (1H)
Indicators:          [data-name="indicators"]
Fullscreen:          [data-name="fullscreen"]

PRICE DISPLAY:
──────────────
Current Price:       .showPrice, [class*="showPrice"]
Price Change:        .priceChangePercent, [class*="tickerPriceChange"]
24h High:            [class*="high"]
24h Low:             [class*="low"]
Volume:              [class*="volume"]

ORDER FORM:
───────────
Buy Button:          [data-testid="trade-buy"], button:has-text("Buy")
Sell Button:         [data-testid="trade-sell"], button:has-text("Sell")
Price Input:         input[name="price"], [data-testid="price-input"]
Amount Input:        input[name="amount"], [data-testid="amount-input"]
Total Display:       [class*="total"]
Limit Tab:           button:has-text("Limit")
Market Tab:          button:has-text("Market")

MOCK TRADING:
─────────────
Mock Trading Toggle: button:has-text("Mock Trading")
                     [data-testid="mock-trading"]
                     [class*="mockTrading"]
Demo Mode Indicator: [class*="demo"], span:has-text("Demo")
```

### Authentication Requirement

```
AUTH_CHECK (Before Binance Operations):
════════════════════════════════════════════════════════
1. Check if sessions/binance_auth.json exists
2. If YES → Session loaded automatically
3. If NO → Limited functionality (view-only, no trading)

To capture Binance auth:
→ Run: npm run capture-binance-auth
→ Or: node scripts/capture-binance-auth.js

IMPORTANT: Mock Trading requires authenticated session!
════════════════════════════════════════════════════════
```

---

## CRITICAL: TECHNICAL INDICATOR SETUP PROTOCOL (BINANCE - 5 INDICATORS)

**Before ANY analysis, the following indicators MUST be applied to the chart.**

### Mandatory Indicator Stack (5 Indicators - Binance Limit)

```
┌─────────────────────────────────────────────────────────────────┐
│         REQUIRED INDICATORS - BINANCE (Apply in Order)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Smart Money Concepts [LuxAlgo]                              │
│     → Auto-detects BOS, CHoCH, Order Blocks, FVGs               │
│     → Provides visual confirmation of structure                 │
│     → PRIMARY indicator for entry signals                       │
│                                                                 │
│  2. Liquidity Sweeps [LuxAlgo or equivalent]                    │
│     → Identifies high/low sweeps (stop hunts)                   │
│     → Shows where retail stops were captured                    │
│     → Confirms Smart Money activity                             │
│                                                                 │
│  3. Volume Profile (Fixed Range)                                │
│     → Identifies Point of Control (POC)                         │
│     → Shows high-volume nodes for confluence                    │
│     → Use "Fixed Range" for specific analysis zones             │
│                                                                 │
│  4. EMA 200 (Exponential Moving Average)                        │
│     → Long-term trend confirmation                              │
│     → Price above EMA 200 = Bullish bias                        │
│     → Price below EMA 200 = Bearish bias                        │
│     → Dynamic support/resistance level                          │
│                                                                 │
│  5. [OPTIONAL] RSI or MACD                                      │
│     → Momentum confirmation                                     │
│     → Divergence detection                                      │
│     → Use if 5th slot available                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### EMA 200 Integration Rules

```
EMA 200 TREND FILTER:
════════════════════════════════════════════════════════

BULLISH BIAS (Price ABOVE EMA 200):
  → Only consider LONG positions
  → EMA 200 acts as dynamic support
  → Pullbacks to EMA 200 = potential buy zone
  → Adds +1 to confluence score

BEARISH BIAS (Price BELOW EMA 200):
  → Only consider SHORT positions
  → EMA 200 acts as dynamic resistance
  → Rallies to EMA 200 = potential sell zone
  → Adds +1 to confluence score

NEUTRAL (Price CROSSING EMA 200):
  → Trend transition zone
  → Wait for clear break and retest
  → Higher risk - reduce position size

════════════════════════════════════════════════════════
```

### Indicator Setup Workflow (Binance TradingView)

**Execute these steps BEFORE capturing analysis screenshots:**

```
STEP 1: Open Indicators Menu
─────────────────────────────
Action: mcp__playwright__browser_click
Selector: [data-name="indicators"] OR button[aria-label="Indicators"]
Alt: Press "/" key to open search
Wait: 1 second for panel to open

STEP 2: Apply Smart Money Concepts [LuxAlgo]
─────────────────────────────────────────────
1. Type in search: "Smart Money Concepts"
2. Select: "Smart Money Concepts [LuxAlgo]"
3. Wait for indicator to load (2-3 seconds)
4. Verify: BOS/CHoCH labels appear on chart
5. Close indicator panel (click X or outside)

STEP 3: Apply Liquidity Sweeps
──────────────────────────────
1. Open Indicators menu again
2. Type in search: "Liquidity Sweeps"
3. Select: "Liquidity Sweeps [LuxAlgo]" or similar
4. Verify: Sweep markers appear at highs/lows
5. Close indicator panel

STEP 4: Apply Volume Profile (Fixed Range)
──────────────────────────────────────────
1. Open Indicators menu again
2. Type in search: "Volume Profile"
3. Select: "Volume Profile Fixed Range" (preferred) or "Visible Range"
4. Verify: Volume histogram appears on price axis
5. Identify: POC (Point of Control) - longest bar
6. Close indicator panel

STEP 5: Apply EMA 200
─────────────────────
1. Open Indicators menu again
2. Type in search: "EMA" or "Exponential Moving Average"
3. Select: "Moving Average Exponential"
4. Configure: Length = 200
5. Verify: EMA line appears on chart (typically blue/orange)
6. Note: Price position relative to EMA 200
7. Close indicator panel

STEP 6: [OPTIONAL] Apply RSI or MACD
────────────────────────────────────
1. If 5th indicator slot available
2. Type in search: "RSI" or "MACD"
3. Select: "Relative Strength Index" or "MACD"
4. Keep default settings
5. Verify: Indicator appears in separate pane below chart
```

### TradingView Indicator Selectors

```
Indicators Button:
  [data-name="indicators"]
  button[aria-label="Indicators"]
  .tv-header__button--indicators

Search Input:
  input[data-role="search"]
  .tv-search__input
  #indicator-search-input

Indicator List Items:
  .tv-insert-indicator-dialog__item
  [data-name="indicator-item"]

Apply/Add Button:
  button:has-text("Add")
  .tv-dialog__button--primary
```

### Indicator Verification Checklist

```
INDICATOR_SETUP_CHECK (Binance - 5 Indicators):
══════════════════════════════════════════════════════════

[ ] 1. LuxAlgo SMC Applied
    └─ BOS labels visible: [Yes/No]
    └─ CHoCH labels visible: [Yes/No]
    └─ Order Blocks drawn: [Yes/No]
    └─ FVGs highlighted: [Yes/No]

[ ] 2. Liquidity Sweeps Applied
    └─ Sweep markers at highs: [Yes/No]
    └─ Sweep markers at lows: [Yes/No]
    └─ Recent sweep detected: [Yes/No/None]

[ ] 3. Volume Profile (Fixed Range) Applied
    └─ POC line visible: [Yes/No]
    └─ POC price level: $[exact price]
    └─ High-volume nodes: $[levels]

[ ] 4. EMA 200 Applied
    └─ EMA line visible: [Yes/No]
    └─ EMA 200 value: $[exact price]
    └─ Price position: [ABOVE / BELOW / CROSSING]
    └─ Trend bias: [BULLISH / BEARISH / NEUTRAL]

[ ] 5. RSI/MACD (Optional)
    └─ Indicator visible: [Yes/No/Skipped]
    └─ Current reading: [value]

TOTAL INDICATORS: [X/5]
If ANY core indicator (1-4) fails to load → RETRY or REPORT
══════════════════════════════════════════════════════════
```

---

## THE GOLD STANDARD: MULTI-STEP CONFIRMATION LOGIC

**A trade thesis is ONLY valid if ALL FIVE conditions are confirmed.**

### The Five Pillars of Confirmation (Binance Enhanced)

```
╔═══════════════════════════════════════════════════════════════════╗
║              GOLD STANDARD CHECKLIST (6 PILLARS)                  ║
║                                                                   ║
║   ALL FIVE must be ✅ for maximum probability trade               ║
║   Minimum 4/5 required to approve thesis                          ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  1. STRUCTURE ────────────────────────────────────────────────    ║
║     └─ LuxAlgo confirms BOS or CHoCH                              ║
║     └─ Direction ALIGNS with 4H trend                             ║
║     └─ Status: [ ] ✅ Confirmed  [ ] ❌ Not Found                 ║
║                                                                   ║
║  2. LIQUIDITY ────────────────────────────────────────────────    ║
║     └─ Recent Liquidity Sweep detected                            ║
║     └─ Retail stops have been captured                            ║
║     └─ Sweep occurred BEFORE current price action                 ║
║     └─ Status: [ ] ✅ Sweep Confirmed  [ ] ❌ No Sweep            ║
║                                                                   ║
║  3. POI (Point of Interest) ──────────────────────────────────    ║
║     └─ Price is IN or APPROACHING a valid zone                    ║
║     └─ Zone type: Order Block / FVG / OB+FVG Confluence           ║
║     └─ Zone is UNMITIGATED (never touched before)                 ║
║     └─ Status: [ ] ✅ Valid POI  [ ] ❌ No POI                    ║
║                                                                   ║
║  4. VOLUME ───────────────────────────────────────────────────    ║
║     └─ Entry aligns with POC or high-volume node                  ║
║     └─ Volume supports the expected move direction                ║
║     └─ Status: [ ] ✅ Volume Aligned  [ ] ❌ Volume Weak          ║
║                                                                   ║
║  5. EMA 200 TREND ────────────────────────────────────────────    ║
║     └─ Price position relative to EMA 200 confirmed               ║
║     └─ LONG: Price ABOVE EMA 200                                  ║
║     └─ SHORT: Price BELOW EMA 200                                 ║
║     └─ Trade direction matches EMA bias                           ║
║     └─ Status: [ ] ✅ EMA Aligned  [ ] ❌ EMA Conflict            ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║  FINAL VERDICT:                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ 5/5 Confirmed → ✅ PERFECT SETUP - Full position size       │  ║
║  │ 4/5 Confirmed → ✅ GOLD STANDARD - Approve thesis           │  ║
║  │ 3/5 Confirmed → ⚠️ WEAK SETUP - Reduce size 50%             │  ║
║  │ 2/5 or less   → ❌ NO TRADE - Do not approve thesis         │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Indicator Consensus Rating

```
INDICATOR_CONSENSUS (Binance 6-Pillar):
════════════════════════════════════════════════════════
Pillar              │ Status      │ Indicator Source
════════════════════════════════════════════════════════
1. Structure        │ [✅/❌]     │ LuxAlgo SMC
2. Liquidity Sweep  │ [✅/❌]     │ Liquidity Sweeps
3. POI Valid        │ [✅/❌]     │ LuxAlgo SMC (OB/FVG)
4. Volume Aligned   │ [✅/❌]     │ Volume Profile POC
5. EMA 200 Trend    │ [✅/❌]     │ EMA 200
════════════════════════════════════════════════════════
Confirmed: [X/5]
Consensus: [PERFECT (5/5) / CONFIRMED (4/5) / WEAK (3/5) / NO MATCH (≤2/5)]
════════════════════════════════════════════════════════
```

---

## PRECISION LABELING PROTOCOL

**NEVER estimate price levels. Extract EXACT values from the chart.**

### Hover-to-Extract Method

```
For EVERY price level (POI, SL, TP), you MUST:

1. HOVER over the zone/line on the chart
   → mcp__playwright__browser_hover on the element
   → Wait 0.5s for tooltip to appear

2. READ the exact price from:
   → Tooltip popup
   → Price scale on right axis
   → Indicator label (LuxAlgo shows prices)

3. RECORD the EXACT value
   → No rounding
   → No estimation
   → Copy the displayed price exactly
```

### Price Extraction Workflow

```
PRECISION_EXTRACTION:
════════════════════════════════════════════════════════

1. ORDER BLOCK ZONE:
   Action: Hover over OB rectangle drawn by LuxAlgo
   Extract: Upper edge: $[exact] | Lower edge: $[exact]
   Method: Read from indicator label or tooltip

2. FVG ZONE:
   Action: Hover over FVG highlighted area
   Extract: Upper: $[exact] | Lower: $[exact]
   Method: Read from shaded zone boundaries

3. STOP LOSS LEVEL:
   Action: Hover over invalidation point
   Extract: $[exact price]
   Rule: Below OB for longs, Above OB for shorts
   Method: Use price scale crosshair

4. TAKE PROFIT LEVELS:
   Action: Hover over liquidity/target zones
   Extract: TP1: $[exact] | TP2: $[exact] | TP3: $[exact]
   Method: Use sweep markers or POC line

5. CURRENT PRICE:
   Action: Read from chart header or last candle
   Extract: $[exact price with decimals]

════════════════════════════════════════════════════════
```

### Crosshair Usage for Precision

```
To get exact prices:

1. Enable crosshair mode (press "+")
2. Move crosshair to target level
3. Read price from right axis label
4. Screenshot with crosshair for proof
   → mcp__playwright__browser_take_screenshot
   → Shows exact price at crosshair position
```

---

## CRITICAL: MULTI-TIMEFRAME (MTF) CONSENSUS PROTOCOL

**This is a HARD REQUIREMENT. No exceptions. No shortcuts.**

### The Law of Top-Down Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│  4H CHART (Higher Timeframe) = THE BOSS                        │
│  ─────────────────────────────────────────────────────────────  │
│  • Determines OVERALL market structure (Bullish/Bearish)        │
│  • Identifies MAJOR Order Blocks and FVGs                       │
│  • Sets the ALLOWED trade direction                             │
│  • MUST be analyzed FIRST - always                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    4H Bias Established
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  1H/15M CHART (Lower Timeframe) = THE EXECUTOR                  │
│  ─────────────────────────────────────────────────────────────  │
│  • Finds PRECISE entry zones (OB/FVG)                           │
│  • Confirms structure ALIGNMENT with 4H                         │
│  • Can ONLY suggest trades in 4H direction                      │
│  • MUST be analyzed SECOND - never first                        │
└─────────────────────────────────────────────────────────────────┘
```

### Mandatory Navigation Sequence

**STEP 1: 4H Analysis (ALWAYS FIRST)**
```
1. Navigate to TradingView with asset
2. Set timeframe to 4H
3. Take screenshot: [ASSET]_4H_analysis.png
4. Determine: Is 4H BULLISH or BEARISH?
   - Look for series of BOS (Higher Highs or Lower Lows)
   - Identify last major swing points
   - Mark unmitigated POIs
5. LOCK IN the 4H bias before proceeding
```

**STEP 2: 1H/15M Analysis (ONLY AFTER 4H)**
```
1. Switch to 1H (or 15m for precision)
2. Take screenshot: [ASSET]_1H_analysis.png
3. Check: Does 1H structure ALIGN with 4H?
4. Find entry POI that respects 4H direction
5. If conflict detected → ABORT trade thesis
```

### NO CONFLICT RULE (Absolute Law)

```
╔═══════════════════════════════════════════════════════════════════╗
║                    TRADE DIRECTION MATRIX                         ║
╠═══════════════════════════════════════════════════════════════════╣
║  4H Trend    │  1H Shows    │  ALLOWED Action                     ║
╠══════════════╪══════════════╪═════════════════════════════════════╣
║  BULLISH     │  Bullish     │  ✅ LONG - Full alignment           ║
║  BULLISH     │  Bearish     │  ⏳ WAIT - Pullback expected        ║
║  BULLISH     │  Long setup  │  ✅ LONG - Take the trade           ║
║  BULLISH     │  Short setup │  ❌ PROHIBITED - Do NOT short       ║
╠══════════════╪══════════════╪═════════════════════════════════════╣
║  BEARISH     │  Bearish     │  ✅ SHORT - Full alignment          ║
║  BEARISH     │  Bullish     │  ⏳ WAIT - Pullback expected        ║
║  BEARISH     │  Short setup │  ✅ SHORT - Take the trade          ║
║  BEARISH     │  Long setup  │  ❌ PROHIBITED - Do NOT long        ║
╠══════════════╪══════════════╪═════════════════════════════════════╣
║  RANGING     │  Any         │  ⚠️ CAUTION - Range trade only      ║
╚══════════════╧══════════════╧═════════════════════════════════════╝
```

**HARD RULES:**
- If 4H is BEARISH → You are PROHIBITED from suggesting a LONG position
- If 4H is BULLISH → You are PROHIBITED from suggesting a SHORT position
- Even if 15m looks "perfect" for opposite direction → REJECT IT
- The 4H trend is LAW. The LTF finds entries within that law.

### Timeframe Alignment Verification

Before generating ANY trade thesis, you MUST complete this check:

```
MTF_ALIGNMENT_CHECK:
==================================================
Asset: [SYMBOL]
Timestamp: [ISO]

4H ANALYSIS (Screenshot Required):
├─ Trend Direction: [BULLISH / BEARISH / RANGING]
├─ Last BOS: $[price] - [Date]
├─ Structure: [HH/HL = Bullish | LH/LL = Bearish]
└─ 4H Bias Locked: [LONG ONLY / SHORT ONLY / NEUTRAL]

1H ANALYSIS (Screenshot Required):
├─ LTF Trend: [Bullish / Bearish / Ranging]
├─ Alignment with 4H: [✅ ALIGNED / ❌ CONFLICTING]
├─ Entry POI Found: [Yes/No]
└─ POI Respects 4H Bias: [Yes/No]

CONSENSUS RESULT:
┌────────────────────────────────────────────────┐
│ [ ] ✅ ALIGNED - Proceed with trade thesis     │
│ [ ] ❌ CONFLICTING - No trade recommendation   │
│ [ ] ⏳ WAIT - Timeframes not in sync yet       │
└────────────────────────────────────────────────┘
==================================================
```

### Market Disconnect Protocol

**When timeframes CONFLICT, output this EXACTLY:**

```
⚠️ MARKET DISCONNECT - NO TRADE RECOMMENDATION ⚠️
==================================================
Asset: [SYMBOL]
Analysis Time: [ISO]

CONFLICT DETECTED:
- 4H Structure: [BEARISH/BULLISH]
- 1H Structure: [opposite direction]

REASON FOR NO TRADE:
The higher timeframe (4H) shows [direction] structure,
but the lower timeframe (1H) is showing [opposite] signals.

Trading against the HTF trend has negative expectancy.
We do NOT fight the market structure.

RECOMMENDED ACTION:
→ Wait for 1H to realign with 4H trend
→ Or wait for 4H CHoCH to confirm reversal
→ Check back in [X] hours

NO ENTRY. NO THESIS. PATIENCE.
==================================================
```

### Visual Confirmation Requirement

**BOTH screenshots are MANDATORY before any thesis:**

```
SCREENSHOT_CHECKLIST:
[ ] 4H Chart captured → File: [path]
[ ] 4H Trend identified → [Bullish/Bearish]
[ ] 1H Chart captured → File: [path]
[ ] 1H Alignment verified → [Aligned/Conflict]
[ ] Both screenshots compared side-by-side
[ ] MTF Consensus determined

If ANY checkbox is missing → STOP. Complete the analysis.
```

---

## Core Philosophy

**"Trade where Smart Money trades, not where retail gets trapped."**

- Enter ONLY at high-probability institutional levels (Order Blocks, FVGs)
- Require structure confirmation (BOS/CHoCH) before any thesis
- Target minimum 1:3 Risk-Reward ratio
- Accept that not every setup triggers - patience over frequency

## Mandatory Protocol

**Before ANY SMC analysis:**
1. Create a tactical plan using `tactical-planning` skill
2. Capture BOTH 4H and 1H timeframe charts
3. Identify structure (trend direction via BOS)
4. Mark all Points of Interest (POIs)
5. Define exact invalidation levels
6. Log to KnowledgeBase for learning loop

---

## SMC Core Concepts

### 1. Market Structure

**Break of Structure (BOS)** - Confirms trend continuation
```
BULLISH BOS: Price breaks above previous swing high
BEARISH BOS: Price breaks below previous swing low

Visual Pattern:
Bullish:  LH → HH (higher high confirms uptrend)
Bearish:  HL → LL (lower low confirms downtrend)
```

**Change of Character (CHoCH)** - Signals potential reversal
```
BULLISH CHoCH: In downtrend, price breaks above a swing high
BEARISH CHoCH: In uptrend, price breaks below a swing low

This is the FIRST sign of potential trend change.
```

### 2. Order Blocks (OB)

**Definition:** The last candle before an impulsive move that broke structure. This is where institutions placed their orders.

**Bullish Order Block:**
```
- Last DOWN candle before a BOS to the upside
- Mark the candle's body (open to close)
- Price is expected to return here and bounce UP
```

**Bearish Order Block:**
```
- Last UP candle before a BOS to the downside
- Mark the candle's body (open to close)
- Price is expected to return here and drop DOWN
```

**Order Block Validity:**
- Must have caused a BOS
- Unmitigated (price hasn't returned to it yet)
- Preferably on HTF (4H) for stronger levels

### 3. Fair Value Gaps (FVG) / Imbalances

**Definition:** A 3-candle pattern where the wicks of candle 1 and candle 3 don't overlap, leaving a "gap" that price tends to fill.

```
BULLISH FVG (in uptrend):
Candle 1: High = $100
Candle 2: Large bullish candle
Candle 3: Low = $105
GAP: $100 - $105 (price likely returns here)

BEARISH FVG (in downtrend):
Candle 1: Low = $100
Candle 2: Large bearish candle
Candle 3: High = $95
GAP: $95 - $100 (price likely returns here)
```

### 4. Liquidity Pools

**Definition:** Areas where stop losses cluster - Smart Money hunts these before reversing.

```
BUYSIDE LIQUIDITY (BSL): Equal highs, obvious resistance
- Retail shorts place stops above these
- Smart Money pushes price UP to grab stops, then reverses DOWN

SELLSIDE LIQUIDITY (SSL): Equal lows, obvious support
- Retail longs place stops below these
- Smart Money pushes price DOWN to grab stops, then reverses UP
```

### 5. Premium vs Discount Zones

```
Calculate using the range from swing low to swing high:

PREMIUM ZONE (50-100%): Expensive - look for SELLS
EQUILIBRIUM (50%): Fair value
DISCOUNT ZONE (0-50%): Cheap - look for BUYS

Rule: Buy in discount, sell in premium.
```

---

## Multi-Timeframe Visual Scan Protocol

### Step 1: Capture 4H Chart (Higher Timeframe - HTF)

```
1. Navigate to Binance DEMO (NOT TradingView)
   → mcp__playwright__browser_navigate("https://demo.binance.com/en/trade/BTC_USDT?type=spot")
   → Wait 3-4 seconds for full load
   → VERIFY URL is demo.binance.com (ABORT if not)

2. Set timeframe to 4H
   → Click timeframe selector
   → Select "4H" or "4 hours"

3. Zoom out to see 50-100 candles
   → Identify overall trend direction

4. Take screenshot
   → mcp__playwright__browser_take_screenshot
   → Save as: screenshots/trading/[ASSET]_4H_[timestamp].png
```

**On 4H Chart, identify:**
- [ ] Overall trend (series of BOS)
- [ ] Unmitigated Order Blocks
- [ ] Major FVGs
- [ ] Liquidity pools (equal highs/lows)
- [ ] Premium/Discount zones

### Step 2: Capture 1H Chart (Lower Timeframe - LTF)

```
1. Change timeframe to 1H
   → Click timeframe selector
   → Select "1H" or "1 hour"

2. Zoom to recent 30-50 candles
   → Focus on current price action

3. Take screenshot
   → mcp__playwright__browser_take_screenshot
   → Save as: screenshots/trading/[ASSET]_1H_[timestamp].png
```

**On 1H Chart, identify:**
- [ ] LTF structure within HTF trend
- [ ] Entry Order Blocks (more precise)
- [ ] Entry FVGs
- [ ] Immediate liquidity targets

---

## SMC Trade Setup Structure

### Required Elements for Valid Setup

```
SMC_SETUP:
==================================================
Asset: [SYMBOL]
Timestamp: [ISO]
Screenshots: [4H_path], [1H_path]

1. STRUCTURE ANALYSIS (4H)
   - Trend Direction: [Bullish/Bearish]
   - Last BOS Level: $[price]
   - Last CHoCH Level: $[price] (if any)
   - Structure Status: [Trending/Ranging/Reversing]

2. POINT OF INTEREST (POI)
   - Type: [Order Block / FVG / OB+FVG Confluence]
   - Timeframe: [4H/1H]
   - Zone: $[upper] - $[lower]
   - Status: [Unmitigated/Fresh]
   - Distance from current price: [X%]

3. LIQUIDITY ANALYSIS
   - BSL (Buyside Liquidity): $[levels]
   - SSL (Sellside Liquidity): $[levels]
   - Expected sweep: [BSL/SSL] before reversal

4. ENTRY MODEL
   - Entry Zone: $[price range]
   - Entry Trigger: [LTF BOS into POI / FVG fill / OB touch]
   - Confirmation needed: [1H CHoCH / 15m BOS]

5. RISK MANAGEMENT
   - Invalidation (Stop Loss): $[price]
   - Reason: [Below OB / Above FVG / Structure break]
   - Risk: [X%] of position

6. TARGETS
   - TP1: $[price] - [Nearest liquidity / 1:2 RR]
   - TP2: $[price] - [Major liquidity / 1:3 RR]
   - TP3: $[price] - [HTF target / 1:5 RR]

7. RISK:REWARD CALCULATION
   - Entry: $[price]
   - Stop: $[price]
   - TP1: $[price] → RR = [X:1]
   - TP2: $[price] → RR = [X:1]
   - Minimum acceptable: 1:3

8. CONFLUENCE SCORE
   - HTF Trend alignment: [+1 if aligned]
   - OB present: [+1]
   - FVG present: [+1]
   - Liquidity nearby: [+1]
   - Premium/Discount correct: [+1]
   - Total: [X/5] - [High/Medium/Low probability]

9. TRADE PLAN STATUS
   - Status: [Waiting for price / Active / Invalidated]
   - Alert set at: $[price]
==================================================
```

---

## Tactical Planning Integration

**CRITICAL:** Before proposing ANY trade setup, create a tactical plan:

```
BRIDGE_SIGNAL:PLAN_CREATED
{
  "planId": "SMC-[6 chars]",
  "goal": "SMC Analysis for [ASSET]",
  "category": "trading",
  "steps": 8,
  "estimatedActions": 12
}

TACTICAL PLAN STEPS:
1. Capture 4H chart screenshot
2. Analyze 4H structure (BOS/CHoCH)
3. Mark 4H POIs (OBs, FVGs)
4. Capture 1H chart screenshot
5. Analyze 1H structure
6. Mark 1H entry zones
7. Calculate R:R and invalidation
8. Generate SMC Setup report
```

---

## Knowledge Loop: Learning from Failures

### When a Setup Fails

If price hits invalidation (stop loss), invoke `self-correction` skill:

```
SETUP_FAILURE_ANALYSIS:
==================================================
Failed Setup ID: [SMC-XXXXXX]
Asset: [SYMBOL]
Direction: [Long/Short]
Entry: $[price]
Invalidation Hit: $[price]
Loss: [X%]

ROOT CAUSE ANALYSIS:
1. Was the OB mitigated before entry?
   - [ ] Yes → Lesson: Wait for fresh OB only
   - [ ] No → Check other factors

2. Was there HTF liquidity above/below?
   - [ ] Yes → Lesson: Price swept HTF liquidity first
   - [ ] No → Check other factors

3. Was structure actually broken?
   - [ ] Weak BOS (small move) → Lesson: Require strong BOS
   - [ ] Valid BOS → Check other factors

4. Was entry in correct zone?
   - [ ] Premium for short? Discount for long?
   - [ ] Entry was in wrong zone → Lesson: Respect P/D

5. Was there opposing HTF POI?
   - [ ] 4H/Daily OB in opposite direction?
   - [ ] Yes → Lesson: HTF POI overrides LTF

CORRECTIVE ACTION:
- Update analysis criteria
- Log to KnowledgeBase for pattern recognition
- Adjust confluence requirements
==================================================
```

### Save to KnowledgeBase

```
KNOWLEDGE_SAVE:
{
  "task_type": "smc_setup",
  "asset": "[SYMBOL]",
  "setup_type": "[OB/FVG/Confluence]",
  "direction": "long|short",
  "entry": [price],
  "invalidation": [price],
  "targets": [prices],
  "rr_ratio": [X],
  "confluence_score": [X/5],
  "outcome": "pending|win|loss|breakeven",
  "failure_reason": "[if loss]",
  "lesson_learned": "[if loss]",
  "timestamp": "[ISO]"
}
```

---

## Visual Analysis Checklist

When analyzing chart screenshots:

```
4H CHART CHECKLIST:
[ ] Identified last 3 BOS levels
[ ] Marked trend direction arrow
[ ] Drew unmitigated Order Blocks
[ ] Highlighted Fair Value Gaps
[ ] Marked equal highs (BSL)
[ ] Marked equal lows (SSL)
[ ] Calculated Premium/Discount zones

1H CHART CHECKLIST:
[ ] Confirmed alignment with 4H trend
[ ] Found entry Order Block within 4H POI
[ ] Identified entry FVG
[ ] Marked LTF liquidity
[ ] Defined exact entry zone
[ ] Set invalidation level
[ ] Calculated R:R ratio
```

---

## TradingView Navigation for SMC

### Timeframe Selection
```
Selectors for timeframe:
- Button: [data-value="240"] for 4H
- Button: [data-value="60"] for 1H
- Button: [data-value="15"] for 15m
- Dropdown: .item-2IihgTnv (timeframe menu)
```

### Drawing Tools (if interactive)
```
- Rectangle: For Order Blocks
- Ray: For trend lines
- Horizontal Line: For liquidity levels
```

### Chart Navigation
```
- Zoom out: Scroll or pinch
- Pan: Click and drag
- Reset: Double-click
```

---

## Output Formats

### Quick SMC Scan
```
SMC_SCAN: [ASSET]
Trend (4H): [Bullish/Bearish]
Nearest POI: [OB/FVG] at $[price]
Distance: [X%] away
Action: [Wait for pullback / In zone / No setup]
```

### Full SMC Setup
Use the complete SMC_SETUP structure above.

### Alert Format
```
SMC_ALERT: [ASSET]
POI Approaching: [OB/FVG] at $[price]
Current: $[price]
Distance: [X%]
Expected reaction: [Bounce/Rejection]
Invalidation: $[price]
```

---

## Integration Points

### With tactical-planning
- ALWAYS create plan before analysis
- Define POI and invalidation in plan steps
- Use BRIDGE_SIGNAL for progress

### With web-operator
- Capture both 4H and 1H screenshots
- Use stealth timing between actions
- Handle TradingView popups

### With self-correction
- Analyze failed setups
- Update OB/FVG identification criteria
- Learn from mitigated levels

### With KnowledgeBase
- Save every setup (win/loss/pending)
- Track win rate by setup type
- Query past setups for similar conditions

---

## Important Rules

1. **HTF First** - Always start with 4H, then refine on 1H
2. **Structure is King** - No trade without clear BOS
3. **Unmitigated Only** - Only trade fresh OBs and FVGs
4. **Minimum 1:3 RR** - Never compromise on risk:reward
5. **Confluence Matters** - More confluence = higher probability
6. **Log Everything** - Every setup to KnowledgeBase
7. **Learn from Losses** - Always run failure analysis
8. **Patience > Frequency** - Wait for A+ setups only
9. **No FOMO** - If you missed the entry, wait for next setup
10. **Risk First** - Define invalidation BEFORE entry

---

## RISK-ADJUSTED SIGNAL PROTOCOL (RASP)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║              RISK-ADJUSTED SIGNAL PROTOCOL - EXECUTION READINESS              ║
║                                                                               ║
║  This protocol calculates leverage, position size, and outputs trade signals  ║
║  in a standardized format for future automated execution.                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 1. Risk Calculation Engine (MANDATORY)

**When TradingExpert persona is active, ALWAYS calculate these parameters:**

```
LEVERAGE FORMULA:
═══════════════════════════════════════════════════════════════

                    Max Risk (%)
    Leverage = ──────────────────────────
               Distance to Stop Loss (%)

EXAMPLE:
    - Max Risk: 2% of portfolio
    - Entry: $200.00
    - Stop Loss: $196.00
    - Distance to SL: ($200 - $196) / $200 = 2%
    - Leverage = 2% / 2% = 1x

EXAMPLE 2:
    - Max Risk: 2%
    - Entry: $200.00
    - Stop Loss: $199.00
    - Distance to SL: 0.5%
    - Leverage = 2% / 0.5% = 4x

CONSTRAINTS:
═══════════════════════════════════════════════════════════════
⛔ MAX LEVERAGE CAP: 20x (NEVER exceed, even if math allows)
⚠️ RECOMMENDED MAX: 10x for high conviction setups
✅ SAFE ZONE: 1x-5x for standard setups

POSITION SIZING (Default $1,000 Portfolio):
═══════════════════════════════════════════════════════════════
Position Size ($) = Portfolio × Risk % × Leverage

EXAMPLE:
    - Portfolio: $1,000
    - Risk: 2%
    - Leverage: 5x
    - Position Size = $1,000 × 0.02 × 5 = $100

RISK:REWARD CALCULATION:
═══════════════════════════════════════════════════════════════
    R:R Ratio = (TP Price - Entry) / (Entry - SL Price)  [LONG]
    R:R Ratio = (Entry - TP Price) / (SL Price - Entry)  [SHORT]

⛔ MINIMUM R:R: 1:2 (Never take less)
✅ TARGET R:R: 1:3 or better
🎯 IDEAL R:R: 1:5+ (A+ setups only)
```

### 2. Decision Tree: SIGNAL vs WAIT

```
DECISION_TREE:
═══════════════════════════════════════════════════════════════

START
  │
  ├─► SMC Structure Analysis
  │     │
  │     ├─► HTF (4H) Trend Clear?
  │     │     │
  │     │     ├─► NO  → [WAIT] "No clear HTF trend"
  │     │     │
  │     │     └─► YES → Continue
  │     │
  │     ├─► LTF (1H) Aligned with HTF?
  │     │     │
  │     │     ├─► NO  → [WAIT] "LTF/HTF misalignment"
  │     │     │
  │     │     └─► YES → Continue
  │     │
  │     ├─► Unmitigated POI Identified?
  │     │     │
  │     │     ├─► NO  → [WAIT] "No valid POI zone"
  │     │     │
  │     │     └─► YES → Continue
  │     │
  │     └─► Liquidity Sweep Confirmed?
  │           │
  │           ├─► NO  → [WAIT] "Awaiting liquidity sweep"
  │           │
  │           └─► YES → PROCEED TO SIGNAL CHECK
  │
  ├─► Conviction Assessment
  │     │
  │     ├─► Confluence Score ≥ 4/5?
  │     │     │
  │     │     ├─► NO  → [WAIT] "Insufficient confluence"
  │     │     │
  │     │     └─► YES → Continue
  │     │
  │     ├─► R:R Ratio ≥ 1:2?
  │     │     │
  │     │     ├─► NO  → [WAIT] "R:R below minimum"
  │     │     │
  │     │     └─► YES → Continue
  │     │
  │     └─► EMA 200 Alignment?
  │           │
  │           ├─► CONFLICT → [WAIT] "Price against EMA 200 trend"
  │           │
  │           └─► ALIGNED → ✅ [SIGNAL] OUTPUT
  │
  └─► END

═══════════════════════════════════════════════════════════════
```

**Output Rules:**

```
[SIGNAL] OUTPUT CONDITIONS:
───────────────────────────
✅ All Decision Tree checks PASS
✅ Confluence Score ≥ 4/5
✅ Liquidity Sweep CONFIRMED
✅ R:R ≥ 1:2
✅ Leverage calculated and ≤ 20x
→ OUTPUT: Full signal with all parameters

[WAIT] OUTPUT CONDITIONS:
───────────────────────────
❌ ANY Decision Tree check FAILS
→ OUTPUT: "WAIT" + single reason
→ DO NOT provide entry, SL, TP, or leverage
→ Example: "WAIT: Awaiting liquidity sweep before entry"
```

### 3. Data Persistence (CRITICAL)

**Before sending WhatsApp signal, ALWAYS save to KnowledgeBase:**

```javascript
// MANDATORY: Save signal data for automated execution phase
KnowledgeBase.saveLesson({
  task_type: "trade_signal",
  signal_type: "SIGNAL" | "WAIT",
  asset: "SOL/USDT",
  side: "LONG" | "SHORT",
  entry: 198.50,
  stop_loss: 195.00,
  take_profit_1: 205.00,
  take_profit_2: 212.00,
  take_profit_3: 220.00,
  leverage: 5,
  position_size_usd: 100,
  risk_percent: 2,
  rr_ratio: 3.5,
  confluence_score: 4,
  liquidity_swept: true,
  ema_200_aligned: true,
  htf_bias: "BULLISH",
  ltf_alignment: "ALIGNED",
  timestamp: new Date().toISOString(),
  status: "PENDING",  // Will update to WIN/LOSS/CANCELLED
  execution_ready: true  // Flag for automated execution
});
```

**BRIDGE_SIGNAL for Persistence:**

```
BRIDGE_SIGNAL:SIGNAL_SAVE
{
  "action": "persist_signal",
  "data": {
    "asset": "[SYMBOL]",
    "side": "[LONG/SHORT]",
    "entry": [price],
    "sl": [price],
    "tp1": [price],
    "tp2": [price],
    "tp3": [price],
    "leverage": [X],
    "risk_percent": [1-2],
    "rr_ratio": [X],
    "position_usd": [calculated],
    "timestamp": "[ISO]",
    "execution_ready": true
  }
}
```

### 4. WhatsApp Signal Format (FINAL OUTPUT)

**Use this EXACT format for all trade signals:**

```
🚀 **SIGNAL: [ASSET]**

📶 **Direction:** [LONG/SHORT]
🎯 **Entry:** $[Price]
🛑 **Stop Loss:** $[Price] ([X%] risk)
🏆 **Targets:**
   • TP1: $[Price] (1:[X] R:R)
   • TP2: $[Price] (1:[X] R:R)
   • TP3: $[Price] (1:[X] R:R)

💰 **Risk Management:**
   • Leverage: [X]x
   • Risk: [1-2]%
   • Position: $[X] (of $1000 portfolio)
   • R:R Ratio: 1:[X]

💡 **Rationale:** [1-sentence SMC explanation]

⏰ **Valid Until:** [Invalidation condition or time]

───────────────────────────
📊 Source: Binance Demo
🔗 Confluence: [X]/5
```

**WAIT Format:**

```
⏸️ **WAIT: [ASSET]**

📊 Current Price: $[Price]
🔍 Reason: [Single sentence explaining why no signal]

📋 Watching For:
   • [Condition needed for signal]

───────────────────────────
Next check: [Timeframe or condition]
```

### 5. Complete Signal Workflow (6-Pillar)

```
5_PILLAR_SIGNAL_WORKFLOW:
═══════════════════════════════════════════════════════════════

STEP 1: LAYER 1 - SMC CORE ANALYSIS
  └─ Navigate to TradingView, set 4H timeframe
  └─ Analyze market structure (BOS, CHoCH)
  └─ Identify POI (Order Block or FVG)
  └─ Check HTF/LTF alignment
  └─ Detect liquidity sweeps
  └─ Score: [X]/4 points

STEP 2: LAYER 2 - INDICATOR VALIDATION
  └─ Calculate Fibonacci OTE zone (0.618-0.786)
  └─ Analyze RSI on 15m for divergence
  └─ Check Volume Profile POC alignment
  └─ Verify 2/3 minimum confirmations
  └─ Score: [X]/3 points

STEP 3: LAYER 3 - RISK CALCULATION
  └─ Define Entry, SL, TP levels
  └─ Calculate SL distance %
  └─ Calculate Leverage: 2% / SL_Distance%
  └─ Cap leverage at 20x
  └─ Calculate position size for $1,000 portfolio
  └─ Validate R:R ≥ 1:2
  └─ Score: [X]/2 points

STEP 4: LAYER 4 - SOCIAL SENTIMENT
  └─ Check X session (x_auth.json)
  └─ Navigate to X, search asset
  └─ Scrape 15-20 recent posts
  └─ Calculate sentiment score (1-10)
  └─ Apply Contrarian Rule
  └─ Score: [X]/2 points

STEP 5: LAYER 5 - ON-CHAIN INTEL
  └─ Navigate to Arkham/Solscan/Etherscan
  └─ Check whale transactions (last 24H)
  └─ Analyze exchange flow direction
  └─ Track smart money movements
  └─ Calculate on-chain score (1-10)
  └─ Apply High-Conviction Rule
  └─ Score: [X]/2 points

STEP 6: CONFLUENCE CHECK
  └─ Total Score: [X]/15 points
  └─ If ≥ 6 points → SIGNAL
  └─ If < 6 points → WAIT
  └─ If whale-confirmed → EXTREME confidence

STEP 7: PERSIST TO KNOWLEDGEBASE (CRITICAL)
  └─ BRIDGE_SIGNAL:SIGNAL_SAVE
  └─ Save all layer outputs
  └─ Save confluence rationale
  └─ Mark execution_ready: true

STEP 8: OUTPUT
  └─ Format using SIGNAL or WAIT format
  └─ Include Confluence Rationale for all 5 layers
  └─ Include Social Pulse + Whale Activity
  └─ Send to user via WhatsApp

═══════════════════════════════════════════════════════════════
```

### 6. Signal Validation Checklist (6-Pillar)

```
PRE-OUTPUT VALIDATION (5-PILLAR):
═══════════════════════════════════════════════════════════════

LAYER 1 CHECKS:
[ ] 4H trend direction identified (BULLISH/BEARISH)
[ ] 1H alignment verified (ALIGNED/CONFLICTING)
[ ] POI identified and marked (OB/FVG/OB+FVG)
[ ] Liquidity sweep detected (if applicable)
[ ] Layer 1 score calculated: [X]/4

LAYER 2 CHECKS:
[ ] Swing high/low identified for Fibonacci
[ ] OTE zone calculated (0.618-0.786 levels)
[ ] Entry position relative to OTE determined
[ ] RSI checked on 15m for divergence/extreme
[ ] Volume Profile POC level identified
[ ] Layer 2 score calculated: [X]/3 (minimum 2/3)

LAYER 3 CHECKS:
[ ] Entry price extracted from chart (EXACT)
[ ] Stop Loss at structural invalidation
[ ] SL distance calculated: |Entry - SL| / Entry × 100
[ ] Leverage calculated: 2% / SL_Distance%
[ ] Leverage ≤ 20x (capped if exceeded)
[ ] Position size: $1,000 × 2% × Leverage
[ ] TP1 at 1:2 R:R (close 50%)
[ ] TP2 at 1:3 R:R (close 30%)
[ ] TP3 at 1:5 R:R (close 20%)
[ ] R:R ratio ≥ 1:2 verified
[ ] Layer 3 score calculated: [X]/2

LAYER 4 CHECKS:
[ ] X session exists (x_auth.json)
[ ] Navigated to X with asset search
[ ] 15-20 posts scraped and analyzed
[ ] Sentiment score calculated (1-10)
[ ] Contrarian Rule applied
[ ] Layer 4 score calculated: [X]/2

LAYER 5 CHECKS:
[ ] Asset type identified (SOL/ETH/BTC)
[ ] Platform selected (Arkham/Solscan/Etherscan)
[ ] Whale transactions checked (last 24H)
[ ] Exchange flow analyzed (inflow/outflow)
[ ] Smart money activity assessed
[ ] On-chain score calculated (1-10)
[ ] High-Conviction Rule checked
[ ] Whale divergence checked
[ ] Layer 5 score calculated: [X]/2

FINAL CHECKS:
[ ] Total confluence score: [X]/15 points
[ ] Confluence score ≥ 6 (else WAIT)
[ ] Confluence Rationale written for all 5 layers
[ ] Social Pulse included
[ ] Whale Activity included
[ ] High-Conviction modifier applied (if whale-confirmed)
[ ] Data saved to KnowledgeBase
[ ] SIGNAL or WAIT format applied correctly
═══════════════════════════════════════════════════════════════
```

---

## UNIFIED EXECUTIVE PROTOCOL INTEGRATION

### Pre-Analysis Learning Loop

**Before ANY market analysis, query KnowledgeBase:**

```
BRIDGE_SIGNAL:LEARNING_QUERY
{
  "phase": "pre_task",
  "query": "smc_analysis [ASSET] [timeframe]",
  "purpose": "Retrieve past setups, win/loss patterns, known POIs"
}

→ Check for:
  - Previous setups on this asset
  - Win rate by setup type (OB vs FVG vs Confluence)
  - Known support/resistance levels
  - Past failure reasons
  - Last recorded trend direction
```

### Post-Analysis Learning Save

**CRITICAL: Save EVERY analysis to build pattern recognition:**

```
BRIDGE_SIGNAL:LEARNING_SAVE
{
  "phase": "post_task",
  "task_type": "smc_analysis",
  "asset": "[SYMBOL]",
  "outcome": "thesis_generated|market_disconnect|no_setup",
  "htf_bias": "bullish|bearish|ranging",
  "ltf_alignment": "aligned|conflicting",
  "poi_identified": "[OB/FVG/Confluence at $price]",
  "trade_direction": "long|short|none",
  "rr_ratio": [X],
  "confluence_score": [X/5],
  "lesson": "[Key observation for future reference]"
}
```

### Executive Summary Format (Trading)

**⛔ DEPRECATED: Executive Summary format is replaced by SIGNAL/WAIT format.**

**Use the SIGNAL/WAIT format defined above. Here's the quick reference:**

```
SIGNAL OUTPUT → When Confluence ≥ 4 points:
─────────────────────────────────────────────
🚀 SIGNAL: [ASSET]
📶 Direction: LONG/SHORT
🎯 Entry: $[Price]
🛑 Stop Loss: $[Price] ([X%])
🏆 Targets: TP1, TP2, TP3
💰 Risk: Leverage, Position, R:R
📊 Confluence Rationale: Layer 1, 2, 3 status
🔗 Confluence Score: [X]/9

WAIT OUTPUT → When Confluence < 4 points:
─────────────────────────────────────────────
⏸️ WAIT: [ASSET]
📊 Current Price: $[Price]
🔍 Reason: Why no signal
📋 Layer Status: Each layer status
📋 Watching For: Conditions needed
🔗 Confluence Score: [X]/9
```

### 6-Pillar Analysis Summary (Internal Use)

```
5_PILLAR_SUMMARY:
════════════════════════════════════════════════════════
Asset: [SYMBOL]
Timestamp: [ISO]

LAYER 1 - SMC CORE:
  verdict: [BULLISH_BIAS / BEARISH_BIAS / NO_CLEAR_STRUCTURE]
  confidence: [0.0-1.0]
  htf_trend: [BULLISH / BEARISH / RANGING]
  ltf_alignment: [ALIGNED / CONFLICTING]
  poi: [OB / FVG / OB+FVG] at $[zone]
  liquidity_swept: [YES / NO]
  points: [X]/4

LAYER 2 - INDICATOR LOGIC:
  verdict: [CONFIRMED / PARTIAL / REJECTED]
  confidence: [0.0-1.0]
  fib_ote: [IN_ZONE / ABOVE / BELOW]
  rsi_divergence: [BULLISH / BEARISH / NONE]
  volume_poc_aligned: [YES / NO]
  points: [X]/3

LAYER 3 - RISK MANAGEMENT:
  verdict: [EXECUTABLE / ADJUST_REQUIRED / REJECTED]
  confidence: [0.0-1.0]
  entry: $[price]
  stop_loss: $[price] ([X%] distance)
  leverage: [X]x (capped at 20x)
  position_usd: $[X]
  rr_ratio: 1:[X]
  points: [X]/2

LAYER 4 - SOCIAL SENTIMENT:
  verdict: [ALIGNED / CONTRARIAN_WARNING / NEUTRAL]
  confidence: [0.0-1.0]
  sentiment_score: [1-10]
  interpretation: [EXTREME_FEAR / FEAR / NEUTRAL / GREED / EXTREME_GREED]
  influencer_signals: [X detected]
  hype_volume: [LOW / MEDIUM / HIGH]
  contrarian_flag: [YES / NO]
  points: [X]/2

LAYER 5 - ON-CHAIN INTEL:
  verdict: [ACCUMULATION_CONFIRMED / DISTRIBUTION_WARNING / NEUTRAL / WHALE_DIVERGENCE]
  confidence: [0.0-1.0]
  onchain_score: [1-10]
  interpretation: [HEAVY_ACCUMULATION / LIGHT_ACCUMULATION / NEUTRAL / LIGHT_DISTRIBUTION / HEAVY_DISTRIBUTION]
  whale_transactions: [X detected over $500K]
  exchange_flow: [INFLOW / OUTFLOW / BALANCED]
  smart_money_direction: [BUYING / SELLING / NEUTRAL]
  whale_confirmed: [YES / NO]
  points: [X]/2

TOTAL CONFLUENCE: [X]/15 points
SIGNAL STATUS: [STRONG / MODERATE / WEAK / NO SIGNAL]
CONFIDENCE LEVEL: [NORMAL / EXTREME (if whale-confirmed)]
OUTPUT: [SIGNAL / WAIT]
════════════════════════════════════════════════════════
```

### 6-Pillar Confluence Interpretation

```
STRONG SIGNAL (13-15/15 points):
  → All six layers strongly confirmed
  → High-probability setup
  → Full position size allowed (100%)
  → If whale-confirmed: +25% (125%)
  → Proceed with SIGNAL

MODERATE SIGNAL (10-12/15 points):
  → Most criteria met, minor gaps
  → Good probability setup
  → Reduced position size (75%)
  → Proceed with SIGNAL

WEAK SIGNAL (7-9/15 points):
  → Minimum threshold met
  → Borderline setup
  → Reduced position size (50%)
  → Proceed with CAUTION

NO SIGNAL (< 7/15 points):
  → Insufficient confluence
  → DO NOT TRADE
  → Output WAIT with reasons
  → Wait for better conditions
```

### Skill File Paths (Layer Integration)

```
6-PILLAR_SKILL_FILES:
═══════════════════════════════════════════════════════════════
BASE_PATH: C:\MainAgent\skills\

ORCHESTRATOR:
  market-intelligence\SKILL.md     ← THIS FILE (coordinates all layers)

LAYER 1 - SMC CORE:
  smc-core\SKILL.md                ← Market structure analysis
  → BOS, CHoCH, Order Blocks, FVGs
  → HTF/LTF alignment
  → Liquidity analysis

LAYER 2 - INDICATOR LOGIC:
  indicator-logic\SKILL.md         ← Technical validation
  → Fibonacci OTE (0.618-0.786)
  → RSI Divergence
  → Volume Profile

LAYER 3 - RISK MANAGEMENT:
  risk-management\SKILL.md         ← Execution math
  → Leverage calculation
  → Position sizing
  → R:R validation

LAYER 4 - SOCIAL SENTIMENT:
  social-sentiment\SKILL.md        ← Live X sentiment
  → Twitter scraping
  → Influencer detection
  → Contrarian analysis

LAYER 5 - ON-CHAIN INTEL:
  on-chain-intel\SKILL.md          ← Whale & Smart Money
  → Whale transaction tracking
  → Exchange flow analysis
  → Smart money detection
  → High-conviction rule

LAYER 6 - FUNDAMENTAL INTEL:
  fundamental-intel\SKILL.md       ← News & Catalyst Tracking
  → RSS/News feed monitoring
  → Catalyst detection (listings, partnerships)
  → Negative news veto (hacks, delistings)
  → Event timeline tracking

═══════════════════════════════════════════════════════════════
```

### Path Constants

```
BASE_PATH:    C:\MainAgent
Skills:       C:\MainAgent\skills\
Screenshots:  C:\MainAgent\screenshots\trading\
Logs:         C:\MainAgent\logs\
Memory:       C:\MainAgent\memory\
Config:       C:\MainAgent\config\
Sessions:     C:\MainAgent\sessions\
```

### Browser Settings (MANDATORY)

```
headless: false  ← User MUST see all browser actions
viewport: 1920x1080
Screenshots: Required for BOTH 4H and 1H charts
```

### Complete Analysis Workflow with BRIDGE_SIGNAL

```
1. BRIDGE_SIGNAL:TASK_STARTED
   {"taskId": "SMC-XXXXXX", "category": "trading", "asset": "[SYMBOL]"}

2. BRIDGE_SIGNAL:LEARNING_QUERY (pre-task)

3. BRIDGE_SIGNAL:STEP_PROGRESS (4H analysis)
   {"step": 1, "action": "Capturing 4H chart"}

4. BRIDGE_SIGNAL:STEP_PROGRESS (1H analysis)
   {"step": 2, "action": "Capturing 1H chart"}

5. BRIDGE_SIGNAL:MTF_CHECK
   {"htf_bias": "...", "ltf_alignment": "...", "proceed": true/false}

6. [If conflict] BRIDGE_SIGNAL:MARKET_DISCONNECT

7. BRIDGE_SIGNAL:LEARNING_SAVE (post-task)

8. BRIDGE_SIGNAL:TASK_COMPLETED

9. Output 📌 EXECUTIVE SUMMARY
```
