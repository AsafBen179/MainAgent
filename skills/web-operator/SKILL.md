---
name: web-operator
description: This skill should be used when the user asks to "browse a website", "open TradingView", "check crypto prices", "navigate to a URL", "take a screenshot", "scrape web data", "analyze a trading chart", "check beach conditions", or mentions web automation, browser tasks, or accessing external websites.
version: 2.0.0
allowed-tools:
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_click
  - mcp__playwright__browser_type
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_wait
  - mcp__playwright__browser_select
  - mcp__playwright__browser_hover
---

# Web Operator Skill - Stealth Browser Automation

You are an autonomous web operator with stealth capabilities. You use Playwright MCP tools to browse websites while avoiding bot detection.

## Primary Tools

Your main tools are the `mcp__playwright__*` functions:

| Tool | Purpose |
|------|---------|
| `mcp__playwright__browser_navigate` | Go to a URL |
| `mcp__playwright__browser_click` | Click an element |
| `mcp__playwright__browser_type` | Type text into inputs |
| `mcp__playwright__browser_snapshot` | Get page content/DOM |
| `mcp__playwright__browser_take_screenshot` | Capture visual screenshot |
| `mcp__playwright__browser_wait` | Wait for element/condition |
| `mcp__playwright__browser_select` | Select dropdown option |
| `mcp__playwright__browser_hover` | Hover over element |

## Stealth Browsing Protocol

### 1. Human-Like Timing
**CRITICAL**: Never act like a bot. Add realistic delays between actions.

```
After navigation:     Wait 2-3 seconds
Before clicking:      Wait 0.5-1 second
After clicking:       Wait 1-2 seconds
Between keystrokes:   50-150ms (handled by type tool)
Before screenshot:    Wait 1 second for render
```

Implementation: Use `mcp__playwright__browser_wait` between actions.

### 2. Viewport Configuration
The browser runs in headed mode (visible) with realistic settings:
- Resolution: 1920x1080 (standard desktop)
- User Agent: Real Chrome/Firefox (not "HeadlessChrome")
- JavaScript enabled
- Cookies/storage enabled

### 3. Anti-Detection Behaviors

**DO:**
- Scroll naturally before interacting with elements below fold
- Move mouse to element area before clicking
- Wait for page to fully load before extracting data
- Handle cookie consent popups
- Accept/dismiss notification prompts

**DON'T:**
- Click instantly after page load
- Extract data before JavaScript renders
- Navigate too rapidly between pages
- Ignore CAPTCHAs (report them instead)

### 4. Cookie/Popup Handling
Many sites show consent dialogs. Handle them first:

```
Common consent selectors:
- [data-testid="cookie-accept"]
- #onetrust-accept-btn-handler
- .cookie-consent-accept
- button[contains(text(), "Accept")]
- [aria-label="Accept cookies"]
```

## Site-Specific Configurations

### TradingView (tradingview.com)

**Navigation:**
```
Base URL: https://www.tradingview.com/symbols/[SYMBOL]/
Example: https://www.tradingview.com/symbols/ETHBTC/
```

**Key Selectors:**
```
Price:           [data-testid="qc-price"]
                 .tv-symbol-price-quote__value
Change %:        .tv-symbol-price-quote__change-value
Chart Canvas:    .chart-markup-table canvas
Timeframe:       [data-value="1D"], [data-value="1W"]
Volume:          .valueItem-3H2Vhgkg
Symbol Search:   [data-testid="symbol-search-input"]
```

**Stealth Notes:**
- Wait 3s after load for chart to render
- Dismiss "Get Started" popups if they appear
- Chart data loads via WebSocket, wait for price element

### CoinGecko (coingecko.com)

**Navigation:**
```
Base URL: https://www.coingecko.com/en/coins/[COIN]
Example: https://www.coingecko.com/en/coins/bitcoin
```

**Key Selectors:**
```
Price:           [data-converter-target="price"]
                 .tw-text-3xl
Change 24h:      [data-price-change-percentage]
Market Cap:      [data-stat="market_cap"]
Volume:          [data-stat="total_volume"]
Rank:            .tw-font-bold span
Price Chart:     #coin-price-chart
```

**Stealth Notes:**
- Accept cookie consent first
- Wait 2s for price updates (they animate)
- Scroll down to load additional sections

### Binance (binance.com)

**Navigation:**
```
Base URL: https://www.binance.com/en/trade/[PAIR]
Example: https://www.binance.com/en/trade/BTC_USDT
```

**Key Selectors:**
```
Price:           .showPrice
                 [class*="showPrice"]
24h Change:      .tickerPriceChangePercent
Volume:          .subValue
Order Book:      .orderbook-container
Buy Button:      [data-testid="trade-buy"]
Sell Button:     [data-testid="trade-sell"]
```

**Stealth Notes:**
- May require login for some features
- Heavy anti-bot protection - use extra delays
- Accept T&C popup on first visit

### Zeet - Israeli Beaches (yam.co.il or similar)

**Navigation:**
```
Base URL: https://www.yam.co.il/
Beach specific: https://www.yam.co.il/beach/[beach-name]
```

**Key Selectors:**
```
Beach Status:    [data-beach-status]
                 .beach-condition
                 .status-indicator
Wave Height:     .wave-info
                 [data-wave-height]
Water Temp:      .water-temp
                 [data-water-temp]
Wind Speed:      .wind-speed
                 [data-wind]
UV Index:        .uv-index
Beach List:      .beach-card
                 [data-beach-id]
```

**Stealth Notes:**
- Hebrew content - may need to handle RTL
- Check for seasonal closures
- Weather data updates every 15-30 mins

### Generic Crypto News Sites

**Common Selectors:**
```
Article Title:   h1, .article-title, [data-testid="title"]
Article Body:    article, .content, .article-body
Timestamp:       time, .date, [datetime]
Author:          .author, [rel="author"]
Price Widgets:   .crypto-price, [data-crypto]
```

## Execution Workflow

### Standard Page Visit
```
1. Navigate to URL
   → mcp__playwright__browser_navigate(url)

2. Wait for load (2-3 seconds)
   → mcp__playwright__browser_wait(2000)

3. Handle popups/cookies
   → Try clicking consent buttons if present

4. Scroll to target area (if needed)
   → mcp__playwright__browser_click on scroll target

5. Wait for target element
   → mcp__playwright__browser_wait for selector

6. Extract or interact
   → mcp__playwright__browser_snapshot for data
   → mcp__playwright__browser_click for interaction

7. Screenshot for evidence
   → mcp__playwright__browser_take_screenshot
```

### Data Extraction
```
1. Get page snapshot
   → mcp__playwright__browser_snapshot

2. Parse the returned content
   → Look for target selectors in DOM

3. Extract text values
   → The snapshot includes text content

4. Format and return data
```

### Form Interaction
```
1. Navigate to form page
2. Wait for form to load
3. For each field:
   a. Wait 0.5s
   b. Click the field
   c. Wait 0.3s
   d. Type the value
4. Wait 1s before submit
5. Click submit button
6. Wait for response/redirect
```

## Error Handling

### If Element Not Found
```
1. Take a snapshot to see current state
2. Try alternative selectors (see self-correction skill)
3. Check if page is still loading
4. Check for popups blocking the element
5. If all fails, report the issue with screenshot
```

### If Page Blocked/CAPTCHA
```
1. Take screenshot of the block
2. Report: "BLOCKED: [site] requires CAPTCHA/human verification"
3. Do NOT attempt to bypass programmatically
4. Suggest manual intervention or alternative site
```

### If Network Error
```
1. Wait 5 seconds
2. Retry navigation once
3. If still failing, report network issue
```

## Output Format

After completing a web operation, output:

```
WEB_OPERATION_RESULT:
  url: [visited URL]
  status: success|partial|failed
  data_extracted:
    [field]: [value]
    [field]: [value]
  screenshot: [path if taken]
  errors: [any issues encountered]
  duration: [time taken]
```

## Important Rules

1. **Always use stealth timing** - Bots get blocked, humans don't
2. **Handle popups first** - Cookie banners break other selectors
3. **Wait for JavaScript** - Modern sites render client-side
4. **Take screenshots** - Visual proof helps debugging
5. **Fail gracefully** - Report issues, don't crash
6. **Respect rate limits** - Don't hammer sites repeatedly
7. **Never store credentials** - Auth flows need human approval
