---
name: fundamental-intel
description: Layer 6 - Fundamental Intelligence. Monitors news feeds, detects catalysts, and applies news veto logic. Use for RSS monitoring, catalyst detection, and negative news filtering.
version: 1.0.0
allowed-tools:
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_wait
  - mcp__playwright__browser_type
  - mcp__playwright__browser_press
  - Read
  - Write
  - WebFetch
---

# Fundamental Intel Skill - Layer 6

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           LAYER 6: FUNDAMENTAL INTELLIGENCE                                   ║
║           News Monitoring & Catalyst Detection                                ║
║                                                                               ║
║  This skill provides the 6th pillar of the confluence system:                 ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  NEWS VETO SYSTEM                                                       │  ║
║  │  → Detects negative news that should ABORT any trade signal             │  ║
║  │  → Hacks, exploits, delistings, regulatory actions                      │  ║
║  │  → If NEWS_VETO → Signal is immediately cancelled                       │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  CATALYST DETECTION                                                     │  ║
║  │  → Positive events that boost confidence                                │  ║
║  │  → Exchange listings, partnerships, upgrades                            │  ║
║  │  → If CATALYST → +1 confidence modifier                                 │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  OUTPUT: FUNDAMENTAL_LAYER6_OUTPUT                                      │  ║
║  │  → fundamental_score (1-10)                                             │  ║
║  │  → verdict: CLEAR / CATALYST_DETECTED / NEWS_VETO                       │  ║
║  │  → summary: Key news item or "No significant news"                      │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## NEWS SOURCES

```
PRIMARY_SOURCES:
═══════════════════════════════════════════════════════════════

1. COINGECKO NEWS
   URL: https://www.coingecko.com/en/coins/{coin}/news
   → Official announcements
   → Partnership news
   → Development updates

2. COINTELEGRAPH
   URL: https://cointelegraph.com/tags/{coin}
   → Breaking news
   → Market analysis
   → Regulatory updates

3. DECRYPT
   URL: https://decrypt.co/tag/{coin}
   → News coverage
   → Deep dives
   → Incident reporting

4. BINANCE ANNOUNCEMENTS
   URL: https://www.binance.com/en/support/announcement
   → Listing/delisting notices
   → Maintenance alerts
   → Trading rule changes

5. PROJECT TWITTER/X
   → Official project account
   → Key team members
   → Already captured by Layer 4 (Social Sentiment)
   → Cross-reference for verification

═══════════════════════════════════════════════════════════════
```

---

## NEWS VETO TRIGGERS

```
╔═══════════════════════════════════════════════════════════════╗
║                    NEWS VETO TRIGGERS                         ║
║                                                               ║
║  If ANY of these are detected → IMMEDIATE ABORT               ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  SECURITY INCIDENTS:                                          ║
║  ──────────────────────────────────────────────────────────── ║
║  ☐ Hack or exploit reported                                   ║
║  ☐ Smart contract vulnerability                               ║
║  ☐ Bridge exploit                                             ║
║  ☐ Rug pull allegations                                       ║
║  ☐ Team wallet compromise                                     ║
║                                                               ║
║  EXCHANGE ACTIONS:                                            ║
║  ──────────────────────────────────────────────────────────── ║
║  ☐ Delisting announcement                                     ║
║  ☐ Trading suspension                                         ║
║  ☐ Withdrawal halt                                            ║
║  ☐ Margin trading removal                                     ║
║                                                               ║
║  REGULATORY:                                                  ║
║  ──────────────────────────────────────────────────────────── ║
║  ☐ SEC/DOJ investigation announced                            ║
║  ☐ Classified as security                                     ║
║  ☐ Country ban (major market)                                 ║
║  ☐ Legal action against team                                  ║
║                                                               ║
║  TEAM/PROJECT:                                                ║
║  ──────────────────────────────────────────────────────────── ║
║  ☐ Key team departure (CEO, CTO)                              ║
║  ☐ Project shutdown announced                                 ║
║  ☐ Major roadmap cancellation                                 ║
║  ☐ Treasury insolvency                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## CATALYST TRIGGERS

```
╔═══════════════════════════════════════════════════════════════╗
║                    POSITIVE CATALYSTS                         ║
║                                                               ║
║  If detected → +1 confidence modifier                         ║
║  Flag in output for awareness                                 ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  EXCHANGE LISTINGS:                                           ║
║  ──────────────────────────────────────────────────────────── ║
║  ☐ Binance listing announced                                  ║
║  ☐ Coinbase listing announced                                 ║
║  ☐ Major CEX listing (Kraken, OKX, Bybit)                     ║
║  ☐ New trading pair added                                     ║
║                                                               ║
║  PARTNERSHIPS:                                                ║
║  ──────────────────────────────────────────────────────────── ║
║  ☐ Major tech company partnership                             ║
║  ☐ Institutional adoption                                     ║
║  ☐ Payment integration (Visa, Mastercard, PayPal)             ║
║  ☐ Cross-chain integration                                    ║
║                                                               ║
║  DEVELOPMENT:                                                 ║
║  ──────────────────────────────────────────────────────────── ║
║  ☐ Mainnet launch                                             ║
║  ☐ Major upgrade (ETH Merge-level)                            ║
║  ☐ New feature release                                        ║
║  ☐ Testnet success                                            ║
║                                                               ║
║  ECOSYSTEM:                                                   ║
║  ──────────────────────────────────────────────────────────── ║
║  ☐ Airdrop announcement                                       ║
║  ☐ Staking rewards increase                                   ║
║  ☐ Grant program launch                                       ║
║  ☐ Major DeFi protocol integration                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## FUNDAMENTAL SCORING

```
FUNDAMENTAL_SCORE (1-10):
═══════════════════════════════════════════════════════════════

SCORE 1-2: CRITICAL NEGATIVE
  → Multiple veto triggers detected
  → Immediate signal abort required
  → Verdict: NEWS_VETO

SCORE 3-4: NEGATIVE
  → Concerning news present
  → Caution advised
  → Verdict: CAUTION

SCORE 5-6: NEUTRAL
  → No significant news
  → Standard market conditions
  → Verdict: CLEAR

SCORE 7-8: POSITIVE
  → Positive developments
  → No negative news
  → Verdict: CLEAR

SCORE 9-10: STRONG CATALYST
  → Major positive catalyst detected
  → High confidence setup
  → Verdict: CATALYST_DETECTED

═══════════════════════════════════════════════════════════════
```

---

## ANALYSIS WORKFLOW

```
FUNDAMENTAL_ANALYSIS_WORKFLOW:
═══════════════════════════════════════════════════════════════

INPUT: Asset symbol (e.g., BTC, ETH, SOL, PEPE)

STEP 1: IDENTIFY ASSET
─────────────────────────────────────────────────────────────
→ Map symbol to full name and CoinGecko ID
→ Identify relevant news sources

STEP 2: CHECK NEWS SOURCES (Prioritized)
─────────────────────────────────────────────────────────────
1. Check Binance announcements (if Binance pair)
   → Filter for asset-specific news
   → Look for listing/delisting notices

2. Check CoinGecko news page
   → Review last 24h of news
   → Note any significant events

3. Check major crypto news sites
   → CoinTelegraph, Decrypt, TheBlock
   → Look for breaking news

STEP 3: SCAN FOR VETO TRIGGERS
─────────────────────────────────────────────────────────────
→ Search for keywords: hack, exploit, delisting, SEC, investigation
→ If ANY veto trigger found:
   → Set verdict = NEWS_VETO
   → Set score = 1 or 2
   → ABORT signal immediately

STEP 4: SCAN FOR CATALYSTS
─────────────────────────────────────────────────────────────
→ Search for keywords: listing, partnership, upgrade, launch
→ If catalyst found:
   → Set verdict = CATALYST_DETECTED
   → Set score = 9 or 10
   → Flag for confidence boost

STEP 5: CALCULATE SCORE
─────────────────────────────────────────────────────────────
→ If no significant news: score = 5-6 (NEUTRAL)
→ If minor positive news: score = 7-8 (POSITIVE)
→ If catalyst: score = 9-10 (STRONG)
→ If concerning news: score = 3-4 (NEGATIVE)
→ If veto trigger: score = 1-2 (CRITICAL)

STEP 6: OUTPUT FUNDAMENTAL_LAYER6_OUTPUT
─────────────────────────────────────────────────────────────
→ fundamental_score: [1-10]
→ verdict: [CLEAR | CATALYST_DETECTED | NEWS_VETO]
→ summary: [Key news item or "No significant news"]
→ catalyst: [null | Event description]
→ veto_reason: [null | Veto trigger description]

═══════════════════════════════════════════════════════════════
```

---

## OUTPUT FORMAT

```
FUNDAMENTAL_LAYER6_OUTPUT:
═══════════════════════════════════════════════════════════════

{
  "layer": 6,
  "name": "Fundamental Intel",
  "asset": "[SYMBOL]",
  "timestamp": "[ISO timestamp]",
  "fundamental_score": [1-10],
  "verdict": "[CLEAR | CATALYST_DETECTED | NEWS_VETO]",
  "summary": "[Brief description]",
  "news_items": [
    {
      "source": "[Source name]",
      "headline": "[News headline]",
      "sentiment": "[positive | neutral | negative]",
      "timestamp": "[When published]"
    }
  ],
  "catalyst": {
    "detected": [true | false],
    "type": "[listing | partnership | upgrade | etc.]",
    "description": "[Event description]"
  },
  "veto": {
    "triggered": [true | false],
    "reason": "[null | Veto reason]",
    "source": "[null | Source of veto news]"
  },
  "confidence_modifier": [0 | +1],
  "recommendation": "[PROCEED | ABORT]"
}

═══════════════════════════════════════════════════════════════
```

---

## INTEGRATION WITH ORCHESTRATOR

```
LAYER_6_INTEGRATION:
═══════════════════════════════════════════════════════════════

CALLED BY: market-intelligence (Orchestrator)
POSITION: After Layer 5 (On-Chain Intel), before Final Confluence

CONFLUENCE POINTS (Max 2):
  ☐ No news veto detected                    +1
  ☐ Positive catalyst OR neutral stance      +1

HARD REQUIREMENT:
  → If NEWS_VETO → ABORT signal immediately
  → No override without user confirmation

ORCHESTRATOR CHECK:
  IF layer6_verdict == "NEWS_VETO":
    → ABORT and output WAIT
    → Reason: "Negative fundamental event: [veto_reason]"

  IF layer6_verdict == "CATALYST_DETECTED":
    → Add +1 confidence modifier
    → Flag: "Catalyst: [catalyst_description]"

  IF layer6_verdict == "CLEAR":
    → Proceed normally
    → Score contributes to confluence

═══════════════════════════════════════════════════════════════
```

---

## QUICK REFERENCE

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    FUNDAMENTAL INTEL - QUICK REFERENCE                      ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  PURPOSE: News monitoring and catalyst/veto detection                      ║
║                                                                            ║
║  SCORING: 1-10                                                             ║
║    1-2: CRITICAL (NEWS_VETO) → ABORT                                       ║
║    3-4: NEGATIVE → CAUTION                                                 ║
║    5-6: NEUTRAL → CLEAR                                                    ║
║    7-8: POSITIVE → CLEAR                                                   ║
║    9-10: CATALYST → CATALYST_DETECTED                                      ║
║                                                                            ║
║  CONFLUENCE POINTS: 2 max                                                  ║
║    +1: No veto triggers                                                    ║
║    +1: Catalyst detected OR neutral                                        ║
║                                                                            ║
║  VETO TRIGGERS:                                                            ║
║    • Hacks/exploits                                                        ║
║    • Delistings                                                            ║
║    • Regulatory action                                                     ║
║    • Team departure                                                        ║
║                                                                            ║
║  CATALYST TRIGGERS:                                                        ║
║    • Exchange listings                                                     ║
║    • Partnerships                                                          ║
║    • Major upgrades                                                        ║
║    • Airdrops                                                              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```
