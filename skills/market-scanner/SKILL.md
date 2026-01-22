---
name: market-scanner
description: SCOUT MODULE - Multi-Stream Asset Discovery & Autonomous Alert System. Discovers high-potential assets from Binance, manages dynamic watchlists, configures TradingView screener alerts, and triggers 5-Pillar analysis pipeline. Use for "scan market", "find opportunities", "setup alerts", "watchlist", "market scout".
version: 1.0.0
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
  - Bash
triggers:
  - market-intelligence
---

# Market Scanner Skill - THE SCOUT MODULE

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           MARKET SCANNER - THE SCOUT MODULE                                   ║
║           Multi-Stream Asset Discovery & Alert System                         ║
║                                                                               ║
║  This skill is the PRIMARY ENTRY POINT for all trading workflows.             ║
║  It discovers opportunities and triggers the 5-Pillar analysis pipeline.      ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  STREAM 1: BINANCE VOLUME LEADERS                                       │  ║
║  │  → Top 10 by 24H volume (USDT pairs only)                               │  ║
║  │  → Polling interval: Every 4 hours                                      │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  STREAM 2: MOVERS & SHAKERS                                             │  ║
║  │  → Top 10 Gainers (>$20M volume, >5% gain)                              │  ║
║  │  → Top 10 Losers (>$20M volume, >5% drop)                               │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  STREAM 3: NEW BLOOD FILTER                                             │  ║
║  │  → Binance New Listings (last 30 days)                                  │  ║
║  │  → Must meet liquidity threshold (>$10M volume)                         │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  STREAM 4: TRADINGVIEW SCREENER ALERTS                                  │  ║
║  │  → Autonomous webhook setup                                             │  ║
║  │  → Real-time trigger system                                             │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                              ↓                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────┐  ║
║  │  OUTPUT: DYNAMIC WATCHLIST + ALERT TRIGGERS                             │  ║
║  │  → Filtered to Binance USDT pairs only                                  │  ║
║  │  → Triggers market-intelligence for 5-Pillar analysis                   │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## HARD RULE: BINANCE CONSTRAINT

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║           ⛔ EXCHANGE CONSTRAINT - BINANCE ONLY ⛔                             ║
║                                                                               ║
║  The Scout MUST only consider assets available on BINANCE (USDT Pairs).       ║
║                                                                               ║
║  WHITELIST RULES:                                                             ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  ✅ Asset must be listed on Binance Spot                                      ║
║  ✅ Asset must have USDT trading pair                                         ║
║  ✅ Asset must have 24H volume > $10M USD                                     ║
║                                                                               ║
║  DISCARD RULES:                                                               ║
║  ─────────────────────────────────────────────────────────────────────────    ║
║  ❌ Assets from DexScreener NOT on Binance → DISCARD                          ║
║  ❌ Assets with only BTC/ETH pairs → DISCARD                                  ║
║  ❌ Assets with <$10M 24H volume → DISCARD                                    ║
║  ❌ Delisted or suspended assets → DISCARD                                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## DISCOVERY STREAMS

### Stream 1: Volume Leaders

```
VOLUME_LEADERS_STREAM:
═══════════════════════════════════════════════════════════════

SOURCE: Binance API / TradingView Screener
POLLING: Every 4 hours
CRITERIA:
  - Exchange: BINANCE
  - Quote: USDT
  - Sort by: 24H Volume (descending)
  - Limit: Top 10

OUTPUT FORMAT:
{
  "stream": "volume_leaders",
  "timestamp": "[ISO]",
  "assets": [
    {
      "symbol": "BTCUSDT",
      "price": 65000.00,
      "volume_24h_usd": 2500000000,
      "change_24h_pct": 2.5,
      "rank": 1
    },
    ...
  ]
}

ACTION: Add to dynamic watchlist if not already present

═══════════════════════════════════════════════════════════════
```

### Stream 2: Movers & Shakers

```
MOVERS_STREAM:
═══════════════════════════════════════════════════════════════

SOURCE: Binance API / TradingView Screener
POLLING: Every 4 hours
CRITERIA:
  - Exchange: BINANCE
  - Quote: USDT
  - 24H Volume > $20,000,000
  - Price Change (24H) > +5% (Gainers) OR < -5% (Losers)

GAINERS OUTPUT:
{
  "stream": "top_gainers",
  "timestamp": "[ISO]",
  "assets": [
    {
      "symbol": "XYZUSDT",
      "price": 1.25,
      "volume_24h_usd": 45000000,
      "change_24h_pct": 15.5,
      "category": "GAINER"
    },
    ...
  ]
}

LOSERS OUTPUT:
{
  "stream": "top_losers",
  "timestamp": "[ISO]",
  "assets": [
    {
      "symbol": "ABCUSDT",
      "price": 0.85,
      "volume_24h_usd": 32000000,
      "change_24h_pct": -12.3,
      "category": "LOSER"
    },
    ...
  ]
}

ACTION:
  - Gainers: Flag for potential SHORT opportunity (overextended)
  - Losers: Flag for potential LONG opportunity (oversold bounce)

═══════════════════════════════════════════════════════════════
```

### Stream 3: New Blood Filter

```
NEW_LISTINGS_STREAM:
═══════════════════════════════════════════════════════════════

SOURCE: Binance Announcements / New Listings Page
POLLING: Daily check
CRITERIA:
  - Listed within last 30 days
  - Has USDT pair
  - 24H Volume > $10,000,000 (liquidity threshold)
  - Not a stablecoin or wrapped token

OUTPUT FORMAT:
{
  "stream": "new_listings",
  "timestamp": "[ISO]",
  "assets": [
    {
      "symbol": "NEWUSDT",
      "listing_date": "2024-01-15",
      "days_since_listing": 5,
      "price": 2.50,
      "volume_24h_usd": 85000000,
      "ath": 3.20,
      "atl": 1.80,
      "current_vs_ath_pct": -22
    },
    ...
  ]
}

ACTION:
  - High volatility expected
  - Flag for close monitoring
  - Trigger 5-Pillar analysis when structure forms

═══════════════════════════════════════════════════════════════
```

### Stream 4: TradingView CEX Screener Alerts

```
TRADINGVIEW_CEX_SCREENER_STREAM:
═══════════════════════════════════════════════════════════════

SOURCE: TradingView CEX Screener (v2.0)
URL: https://www.tradingview.com/cex-screener/
MODE: Browser automation (headless: false)

SCREENER FILTERS:
┌─────────────────────────────────────────────────────────────┐
│ Filter                  │ Value                             │
├─────────────────────────┼───────────────────────────────────┤
│ Exchange                │ BINANCE                           │
│ Symbol Type             │ Spot                              │
│ Quote Currency          │ USDT                              │
│ 24H Volume              │ > 20,000,000                      │
│ 4H Price Change         │ > 3% OR < -3%                     │
│ RSI (14)                │ < 30 (oversold) OR > 70 (overbought) │
└─────────────────────────────────────────────────────────────┘

WEBHOOK ALERT CONFIGURATION:
{
  "webhook_url": "http://localhost:3001/webhook/tv-alert",
  "alert_name": "Scout_CEX_Binance_USDT",
  "condition": "Any symbol matches filters",
  "message_template": {
    "ticker": "{{ticker}}",
    "price": "{{close}}",
    "reason": "CEX Screener Alert",
    "exchange": "{{exchange}}",
    "volume": "{{volume}}",
    "change_4h": "{{change|4H}}",
    "rsi": "{{RSI}}"
  }
}

═══════════════════════════════════════════════════════════════
```

---

## TRADINGVIEW CEX SCREENER AUTOMATION

### Navigation Workflow

```
TV_CEX_SCREENER_SETUP:
═══════════════════════════════════════════════════════════════

STEP 1: Navigate to CEX Screener
────────────────────────────────
URL: https://www.tradingview.com/cex-screener/
Action: mcp__playwright__browser_navigate
Wait: 4000ms for full load

STEP 2: Dismiss Popups
──────────────────────
- Cookie consent
- Notification requests
- Welcome modals
Action: Press Escape, click close buttons

STEP 3: Configure Exchange Filter
─────────────────────────────────
1. Find "Exchange" column header or filter dropdown
2. Click to open filter options
3. Select "BINANCE" from the list
4. Apply filter

STEP 4: Configure Symbol Type Filter
────────────────────────────────────
1. Find "Symbol Type" filter
2. Click to open options
3. Select "Spot" (exclude futures/perps)
4. Apply filter

STEP 5: Configure Quote Currency Filter
───────────────────────────────────────
1. Find "Quote Currency" filter
2. Click to open options
3. Select "USDT"
4. Apply filter

STEP 6: Configure Volume Filter
───────────────────────────────
1. Click on "Volume 24H" column header
2. Set filter: "Greater than 20,000,000"
3. Apply filter

STEP 7: Configure Price Change Filter
─────────────────────────────────────
1. Add "Change % 4H" column if not visible
2. Set filter: "> 3%" OR "< -3%"
3. Apply filter

STEP 8: Configure RSI Filter (Optional)
───────────────────────────────────────
1. Add "RSI (14)" column if not visible
2. Set filter: "< 30" OR "> 70"
3. Apply filter

STEP 9: Delete Old Crypto-Screener Alert
────────────────────────────────────────
1. Go to Alerts panel
2. Find "Scout_Binance_USDT_Screener" alert
3. Delete to free alert slot

STEP 10: Create New CEX Alert
─────────────────────────────
1. Click "Alert" or bell icon on CEX screener
2. Configure alert:
   - Name: "Scout_CEX_Binance_USDT"
   - Condition: "Any symbol enters screener"
   - Webhook URL: http://localhost:3001/webhook/tv-alert
   - Message: {"ticker":"{{ticker}}","price":"{{close}}","reason":"CEX Screener Alert","exchange":"{{exchange}}"}
3. Click "Create"

STEP 11: Verify Alert Created
─────────────────────────────
- Check for success toast/notification
- Take screenshot for confirmation
- Log alert ID if available

═══════════════════════════════════════════════════════════════
```

### TradingView CEX Screener Selectors

```
TV_CEX_SCREENER_SELECTORS:
═══════════════════════════════════════════════════════════════

NAVIGATION:
  CEX Screener URL:    https://www.tradingview.com/cex-screener/
  Filter Dropdown:     [class*="filterDropdown"], [data-name="filter-menu"]
  Column Header:       th[class*="header"], [class*="tableHeader"]
  Apply Button:        button:has-text("Apply"), [class*="apply"]
  Reset Filters:       button:has-text("Reset"), [class*="reset"]

FILTER CONTROLS (CEX):
  Exchange Filter:     [data-field="exchange"], th:has-text("Exchange")
  Symbol Type Filter:  [data-field="type"], th:has-text("Symbol Type")
  Quote Currency:      [data-field="currency"], th:has-text("Quote")
  Volume 24H:          [data-field="volume24h"], th:has-text("Volume")
  Change 4H:           [data-field="change4h"], th:has-text("Chg 4H")
  RSI:                 [data-field="RSI"], th:has-text("RSI")

FILTER VALUES:
  Binance:             [data-value="BINANCE"], label:has-text("Binance")
  Spot:                [data-value="spot"], label:has-text("Spot")
  USDT:                [data-value="USDT"], label:has-text("USDT")
  Greater Than:        [data-operator="greater"], button:has-text(">")
  Less Than:           [data-operator="less"], button:has-text("<")

ALERT CREATION (CEX):
  Alert Button:        button[aria-label*="alert"], button:has-text("Alert")
  Export/Actions:      button[aria-label*="export"], button:has-text("Export")
  Alert Dialog:        [class*="alertDialog"], [role="dialog"]
  Alert Name Input:    input[name="name"], input[placeholder*="name"]
  Webhook Toggle:      [data-name="webhook"], label:has-text("Webhook")
  Webhook URL Input:   input[name="webhook"], input[placeholder*="URL"]
  Message Template:    textarea[name="message"], textarea[placeholder*="message"]
  Create Button:       button:has-text("Create"), button[type="submit"]

SCREENER TABLE (CEX):
  Table Container:     [class*="screenerTable"], [class*="cex-table"]
  Table Rows:          tr[class*="row"], tbody tr
  Symbol Column:       td[data-field="symbol"], td:first-child
  Price Column:        td[data-field="close"], td[data-field="price"]
  Volume Column:       td[data-field="volume"]
  Change Column:       td[data-field="change"]

═══════════════════════════════════════════════════════════════
```

---

## DYNAMIC WATCHLIST

### Watchlist File Structure

```
FILE: config/dynamic_watchlist.json
═══════════════════════════════════════════════════════════════

{
  "version": "1.0.0",
  "last_updated": "[ISO timestamp]",
  "polling_interval_hours": 4,
  "next_poll": "[ISO timestamp]",

  "binance_whitelist": {
    "description": "All valid Binance USDT pairs",
    "count": 350,
    "last_sync": "[ISO timestamp]",
    "pairs": ["BTCUSDT", "ETHUSDT", "SOLUSDT", ...]
  },

  "active_watchlist": {
    "description": "Currently monitored assets",
    "assets": [
      {
        "symbol": "SOLUSDT",
        "added_at": "[ISO]",
        "source": "volume_leaders",
        "priority": "HIGH",
        "last_analysis": "[ISO]",
        "analysis_result": "SIGNAL|WAIT",
        "notes": "Strong accumulation detected"
      },
      ...
    ]
  },

  "volume_leaders": {
    "last_poll": "[ISO]",
    "assets": [...]
  },

  "top_gainers": {
    "last_poll": "[ISO]",
    "assets": [...]
  },

  "top_losers": {
    "last_poll": "[ISO]",
    "assets": [...]
  },

  "new_listings": {
    "last_poll": "[ISO]",
    "assets": [...]
  },

  "alert_triggers": {
    "description": "Assets triggered by TradingView alerts",
    "pending_analysis": [
      {
        "symbol": "XYZUSDT",
        "triggered_at": "[ISO]",
        "trigger_reason": "RSI < 30",
        "price_at_trigger": 1.25,
        "status": "PENDING_ANALYSIS"
      }
    ]
  },

  "blacklist": {
    "description": "Assets excluded from scanning",
    "assets": ["USDCUSDT", "BUSDUSDT", "TUSDUSDT"],
    "reasons": {
      "USDCUSDT": "Stablecoin",
      "BUSDUSDT": "Stablecoin",
      "TUSDUSDT": "Stablecoin"
    }
  }
}

═══════════════════════════════════════════════════════════════
```

### Watchlist Validation

```
WATCHLIST_VALIDATION:
═══════════════════════════════════════════════════════════════

BEFORE adding any asset to watchlist:

1. CHECK BINANCE WHITELIST
   └─ Is symbol in binance_whitelist.pairs[]?
   └─ If NO → DISCARD with log: "Not on Binance"

2. CHECK BLACKLIST
   └─ Is symbol in blacklist.assets[]?
   └─ If YES → DISCARD with log: "Blacklisted: [reason]"

3. CHECK VOLUME THRESHOLD
   └─ Is 24H volume >= $10,000,000?
   └─ If NO → DISCARD with log: "Volume below threshold"

4. CHECK DUPLICATE
   └─ Is symbol already in active_watchlist?
   └─ If YES → UPDATE existing entry
   └─ If NO → ADD new entry

VALIDATION FLOW:
─────────────────
Asset "XYZUSDT" from DexScreener
  │
  ├─► Check binance_whitelist → NOT FOUND
  │
  └─► DISCARD: "XYZUSDT not available on Binance"

Asset "SOLUSDT" from TradingView Alert
  │
  ├─► Check binance_whitelist → FOUND ✓
  ├─► Check blacklist → NOT BLACKLISTED ✓
  ├─► Check volume → $500M > $10M ✓
  ├─► Check duplicate → NOT IN WATCHLIST
  │
  └─► ADD to active_watchlist with priority: HIGH

═══════════════════════════════════════════════════════════════
```

---

## BRIDGE INTEGRATION

### Webhook Receiver

```
WEBHOOK_ENDPOINT:
═══════════════════════════════════════════════════════════════

ENDPOINT: POST /webhook/tv-alert
PORT: 3001 (Bridge server)

INCOMING PAYLOAD (from TradingView):
{
  "ticker": "BINANCE:SOLUSDT",
  "price": "198.50",
  "exchange": "BINANCE",
  "volume": "450000000",
  "change_4h": "5.2",
  "rsi": "28"
}

PROCESSING FLOW:
────────────────
1. RECEIVE webhook payload
2. PARSE ticker → Extract symbol (SOLUSDT)
3. VALIDATE against Binance whitelist
   └─ If not on whitelist → LOG and DISCARD
4. CHECK if already in pending_analysis
   └─ If yes → UPDATE trigger time
   └─ If no → ADD to pending_analysis
5. TRIGGER market-intelligence orchestrator
   └─ Pass symbol for 5-Pillar analysis
6. RESPOND with 200 OK

RESPONSE:
{
  "status": "received",
  "symbol": "SOLUSDT",
  "action": "5_pillar_analysis_triggered",
  "timestamp": "[ISO]"
}

═══════════════════════════════════════════════════════════════
```

### Event Loop (Listening Mode)

```
SCOUT_EVENT_LOOP:
═══════════════════════════════════════════════════════════════

INITIALIZATION:
───────────────
1. Load dynamic_watchlist.json
2. Verify Binance whitelist is recent (<24H)
3. Check TradingView alert is active
4. Enter Listening Mode

LISTENING MODE:
───────────────
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   SCOUT LISTENING...                                        │
│   ─────────────────                                         │
│                                                             │
│   [WEBHOOK] Waiting for TradingView alerts...               │
│   [POLLING] Next watchlist refresh in: 3h 45m               │
│   [ACTIVE]  Monitoring 15 assets in watchlist               │
│                                                             │
│   Recent Activity:                                          │
│   • 10:30 - SOLUSDT triggered (RSI < 30)                    │
│   • 10:31 - 5-Pillar analysis started                       │
│   • 10:35 - SIGNAL generated for SOLUSDT                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

EVENT HANDLERS:
───────────────
ON webhook_received:
  1. Validate asset
  2. Add to pending_analysis
  3. Trigger market-intelligence
  4. Log event

ON polling_interval:
  1. Refresh volume_leaders
  2. Refresh top_gainers/losers
  3. Check new_listings
  4. Update dynamic_watchlist.json
  5. Log changes

ON analysis_complete:
  1. Update asset in watchlist
  2. Set last_analysis timestamp
  3. Store result (SIGNAL/WAIT)
  4. If SIGNAL: Forward to WhatsApp

═══════════════════════════════════════════════════════════════
```

---

## POLLING SCHEDULE

```
POLLING_SCHEDULE:
═══════════════════════════════════════════════════════════════

VOLUME LEADERS:
  Interval: Every 4 hours
  Times: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
  Source: Binance API or TradingView

TOP GAINERS/LOSERS:
  Interval: Every 4 hours
  Times: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
  Source: Binance API or TradingView

NEW LISTINGS:
  Interval: Daily
  Time: 00:00 UTC
  Source: Binance Announcements

BINANCE WHITELIST SYNC:
  Interval: Daily
  Time: 00:00 UTC
  Source: Binance API (exchangeInfo)

TRADINGVIEW ALERT CHECK:
  Interval: Continuous (webhook-based)
  Backup: Manual check every 24H

═══════════════════════════════════════════════════════════════
```

---

## TRIGGER TO 5-PILLAR ANALYSIS

```
ANALYSIS_TRIGGER:
═══════════════════════════════════════════════════════════════

WHEN an asset is ready for analysis (via alert or manual):

1. INVOKE market-intelligence orchestrator
   └─ Pass: symbol, trigger_source, trigger_reason

2. EXECUTE 5-Pillar workflow:
   Layer 1: SMC Core (Market Structure)
   Layer 2: Indicator Logic (Technical)
   Layer 3: Risk Management (Math)
   Layer 4: Social Sentiment (X)
   Layer 5: On-Chain Intel (Whales)

3. RECEIVE result:
   └─ SIGNAL: Full trade parameters
   └─ WAIT: Reason and conditions to watch

4. UPDATE watchlist:
   └─ last_analysis: [timestamp]
   └─ analysis_result: [SIGNAL/WAIT]
   └─ notes: [key finding]

5. IF SIGNAL:
   └─ Forward to WhatsApp via Bridge
   └─ Include all 5-pillar details
   └─ Include Whale Activity section

BRIDGE_SIGNAL:
{
  "action": "trigger_analysis",
  "symbol": "SOLUSDT",
  "source": "tv_screener_alert",
  "trigger_reason": "RSI < 30, 4H change > 3%",
  "price_at_trigger": 198.50,
  "timestamp": "[ISO]"
}

═══════════════════════════════════════════════════════════════
```

---

## EXECUTION COMMANDS

### Initialize Scout

```
SCOUT_INIT:
═══════════════════════════════════════════════════════════════

Command: node scripts/scout-init.js

Actions:
1. Create config/dynamic_watchlist.json if not exists
2. Sync Binance whitelist (all USDT pairs)
3. Populate initial volume_leaders
4. Populate initial gainers/losers
5. Check for new_listings
6. Verify TradingView session
7. Output initialization summary

═══════════════════════════════════════════════════════════════
```

### Setup TradingView Alert

```
SCOUT_SETUP_ALERT:
═══════════════════════════════════════════════════════════════

Command: node scripts/setup-tv-screener.js

Actions:
1. Launch browser (headless: false)
2. Navigate to TradingView crypto-screener
3. Apply all filters (Exchange, Quote, Volume, Change, RSI)
4. Create webhook alert
5. Verify alert is active
6. Save screenshot as proof
7. Log alert configuration

═══════════════════════════════════════════════════════════════
```

### Manual Scan

```
SCOUT_MANUAL_SCAN:
═══════════════════════════════════════════════════════════════

Command: node scripts/scout-scan.js [--full]

Actions:
1. Refresh all streams (volume, gainers, losers, new)
2. Update dynamic_watchlist.json
3. Report changes since last scan
4. Optionally trigger analysis for high-priority assets

═══════════════════════════════════════════════════════════════
```

---

## OUTPUT FORMATS

### Scout Status Report

```
SCOUT_STATUS:
═══════════════════════════════════════════════════════════════

📡 **SCOUT STATUS REPORT**

⏰ Last Poll: [timestamp]
⏰ Next Poll: [timestamp]

📊 **Watchlist Summary:**
   • Active Assets: 15
   • Volume Leaders: 10
   • Top Gainers: 8
   • Top Losers: 6
   • New Listings: 3
   • Pending Analysis: 2

🚨 **Recent Alerts:**
   • SOLUSDT - RSI < 30 (10:30 UTC)
   • ETHUSDT - 4H Change > 5% (09:15 UTC)

📈 **Analysis Queue:**
   1. SOLUSDT - Pending (triggered 5m ago)
   2. XRPUSDT - In Progress

✅ **TradingView Alert:** Active
✅ **Webhook Receiver:** Online
✅ **Binance Whitelist:** 350 pairs (synced 2h ago)

═══════════════════════════════════════════════════════════════
```

### Asset Discovery Notification

```
ASSET_DISCOVERED:
═══════════════════════════════════════════════════════════════

🔍 **NEW ASSET DISCOVERED**

Symbol: XYZUSDT
Source: TradingView Screener Alert
Trigger: RSI = 28 (Oversold)

📊 **Quick Stats:**
   • Price: $1.25
   • 24H Volume: $45,000,000
   • 4H Change: +5.2%
   • RSI (14): 28

🎯 **Action:** Queued for 5-Pillar Analysis
⏰ **ETA:** Starting in 30 seconds...

═══════════════════════════════════════════════════════════════
```

---

## ERROR HANDLING

```
ERROR_HANDLING:
═══════════════════════════════════════════════════════════════

TRADINGVIEW ERRORS:
───────────────────
IF screener page fails to load:
  → Retry 3 times with 10s delay
  → If still fails: Log error, notify user

IF alert creation fails:
  → Check if already exists (duplicate name)
  → Check webhook URL accessibility
  → Log detailed error for debugging

BINANCE API ERRORS:
───────────────────
IF API rate limited:
  → Wait 60 seconds, retry
  → Use cached data if available

IF asset not found:
  → Remove from watchlist
  → Log: "Asset delisted or unavailable"

WEBHOOK ERRORS:
───────────────
IF webhook payload invalid:
  → Log raw payload for debugging
  → Respond with 400 Bad Request

IF asset validation fails:
  → Log rejection reason
  → Do not trigger analysis

═══════════════════════════════════════════════════════════════
```

---

## INTEGRATION CHECKLIST

```
SCOUT_INTEGRATION_CHECKLIST:
═══════════════════════════════════════════════════════════════

SETUP:
[ ] TradingView session active (tv_auth.json)
[ ] Bridge server running on port 3001
[ ] Webhook endpoint accessible (/webhook/tv-alert)
[ ] Binance whitelist synced
[ ] dynamic_watchlist.json created
[ ] TradingView screener filters applied
[ ] TradingView webhook alert created

CONNECTIONS:
[ ] Scout → TradingView Screener (browser automation)
[ ] Scout → Binance API (whitelist sync)
[ ] TradingView → Bridge Webhook (alerts)
[ ] Scout → market-intelligence (analysis trigger)
[ ] market-intelligence → WhatsApp (signal delivery)

MONITORING:
[ ] Polling schedule active
[ ] Webhook receiver logging
[ ] Error notifications enabled
[ ] Watchlist auto-updates

═══════════════════════════════════════════════════════════════
```
