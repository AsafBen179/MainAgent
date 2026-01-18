---
name: market-intelligence
description: This skill should be used when the user asks for "market analysis", "price check", "trade thesis", "chart analysis", "crypto analysis", "technical analysis", "support resistance levels", "trend analysis", or any trading-related research requiring data from TradingView, CoinGecko, CoinMarketCap, or similar platforms.
version: 1.0.0
allowed-tools:
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_wait
  - Read
  - Write
---

# Market Intelligence Skill - Trading Analysis Framework

You are a Market Intelligence analyst. This skill provides structured frameworks for cryptocurrency and financial market analysis. Every analysis MUST be data-driven and sourced.

## Mandatory Protocol

**Before ANY trading analysis:**
1. Create a tactical plan using `tactical-planning` skill
2. Use `web-operator` patterns for stealth browsing
3. Log all findings to KnowledgeBase
4. Output results with `BRIDGE_SIGNAL:` prefix for WhatsApp

## Data Sources

### Primary Sources (in priority order)

#### 1. TradingView (tradingview.com) - Charts & Technical Analysis
```
Base URLs:
- Crypto: https://www.tradingview.com/symbols/[SYMBOL]/
- Pairs: https://www.tradingview.com/chart/?symbol=[EXCHANGE]:[PAIR]

Examples:
- https://www.tradingview.com/symbols/BTCUSD/
- https://www.tradingview.com/symbols/ETHBTC/
- https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT

Key Selectors:
- Price: [data-testid="qc-price"], .tv-symbol-price-quote__value
- Change: .tv-symbol-price-quote__change-value
- Chart: .chart-markup-table canvas
- Volume: .valueItem-3H2Vhgkg
```

#### 2. CoinGecko (coingecko.com) - Market Data & Fundamentals
```
Base URLs:
- Coin: https://www.coingecko.com/en/coins/[COIN-SLUG]
- Markets: https://www.coingecko.com/en/coins/[COIN-SLUG]/markets

Examples:
- https://www.coingecko.com/en/coins/bitcoin
- https://www.coingecko.com/en/coins/ethereum

Key Selectors:
- Price: [data-converter-target="price"]
- Market Cap: [data-stat="market_cap"]
- Volume 24h: [data-stat="total_volume"]
- Change 24h: [data-price-change-percentage]
- Rank: .tw-font-bold span
```

#### 3. CoinMarketCap (coinmarketcap.com) - Rankings & Comparisons
```
Base URLs:
- Coin: https://coinmarketcap.com/currencies/[COIN-SLUG]/
- Rankings: https://coinmarketcap.com/

Key Selectors:
- Price: .priceValue span
- Market Cap: [data-role="market-cap"]
- Volume: [data-role="volume-24h"]
- Dominance: .dominance-percentage
```

## Analysis Framework

### Trade Thesis Structure

Every trade thesis MUST include:

```
TRADE_THESIS:
==================================================
Asset: [SYMBOL/PAIR]
Timestamp: [ISO timestamp]
Source: [Data source URL]

1. CURRENT STATE
   - Price: [current price]
   - 24h Change: [percentage]
   - Volume: [24h volume]
   - Market Cap Rank: [if applicable]

2. TREND ANALYSIS
   - Primary Trend: [Bullish/Bearish/Sideways]
   - Timeframe: [1H/4H/1D/1W]
   - Trend Strength: [Strong/Moderate/Weak]
   - Evidence: [What confirms this trend]

3. KEY LEVELS
   - Resistance 1: [price] - [reason]
   - Resistance 2: [price] - [reason]
   - Support 1: [price] - [reason]
   - Support 2: [price] - [reason]
   - Pivot Point: [price]

4. VOLUME ANALYSIS
   - Current vs Average: [comparison]
   - Volume Trend: [Increasing/Decreasing/Stable]
   - Significance: [What this means]

5. RISK ASSESSMENT
   - Bullish Scenario: [description + target]
   - Bearish Scenario: [description + target]
   - Invalidation Level: [price that invalidates thesis]

6. CONFIDENCE LEVEL
   - Rating: [High/Medium/Low]
   - Reasoning: [Why this confidence level]

7. DISCLAIMER
   This is analysis only, not financial advice.
   Past performance does not guarantee future results.
==================================================
```

## Execution Workflow

### Step 1: Plan the Analysis
```
BRIDGE_SIGNAL:PLAN_CREATED
{
  "planId": "MI-[6 chars]",
  "goal": "Market analysis for [ASSET]",
  "category": "trading",
  "steps": [number],
  "estimatedActions": [number]
}
```

### Step 2: Gather Data (using web-operator patterns)
```
1. Navigate to TradingView for the asset
   → mcp__playwright__browser_navigate
   → Wait 3 seconds for chart render

2. Extract price and change data
   → mcp__playwright__browser_snapshot
   → Parse price selectors

3. Take chart screenshot
   → mcp__playwright__browser_take_screenshot
   → Save to screenshots/trading/

4. Navigate to CoinGecko for fundamentals
   → mcp__playwright__browser_navigate
   → Extract market cap, volume, rank

5. Cross-reference data sources
   → Compare prices across sources
   → Note any discrepancies
```

### Step 3: Visual Chart Analysis

When analyzing screenshots or chart data, identify:

```
CHART_ANALYSIS:
- Candlestick Patterns: [doji, hammer, engulfing, etc.]
- Moving Averages: [above/below key MAs]
- Trend Lines: [upward/downward channels]
- Support/Resistance: [horizontal levels]
- Volume Profile: [high/low volume zones]
- RSI/Momentum: [overbought/oversold if visible]
```

### Step 4: Generate Thesis

Compile all data into the Trade Thesis Structure above.

### Step 5: Log to KnowledgeBase

**CRITICAL**: Save analysis to memory for future learning.

```
KNOWLEDGE_SAVE:
{
  "task_type": "market_analysis",
  "asset": "[SYMBOL]",
  "thesis_direction": "bullish|bearish|neutral",
  "key_levels": { "support": [], "resistance": [] },
  "confidence": "high|medium|low",
  "timestamp": "[ISO]",
  "outcome": "pending"
}
```

### Step 6: Signal Completion

```
BRIDGE_SIGNAL:PLAN_COMPLETED
{
  "planId": "MI-XXXXXX",
  "status": "success",
  "summary": "Analysis complete for [ASSET]",
  "data": {
    "price": "[current]",
    "trend": "[direction]",
    "confidence": "[level]"
  }
}
```

## Multi-Asset Comparison

For comparing multiple assets:

```
COMPARISON_ANALYSIS:
==================================================
Comparison: [ASSET1] vs [ASSET2]
Timestamp: [ISO]

| Metric        | [ASSET1]    | [ASSET2]    |
|---------------|-------------|-------------|
| Price         | $X          | $Y          |
| 24h Change    | X%          | Y%          |
| Market Cap    | $X          | $Y          |
| Volume        | $X          | $Y          |
| Trend         | [direction] | [direction] |

Relative Strength: [Which is stronger and why]
Correlation: [How they move together]
Recommendation: [Which looks better for analysis]
==================================================
```

## Error Handling

### If Price Data Not Found
1. Try alternative selectors from self-correction skill
2. Check if site layout changed
3. Try alternative data source
4. Report partial data with disclaimer

### If Site Blocked/CAPTCHA
1. Screenshot the block
2. Report: "BLOCKED: [site] requires verification"
3. Fall back to alternative source
4. Never attempt to bypass

### If Data Discrepancy
1. Note the discrepancy in analysis
2. Use average or most recent
3. Cite all sources with their values
4. Explain which you're using and why

## Output Formats

### Quick Price Check
```
PRICE_CHECK: [ASSET]
Price: $X (Source: TradingView)
24h: +X% / -X%
Trend: [Bullish/Bearish/Sideways]
```

### Full Analysis
Use the complete Trade Thesis Structure above.

### Alert Format (for WhatsApp)
```
MARKET_ALERT: [ASSET]
Current: $X
Change: X%
Level Hit: [Support/Resistance at $Y]
Action: [Monitor/Caution/Opportunity]
```

## Integration Points

### With tactical-planning
- ALWAYS create plan before multi-step analysis
- Use BRIDGE_SIGNAL for progress updates

### With web-operator
- Use stealth timing (2-3s delays)
- Handle cookie popups first
- Take screenshots for evidence

### With self-correction
- If selectors fail, invoke self-correction
- Update this skill's selectors if fixes found

### With KnowledgeBase
- Save every analysis for learning
- Query past analyses for similar assets
- Track prediction accuracy over time

## Important Rules

1. **Data First** - Never speculate without data
2. **Source Everything** - Always cite where data comes from
3. **Risk Warnings** - Always include risk disclaimers
4. **No Trading Advice** - Analysis only, never "buy" or "sell" recommendations
5. **Log Everything** - Save to KnowledgeBase for learning
6. **Signal Progress** - Use BRIDGE_SIGNAL for WhatsApp updates
7. **Stealth Browsing** - Use web-operator patterns to avoid blocks
