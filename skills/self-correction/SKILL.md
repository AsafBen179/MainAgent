---
name: self-correction
description: This skill should be used when a web automation task fails, when an "element not found" error occurs, when a CSS selector is outdated, when the user asks to "fix a selector", "find alternative selector", "debug web automation", or when encountering DOM-related failures.
version: 1.0.0
---

# Self-Correction Skill - DOM Failure Analysis and Selector Updates

Use this skill when web automation fails due to:
- Element not found errors
- Selector timeout errors
- Stale element references
- DOM structure changes on websites

## When to Trigger This Skill

1. **Automatic Trigger**: When web-operator encounters an error
2. **Manual Trigger**: When user reports a selector is broken
3. **Proactive Use**: Before retrying a failed web task

## Error Categories

| Category | Symptoms | Solution |
|----------|----------|----------|
| `selector_outdated` | Element not found | Find alternative selector |
| `selector_timeout` | Timeout waiting | Increase timeout or fix selector |
| `dynamic_content` | Stale element | Re-query before interaction |
| `network_error` | Navigation failed | Retry with backoff |
| `permission_denied` | Access blocked | Check authentication |

## How to Analyze a Failure

### Step 1: Categorize the Error

Look for patterns in the error message:
- "not found" / "no element" → `selector_outdated`
- "timeout" → `selector_timeout`
- "stale" → `dynamic_content`
- "network" / "failed to fetch" → `network_error`

### Step 2: Find Alternative Selectors

When a selector fails, search for alternatives in this order of reliability:

1. **data-testid** (most reliable)
   ```
   [data-testid="price-value"]
   ```

2. **aria-label** (good for accessibility)
   ```
   [aria-label="Current price"]
   ```

3. **ID** (if stable)
   ```
   #price-display
   ```

4. **Class** (less reliable, may change)
   ```
   .price-value
   ```

5. **Text content** (last resort)
   ```
   //span[contains(text(), 'Price')]
   ```

### Step 3: Test the New Selector

1. Use `browser_snapshot` to get current page state
2. Search for the element in the snapshot
3. Verify the selector matches the intended element
4. Update the code or retry with new selector

## Finding Selectors in Page Content

When you have page HTML, look for:

```javascript
// Search for data-testid attributes
page.match(/data-testid=["']([^"']+)["']/gi)

// Search for IDs
page.match(/id=["']([^"']+)["']/gi)

// Search for aria-labels
page.match(/aria-label=["']([^"']+)["']/gi)
```

## Learning from Corrections

When you successfully fix a selector:

1. **Document the change**: Old selector → New selector
2. **Note the website**: Which site/page this applies to
3. **Record confidence**: How reliable is the new selector?

This helps avoid the same failure in future tasks.

## Example: Fixing a TradingView Selector

**Scenario**: `.price-value` no longer works on TradingView

**Analysis**:
1. Error: "Element not found: .price-value"
2. Category: `selector_outdated`
3. Action: Search page for price-related elements

**Solution**:
1. Get page snapshot
2. Search for "price" in HTML
3. Find: `<span class="tv-symbol-price-quote__value">0.03524</span>`
4. New selector: `.tv-symbol-price-quote__value`
5. Retry with new selector

## Suggested Actions by Error Type

### selector_outdated
1. Inspect page HTML for new selector
2. Try data-testid or aria-label alternatives
3. Use browser DevTools patterns
4. Look for similar class names

### selector_timeout
1. Increase timeout value
2. Add explicit wait conditions
3. Check if page is loading slowly
4. Verify element is not in iframe

### dynamic_content
1. Re-query element before each interaction
2. Add small delay before interaction
3. Use waitForSelector before actions
4. Handle loading states

### network_error
1. Check URL accessibility
2. Retry with exponential backoff
3. Verify network connectivity
4. Check for rate limiting

## Integration with Web Operator

When web-operator fails:
1. This skill analyzes the failure
2. Proposes alternative approaches
3. Web-operator retries with fix
4. Success/failure is logged for learning

## Important Notes

- Always try the most reliable selector type first (data-testid)
- Websites change frequently - expect selectors to break
- Document fixes for future reference
- If multiple retries fail, report to user for manual review
