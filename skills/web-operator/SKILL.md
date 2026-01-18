---
name: web-operator
description: This skill should be used when the user asks to "browse a website", "open TradingView", "check crypto prices", "navigate to a URL", "take a screenshot", "scrape web data", "analyze a trading chart", or mentions web automation, browser tasks, or accessing external websites.
version: 1.0.0
---

# Web Operator Skill - Stealth Browser Automation

Use this skill for ANY task that requires accessing external websites, including:
- Trading platforms (TradingView, Binance, Coinbase, CoinGecko)
- News sites and data sources
- Web scraping and data extraction
- Taking screenshots of web pages
- Filling forms or interacting with web elements

## Key Features

1. **Headed Mode**: Browser is VISIBLE on desktop (headless: false) so actions can be monitored
2. **Anti-Detection**: Disabled automation flags, realistic user agent, human-like delays
3. **Session Management**: Reuse browser sessions across multiple operations

## How to Use

### Step 1: Launch Browser (if not already open)

Use the Playwright MCP tools available to you:
- `mcp__playwright__browser_navigate` - Navigate to URLs
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text
- `mcp__playwright__browser_snapshot` - Get page content
- `mcp__playwright__browser_take_screenshot` - Capture screenshots

### Step 2: Navigate with Stealth

When navigating, add realistic delays between actions:
1. Navigate to URL
2. Wait 1-2 seconds for page load
3. Interact with elements using human-like timing

### Step 3: Extract Data

Use `browser_snapshot` to get page content, then parse the relevant data.

## Example Workflow: Analyze ETH/BTC on TradingView

```
1. Navigate to https://www.tradingview.com/symbols/ETHBTC/
2. Wait for price element to load
3. Take screenshot of the chart
4. Extract price and trend data from page content
5. Return analysis to user
```

## Anti-Detection Best Practices

- Add random delays (1-3 seconds) between actions
- Don't interact too quickly with elements
- Use realistic viewport size (1920x1080)
- Let pages fully load before extracting data

## Common Selectors for Trading Sites

### TradingView
- Price: `.tv-symbol-price-quote__value`
- Change: `.tv-symbol-price-quote__change-value`
- Chart: `canvas.chart-markup-table`

### CoinGecko
- Price: `[data-converter-target="price"]`
- Change: `[data-price-change-percentage]`

### Binance
- Price: `.showPrice`
- Volume: `.subValue`

## Error Handling

If an element is not found:
1. Wait longer for dynamic content
2. Try alternative selectors
3. Use the self-correction skill to find new selectors
4. Take a screenshot for debugging

## Important Notes

- Browser runs in VISIBLE mode - user can see all actions
- Always close browser sessions when done to free resources
- For multi-step tasks, create a tactical plan first
