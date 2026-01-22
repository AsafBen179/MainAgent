---
name: social-sentiment
description: Layer 4 - Live social sentiment analysis. Scrapes X (Twitter) for real-time market sentiment, influencer signals, and hype detection to validate or contradict technical setups.
version: 1.0.0
allowed-tools:
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_wait
  - mcp__playwright__browser_scroll
  - mcp__playwright__browser_type
  - Read
---

# Social Sentiment Skill - Layer 4: Live Sentiment Analysis

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           LAYER 4: SOCIAL SENTIMENT ANALYSIS                                  ║
║                                                                               ║
║  This skill analyzes real-time market sentiment from X (Twitter):             ║
║  - Sentiment Score (1-10 scale: Fear to Greed)                               ║
║  - Influencer/Whale account signals                                          ║
║  - Hype volume and mention frequency spikes                                  ║
║  - Contrarian indicator for reversal detection                               ║
║                                                                               ║
║  CONTRARIAN RULE: Extreme sentiment often precedes reversals                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## OUTPUT FORMAT

This skill outputs sentiment analysis that feeds into the orchestrator:

```
SENTIMENT_LAYER4_OUTPUT:
{
  "layer": 4,
  "name": "Social Sentiment",
  "asset": "[SYMBOL]",
  "timestamp": "[ISO]",

  "sentiment_analysis": {
    "score": 1-10,
    "label": "EXTREME_FEAR|FEAR|NEUTRAL|GREED|EXTREME_GREED",
    "trend": "RISING|STABLE|FALLING",
    "posts_analyzed": [count]
  },

  "influencer_signals": {
    "whale_accounts_posting": true|false,
    "verified_analysts": [list of handles],
    "dominant_bias": "BULLISH|BEARISH|MIXED|NEUTRAL",
    "notable_calls": ["@handle: summary of call"]
  },

  "hype_detection": {
    "mention_frequency": "LOW|NORMAL|HIGH|VIRAL",
    "spike_detected": true|false,
    "spike_magnitude": "[X]x normal",
    "trending_hashtags": ["#hashtag1", "#hashtag2"]
  },

  "contrarian_check": {
    "technical_bias": "BULLISH|BEARISH",
    "sentiment_extreme": true|false,
    "reversal_risk": "LOW|MEDIUM|HIGH",
    "contrarian_signal": true|false
  },

  "layer4_verdict": "ALIGNED|CONTRARIAN_WARNING|NEUTRAL",
  "confidence": 0.0-1.0,
  "social_pulse": "[Sentiment Score]/10 - [Key insight]"
}
```

---

## SESSION REQUIREMENT

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ⚠️  SESSION FILE REQUIRED: sessions/x_auth.json                             ║
║                                                                               ║
║   This skill requires a logged-in X (Twitter) session for live scraping.     ║
║                                                                               ║
║   If x_auth.json is missing:                                                  ║
║   1. Run: npm run capture-x-auth                                              ║
║   2. Log into X in the browser window                                         ║
║   3. Session will be saved automatically                                      ║
║                                                                               ║
║   Environment variable: PLAYWRIGHT_MCP_STORAGE_STATE=sessions/x_auth.json    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

SESSION_CHECK:
─────────────
Before analysis, verify session exists:
  - Check: sessions/x_auth.json exists
  - If missing: Output warning and skip Layer 4
  - If exists: Proceed with sentiment analysis
```

---

## SENTIMENT SCORING SYSTEM

```
SENTIMENT SCALE (1-10):
═══════════════════════════════════════════════════════════════

1-2: EXTREME FEAR
─────────────────
  → Panic selling mentions
  → "Dump", "crash", "dead" keywords
  → Capitulation signals
  → CONTRARIAN: Potential bottom (bullish for longs)

3-4: FEAR
─────────
  → Bearish sentiment dominant
  → Caution and warnings
  → Decreasing engagement
  → Standard bearish bias

5-6: NEUTRAL
────────────
  → Mixed sentiment
  → No clear directional bias
  → Normal market discussion
  → Wait for confirmation

7-8: GREED
──────────
  → Bullish sentiment dominant
  → "Moon", "pump", "bullish" keywords
  → Increasing engagement
  → Standard bullish bias

9-10: EXTREME GREED
───────────────────
  → Euphoric mentions
  → "100x", "to the moon", "never selling"
  → FOMO indicators
  → CONTRARIAN: Potential top (bearish for longs)

╔═══════════════════════════════════════════════════════════════╗
║                    CONTRARIAN MATRIX                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Technical Bias  │  Sentiment     │  Risk Level              ║
║──────────────────┼────────────────┼──────────────────────────║
║  BULLISH         │  EXTREME GREED │  HIGH (potential top)    ║
║  BULLISH         │  GREED         │  MEDIUM (crowded trade)  ║
║  BULLISH         │  NEUTRAL       │  LOW (healthy)           ║
║  BULLISH         │  FEAR          │  VERY LOW (contrarian+)  ║
║  BULLISH         │  EXTREME FEAR  │  LOWEST (max opportunity)║
║──────────────────┼────────────────┼──────────────────────────║
║  BEARISH         │  EXTREME FEAR  │  HIGH (potential bottom) ║
║  BEARISH         │  FEAR          │  MEDIUM (crowded trade)  ║
║  BEARISH         │  NEUTRAL       │  LOW (healthy)           ║
║  BEARISH         │  GREED         │  VERY LOW (contrarian+)  ║
║  BEARISH         │  EXTREME GREED │  LOWEST (max opportunity)║
╚═══════════════════════════════════════════════════════════════╝
```

---

## X (TWITTER) NAVIGATION WORKFLOW

```
X_NAVIGATION:
═══════════════════════════════════════════════════════════════

STEP 1: Navigate to X Search
─────────────────────────────
URL Pattern: https://x.com/search?q=[ASSET]&src=typed_query&f=live

Examples:
  SOL: https://x.com/search?q=$SOL%20OR%20%23SOL%20OR%20Solana&src=typed_query&f=live
  BTC: https://x.com/search?q=$BTC%20OR%20%23BTC%20OR%20Bitcoin&src=typed_query&f=live
  ETH: https://x.com/search?q=$ETH%20OR%20%23ETH%20OR%20Ethereum&src=typed_query&f=live

mcp__playwright__browser_navigate({
  url: "https://x.com/search?q=$SOL%20OR%20%23SOL%20OR%20Solana&src=typed_query&f=live"
})
mcp__playwright__browser_wait({ time: 3000 })

STEP 2: Dismiss Popups/Modals
──────────────────────────────
// Close any login prompts or notifications
mcp__playwright__browser_click({ selector: "[data-testid='xMigrationBottomBar'] button" })
mcp__playwright__browser_click({ selector: "[aria-label='Close']" })
mcp__playwright__browser_press({ key: "Escape" })
mcp__playwright__browser_wait({ time: 1000 })

STEP 3: Scroll to Load More Posts
──────────────────────────────────
// Scroll down to load 15-20 posts
mcp__playwright__browser_scroll({ direction: "down", amount: 1500 })
mcp__playwright__browser_wait({ time: 2000 })
mcp__playwright__browser_scroll({ direction: "down", amount: 1500 })
mcp__playwright__browser_wait({ time: 2000 })

STEP 4: Take Screenshot
────────────────────────
mcp__playwright__browser_take_screenshot()

STEP 5: Get Page Content (Snapshot)
────────────────────────────────────
mcp__playwright__browser_snapshot()
→ Analyze tweet content from snapshot
→ Extract text, engagement metrics, usernames
```

---

## CONTENT ANALYSIS CRITERIA

```
KEYWORD ANALYSIS:
═══════════════════════════════════════════════════════════════

BULLISH KEYWORDS (Add +1 to sentiment per occurrence):
─────────────────────────────────────────────────────
Strong: "moon", "pump", "bullish", "breakout", "ATH", "100x"
Moderate: "buy", "long", "accumulate", "dip buy", "undervalued"
Mild: "holding", "HODL", "support", "bounce"

BEARISH KEYWORDS (Subtract -1 from sentiment per occurrence):
─────────────────────────────────────────────────────────────
Strong: "dump", "crash", "dead", "scam", "rug", "sell now"
Moderate: "sell", "short", "bearish", "breakdown", "overvalued"
Mild: "caution", "warning", "resistance", "top"

NEUTRAL KEYWORDS (No change):
─────────────────────────────
"analysis", "chart", "watching", "interesting", "consolidation"

ENGAGEMENT WEIGHT:
──────────────────
- Verified accounts: 3x weight
- >100k followers: 2x weight
- >10k likes on post: 2x weight
- Recent (< 1 hour): 1.5x weight
```

---

## INFLUENCER IDENTIFICATION

```
WHALE/INFLUENCER CRITERIA:
═══════════════════════════════════════════════════════════════

TIER 1 - MAJOR WHALES (Highest weight):
────────────────────────────────────────
  → Verified accounts with 500k+ followers
  → Known institutional traders
  → Major exchange accounts
  → Project official accounts

TIER 2 - NOTABLE ANALYSTS:
──────────────────────────
  → Verified accounts with 100k-500k followers
  → Known crypto analysts/traders
  → Popular trading communities

TIER 3 - MICRO-INFLUENCERS:
───────────────────────────
  → Accounts with 10k-100k followers
  → Active trading community members
  → Technical analysis posters

DETECTION SELECTORS:
────────────────────
Verified badge: [data-testid="icon-verified"]
Follower count: Extract from profile hover
Engagement: [data-testid="like"], [data-testid="retweet"]

NOTABLE CALL EXTRACTION:
────────────────────────
Format: "@handle: [BULLISH/BEARISH] - key quote from post"
Example: "@CryptoWhale: BULLISH - 'SOL breaking out of accumulation'"
```

---

## HYPE DETECTION ALGORITHM

```
HYPE_DETECTION:
═══════════════════════════════════════════════════════════════

MENTION FREQUENCY LEVELS:
─────────────────────────
LOW:    < 5 posts per scroll (low interest)
NORMAL: 5-15 posts per scroll (typical)
HIGH:   15-30 posts per scroll (elevated interest)
VIRAL:  30+ posts per scroll (potential news event)

SPIKE DETECTION:
────────────────
Compare current frequency to typical baseline:
  - 2x normal → Moderate spike
  - 3x normal → Significant spike
  - 5x+ normal → Viral event (investigate news)

TRENDING HASHTAG CHECK:
───────────────────────
Look for asset-specific hashtags in posts:
  - #SOL, #Solana, #SOLArmy
  - #BTC, #Bitcoin
  - #ETH, #Ethereum

If hashtags appear in >50% of posts → Coordinated campaign possible

VIRAL EVENT INDICATORS:
───────────────────────
  → Sudden spike in mentions
  → Multiple verified accounts posting
  → News-related keywords
  → Exchange announcements
  → Partnership mentions
```

---

## CONTRARIAN RULE IMPLEMENTATION

```
CONTRARIAN_LOGIC:
═══════════════════════════════════════════════════════════════

The "Contrarian Rule" detects when extreme sentiment may signal
an impending reversal, contradicting the technical setup.

RULE APPLICATION:
─────────────────

IF technical_bias == "BULLISH" AND sentiment_score >= 9:
  → contrarian_signal = TRUE
  → reversal_risk = "HIGH"
  → warning = "Extreme greed detected. Smart Money may exit soon."
  → recommendation = "Reduce position size or wait for pullback"

IF technical_bias == "BEARISH" AND sentiment_score <= 2:
  → contrarian_signal = TRUE
  → reversal_risk = "HIGH"
  → warning = "Extreme fear detected. Potential capitulation bottom."
  → recommendation = "Watch for reversal signals, avoid shorting"

IF sentiment aligns with technicals AND score is moderate (4-7):
  → contrarian_signal = FALSE
  → reversal_risk = "LOW"
  → layer4_verdict = "ALIGNED"

POSITION SIZE ADJUSTMENT:
─────────────────────────
Based on sentiment alignment:
  - ALIGNED + Moderate sentiment: 100% position
  - ALIGNED + Elevated sentiment: 75% position
  - CONTRARIAN WARNING: 50% position or WAIT
```

---

## VISUAL ANALYSIS ON X

```
X INTERFACE ANALYSIS:
═══════════════════════════════════════════════════════════════

1. POST STRUCTURE:
   ┌────────────────────────────────────────────────────────┐
   │ @username · timestamp                          [✓]    │
   │ ─────────────────────────────────────────────────────  │
   │ Post content text here...                              │
   │ $SOL looking bullish! Target $200                      │
   │ ─────────────────────────────────────────────────────  │
   │ 💬 12    🔄 45    ❤️ 234    📊 5.2K                    │
   └────────────────────────────────────────────────────────┘

2. DATA TO EXTRACT:
   - Username and verification status
   - Post text content
   - Timestamp (recency)
   - Engagement: replies, retweets, likes, views

3. SELECTORS:
   Tweet container: [data-testid="tweet"]
   Username: [data-testid="User-Name"]
   Tweet text: [data-testid="tweetText"]
   Like count: [data-testid="like"]
   Retweet count: [data-testid="retweet"]
   Reply count: [data-testid="reply"]

4. SCREENSHOT REQUIREMENT:
   → Capture visible tweets for evidence
   → Include at least 10-15 posts in frame
   → Note any viral posts or whale accounts
```

---

## INTEGRATION WITH ORCHESTRATOR

```
This skill is called by market-intelligence.md (Orchestrator)
AFTER Layer 3 (Risk Management) calculates position parameters.

CALL PATTERN:
─────────────
Orchestrator provides:
  - Asset symbol (SOL, BTC, ETH)
  - Technical bias from Layer 1-3

Social-Sentiment returns:
  - Sentiment score (1-10)
  - Influencer signals
  - Hype detection
  - Contrarian warning if applicable

DECISION FLOW:
──────────────
IF layer4_verdict == "ALIGNED":
  → Proceed with full position size
  → Add to confluence score

IF layer4_verdict == "CONTRARIAN_WARNING":
  → Flag in output
  → Reduce position size to 50%
  → Add risk warning to signal

IF layer4_verdict == "NEUTRAL":
  → No adjustment needed
  → Proceed based on technical confluence

4-PILLAR CONFLUENCE INTEGRATION:
────────────────────────────────
Layer 1 (SMC Core):        [X]/4 points
Layer 2 (Indicator Logic): [X]/3 points
Layer 3 (Risk Management): [X]/2 points
Layer 4 (Social Sentiment):[X]/2 points  ← NEW
─────────────────────────────────────────
TOTAL POSSIBLE: 11 points

SIGNAL THRESHOLDS (Updated):
  8-11 points → STRONG SIGNAL
  6-7 points  → MODERATE SIGNAL
  5 points    → WEAK SIGNAL
  < 5 points  → NO SIGNAL → WAIT
```

---

## EXAMPLE OUTPUT

```json
{
  "layer": 4,
  "name": "Social Sentiment",
  "asset": "SOLUSDT",
  "timestamp": "2026-01-21T10:45:00Z",

  "sentiment_analysis": {
    "score": 7,
    "label": "GREED",
    "trend": "RISING",
    "posts_analyzed": 18
  },

  "influencer_signals": {
    "whale_accounts_posting": true,
    "verified_analysts": ["@CryptoAnalyst", "@SolanaWhale"],
    "dominant_bias": "BULLISH",
    "notable_calls": [
      "@CryptoAnalyst: BULLISH - 'SOL breaking $130 resistance'",
      "@SolanaWhale: BULLISH - 'Accumulating at these levels'"
    ]
  },

  "hype_detection": {
    "mention_frequency": "HIGH",
    "spike_detected": true,
    "spike_magnitude": "2.5x normal",
    "trending_hashtags": ["#SOL", "#Solana", "#SOLArmy"]
  },

  "contrarian_check": {
    "technical_bias": "BULLISH",
    "sentiment_extreme": false,
    "reversal_risk": "LOW",
    "contrarian_signal": false
  },

  "layer4_verdict": "ALIGNED",
  "confidence": 0.80,
  "social_pulse": "7/10 - Bullish sentiment with whale accumulation signals"
}
```

---

## SOCIAL PULSE FORMAT (WhatsApp Output)

```
The final WhatsApp signal includes this section:

🌐 **Social Pulse:** [Score]/10 - [Key Insight]

Examples:
─────────
🌐 **Social Pulse:** 7/10 - Bullish sentiment, whale accounts accumulating
🌐 **Social Pulse:** 3/10 - Fear dominant, potential capitulation bottom
🌐 **Social Pulse:** 9/10 - ⚠️ EXTREME GREED - Contrarian reversal risk HIGH

With Contrarian Warning:
────────────────────────
🌐 **Social Pulse:** 9/10 - ⚠️ EXTREME GREED
   ⚠️ Contrarian Warning: Sentiment at extreme. Reduce position to 50%.
```
