---
name: self-correction
description: This skill should be used when a web automation task fails, when an "element not found" error occurs, when a CSS selector is outdated, when the user asks to "fix a selector", "find alternative selector", "debug web automation", or when encountering DOM-related failures.
version: 2.0.0
allowed-tools:
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_navigate
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# Self-Correction Skill - Autonomous DOM Failure Analysis

You are an autonomous self-correcting agent. When web automation fails, you MUST analyze the failure, find alternatives, and apply permanent fixes to the codebase.

---

## ⛔ PLATFORM RULE: BINANCE DEMO ONLY

```
For ALL trading-related self-correction:
✅ Use ONLY: https://demo.binance.com/en/*
⛔ NEVER use: tradingview.com (deprecated)
⛔ NEVER use: www.binance.com (real money)

If fixing a selector for trading analysis → Target demo.binance.com
```

---

## Error Categories

When an error occurs, categorize it immediately:

| Category | Pattern Matches | Root Cause |
|----------|----------------|------------|
| `selector_outdated` | "not found", "no element", "couldn't find" | Page structure changed, selector no longer valid |
| `selector_timeout` | "timeout", "exceeded", "waiting" | Element didn't appear in time, slow load or conditional render |
| `dynamic_content` | "stale", "detached", "reference" | Element changed after query, page has live updates |
| `network_error` | "network", "failed to fetch", "ERR_" | Connection issue, server down, or blocked |
| `browser_crashed` | "target closed", "context destroyed" | Browser session died unexpectedly |
| `permission_denied` | "denied", "forbidden", "403", "401" | Auth required or action blocked |

## Root Cause Analysis

For each category, determine WHY it failed:

### selector_outdated
```
The selector "[SELECTOR]" no longer matches any element.
Likely causes:
- Website redesign or A/B test
- Class names generated dynamically (e.g., css-1a2b3c)
- Element moved to different container
```

### selector_timeout
```
Element "[SELECTOR]" did not appear within timeout.
Likely causes:
- Page loading slowly
- Element is lazy-loaded or behind interaction
- Element conditionally rendered based on state
```

### dynamic_content
```
Element became stale before interaction.
Likely causes:
- React/Vue re-render cycle
- Live data updates (prices, feeds)
- Animation or transition replaced element
```

## Alternative Selector Strategy

When a selector fails, find alternatives in this priority order:

### 1. data-testid (MOST RELIABLE - 95% confidence)
```
[data-testid="price-display"]
[data-test="submit-button"]
[data-cy="login-form"]
```

### 2. aria-label (STABLE - 90% confidence)
```
[aria-label="Close dialog"]
[aria-label="Search"]
```

### 3. ID (GOOD if not dynamic - 85% confidence)
```
#main-price
#submit-btn
```
WARNING: Skip IDs with random suffixes like `#price-a7x9k2`

### 4. Semantic HTML + Role (GOOD - 80% confidence)
```
button[type="submit"]
input[name="email"]
[role="dialog"]
[role="navigation"]
```

### 5. Class names (LESS RELIABLE - 60% confidence)
```
.price-value
.btn-primary
```
WARNING: Avoid generated classes like `.css-1x2y3z` or `.sc-bdnxRM`

### 6. Text content (LAST RESORT - 50% confidence)
```
//button[contains(text(), 'Submit')]
//span[text()='Price']
```

## Execution Protocol

### Step 1: Capture Current State
```
Use: mcp__playwright__browser_snapshot
Purpose: Get current page DOM to analyze
```

### Step 2: Search for Alternatives
In the snapshot, search for:
1. `data-testid` attributes near the expected location
2. `aria-label` attributes matching the element purpose
3. Unique IDs that aren't randomly generated
4. Stable class patterns (semantic names, not hashes)

### Step 3: Verify Alternative Works
```
Use: mcp__playwright__browser_click or appropriate action
Test the new selector before committing to it
```

### Step 4: Apply Permanent Fix
**CRITICAL**: When you find a working selector, update the source files!

```
Use: Grep to find where the old selector is used
Then: Edit tool to replace with new selector
```

Example fix workflow:
```
1. Grep for ".old-price-class" in skills/ and src/
2. Found in: skills/web-operator/SKILL.md line 64
3. Edit: Replace ".old-price-class" with "[data-testid='price']"
4. Log: "SELF_CORRECTION: Updated selector in web-operator/SKILL.md"
```

### Step 5: Document the Learning
Output a learning record:
```
LEARNING_RECORD:
- Site: demo.binance.com
- Old Selector: .showPrice
- New Selector: [data-testid="last-price"]
- Reason: Class name changed in site update
- Confidence: 95%
- Date: [timestamp]
```

## Retry Strategy by Category

| Category | Strategy | Max Retries |
|----------|----------|-------------|
| selector_outdated | Find alternative, then retry | 3 |
| selector_timeout | Increase timeout to 30s, retry | 2 |
| dynamic_content | Add 500ms delay, re-query, retry | 3 |
| network_error | Exponential backoff (2s, 4s, 8s) | 3 |
| browser_crashed | Restart browser session | 1 |
| permission_denied | Report to user, do not retry | 0 |

## Site-Specific Selector Memory

### Binance DEMO (demo.binance.com) - PRIMARY PLATFORM
```
⚠️ ALL TRADING ANALYSIS MUST USE demo.binance.com ONLY

Price: .showPrice OR [class*="showPrice"] OR [data-testid="last-price"]
Volume: .subValue OR [data-testid="volume"]
Order Book: .orderbook-container OR [data-testid="orderbook"]
Buy Button: [data-testid="submit-buy"] OR button.buy-button
Sell Button: [data-testid="submit-sell"] OR button.sell-button
TradingView Tab: button:has-text("TradingView")
Timeframe: .timeframe-selector button
```

### TradingView (tradingview.com) - DEPRECATED
```
⛔ DO NOT USE tradingview.com for trading analysis
⛔ Use demo.binance.com instead (has TradingView charts built-in)

If selector needed for TradingView embedded in Binance:
Price: [data-testid="qc-price"] OR .tv-symbol-price-quote__value
Chart: .chart-markup-table canvas
```

### CoinGecko (coingecko.com) - For price reference only
```
Price: [data-converter-target="price"] OR .tw-text-3xl
Change: [data-price-change-percentage]
Market Cap: [data-stat="market_cap"]
```

### Zeet/Israeli Beaches
```
Beach Status: [data-beach-status] OR .beach-condition
Wave Height: .wave-info, [data-wave]
Temperature: .temp-display, [data-temp]
```

## Output Format

When self-correction completes, output:
```
SELF_CORRECTION_RESULT:
  status: success|failed
  category: [error_category]
  original_selector: [what failed]
  new_selector: [what works]
  file_updated: [path if permanent fix applied]
  confidence: [0-100]%
  action_taken: [description]
```

## Important Rules

1. **Always try to fix permanently** - Don't just work around issues, update the source
2. **Prefer data-testid** - They're designed to be stable
3. **Avoid fragile selectors** - No random hashes, no deep nesting
4. **Document changes** - Future you needs to understand why
5. **Test before committing** - Verify the new selector works
6. **Report unfixable issues** - Some things need human intervention

---

## UNIFIED EXECUTIVE PROTOCOL INTEGRATION

### Pre-Correction Learning Loop

**Before attempting any correction, query KnowledgeBase:**

```
BRIDGE_SIGNAL:LEARNING_QUERY
{
  "phase": "pre_task",
  "query": "selector_fix [site_domain] [element_type]",
  "purpose": "Retrieve known working selectors and past fixes"
}

→ Check for:
  - Previously fixed selectors for this site
  - Pattern of selector changes (site redesigns)
  - Alternative selectors that worked before
  - Known anti-bot measures
```

### Post-Correction Learning Save

**CRITICAL: Save EVERY successful fix to prevent future failures:**

```
BRIDGE_SIGNAL:LEARNING_SAVE
{
  "phase": "post_task",
  "task_type": "self_correction",
  "site": "[domain]",
  "outcome": "success|partial|failed",
  "old_selector": "[what failed]",
  "new_selector": "[what works]",
  "selector_confidence": [0-100],
  "file_updated": "[path if permanent fix applied]",
  "lesson": "[Why it failed and how we fixed it]"
}
```

### Executive Summary Format

**End EVERY self-correction with:**

```
📌 EXECUTIVE SUMMARY
════════════════════════════════════════════════════════
📋 Task: Self-correction for [site/element]
📝 Bottom Line: [Fixed/Unable to fix] selector for [element purpose]

📊 Key Metrics:
  • Error Category: [selector_outdated/timeout/dynamic/etc]
  • Old Selector: [failed selector]
  • New Selector: [working selector]
  • Confidence: [X%]
  • File Updated: [path or N/A]

⚡ Action: [Retry original task / Escalate to user / Skip element]

🛡️ Risk: [Selector stability assessment - may break again if site updates]
════════════════════════════════════════════════════════
```

### Path Constants

```
Skills:      C:\MainAgent\skills\
Screenshots: C:\MainAgent\screenshots\
Logs:        C:\MainAgent\logs\
Memory:      C:\MainAgent\memory\
```

### Selector Update Workflow with BRIDGE_SIGNAL

```
1. BRIDGE_SIGNAL:SELF_CORRECTION_STARTED
   {"site": "[domain]", "element": "[description]", "error": "[message]"}

2. Analyze DOM snapshot

3. BRIDGE_SIGNAL:ALTERNATIVE_FOUND
   {"old": "[selector]", "new": "[selector]", "confidence": [X]}

4. Test the new selector

5. BRIDGE_SIGNAL:FIX_APPLIED
   {"file": "[path]", "line": [N], "status": "permanent|temporary"}

6. Save to KnowledgeBase

7. Output Executive Summary
```
