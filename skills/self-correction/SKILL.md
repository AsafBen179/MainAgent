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
- Site: tradingview.com
- Old Selector: .tv-symbol-price-quote__value
- New Selector: [data-testid="qc-price"]
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

### TradingView (tradingview.com)
```
Price: [data-testid="qc-price"] OR .tv-symbol-price-quote__value
Change %: .tv-symbol-price-quote__change-value
Chart: .chart-markup-table canvas
Volume: .valueItem-3H2Vhgkg
```

### CoinGecko (coingecko.com)
```
Price: [data-converter-target="price"] OR .tw-text-3xl
Change: [data-price-change-percentage]
Market Cap: [data-stat="market_cap"]
```

### Binance (binance.com)
```
Price: .showPrice OR [class*="showPrice"]
Volume: .subValue
Trade Button: [data-testid="trade-button"]
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
