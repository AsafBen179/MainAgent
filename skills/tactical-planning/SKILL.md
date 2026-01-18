---
name: tactical-planning
description: This skill should be used when the user asks to "create a plan", "plan a mission", "analyze multiple steps", "execute a complex task", "monitor progress", or when starting any multi-step web automation, trading analysis, or research task that requires structured execution.
version: 2.0.0
allowed-tools:
  - Read
  - Write
  - Bash
  - TodoWrite
---

# Tactical Planning Skill - Structured Execution with WhatsApp Signaling

You are an autonomous tactical planner. Before executing complex tasks, you MUST create a structured plan. Plans are logged with special prefixes so the WhatsApp bridge can intercept and relay progress to the user.

## When to Create a Plan

**ALWAYS create a plan for:**
- Tasks with 3+ distinct steps
- Web automation involving multiple pages
- Data extraction from multiple sources
- Trading analysis across multiple assets
- Any task the user wants to monitor remotely

**Skip planning for:**
- Simple single-step tasks (one URL, one action)
- Quick lookups or single screenshots
- Direct answers from memory

## BRIDGE_SIGNAL Protocol

The WhatsApp bridge monitors output for special prefixes. Use these EXACTLY as shown:

### Plan Creation
```
BRIDGE_SIGNAL:PLAN_CREATED
{
  "planId": "TP-[6 random chars]",
  "goal": "[What we're achieving]",
  "category": "trading|research|automation|monitoring",
  "steps": [number of steps],
  "estimatedActions": [total MCP calls expected]
}
```

### Plan Started
```
BRIDGE_SIGNAL:PLAN_STARTED
{
  "planId": "TP-XXXXXX",
  "message": "Starting execution..."
}
```

### Step Progress
```
BRIDGE_SIGNAL:STEP_PROGRESS
{
  "planId": "TP-XXXXXX",
  "step": [current step number],
  "total": [total steps],
  "action": "[What's happening]",
  "status": "started|completed|failed|skipped"
}
```

### Plan Completed
```
BRIDGE_SIGNAL:PLAN_COMPLETED
{
  "planId": "TP-XXXXXX",
  "status": "success|partial|failed",
  "summary": "[Brief outcome description]",
  "data": { [extracted data if any] }
}
```

### Error Signal
```
BRIDGE_SIGNAL:PLAN_ERROR
{
  "planId": "TP-XXXXXX",
  "step": [step where error occurred],
  "error": "[Error description]",
  "action": "retry|skip|abort|self_correct"
}
```

## Plan Structure Template

When creating a plan, use this exact format:

```
========================================
TACTICAL PLAN: TP-[ID]
========================================

STATUS: DRAFT

GOAL: [Clear description of what we're achieving]
CATEGORY: [trading | research | automation | monitoring]

SUCCESS CRITERIA:
  1. [Measurable outcome 1]
  2. [Measurable outcome 2]
  3. [Measurable outcome 3]

PRE-CONDITIONS:
  [ ] [Required condition 1]
  [ ] [Required condition 2]

STEPS:
----------------------------------------
[ ] Step 1: [action verb] [target]
    Tool: [which MCP tool or action]
    Expected: [what should happen]
    On Failure: [retry | skip | abort | self_correct]

[ ] Step 2: [action verb] [target]
    Tool: [which MCP tool or action]
    Expected: [what should happen]
    On Failure: [retry | skip | abort | self_correct]

[ ] Step 3: [action verb] [target]
    Tool: [which MCP tool or action]
    Expected: [what should happen]
    On Failure: [retry | skip | abort | self_correct]
----------------------------------------

ESTIMATED DURATION: [X actions]
========================================
```

## Example Plans

### Example 1: Crypto Analysis Plan
```
========================================
TACTICAL PLAN: TP-A7X9K2
========================================

STATUS: APPROVED

GOAL: Analyze ETH/BTC ratio and market sentiment
CATEGORY: trading

SUCCESS CRITERIA:
  1. Current ETH/BTC price extracted
  2. 24h change percentage captured
  3. Chart screenshot saved
  4. Trend direction identified

PRE-CONDITIONS:
  [x] TradingView accessible
  [x] Playwright MCP available

STEPS:
----------------------------------------
[x] Step 1: Navigate to TradingView
    Tool: mcp__playwright__browser_navigate
    Expected: Page loads with chart
    On Failure: retry

[ ] Step 2: Wait for price element
    Tool: mcp__playwright__browser_wait
    Expected: Price visible
    On Failure: self_correct

[ ] Step 3: Extract price data
    Tool: mcp__playwright__browser_snapshot
    Expected: DOM with price values
    On Failure: retry

[ ] Step 4: Capture chart screenshot
    Tool: mcp__playwright__browser_take_screenshot
    Expected: Image saved
    On Failure: skip

[ ] Step 5: Analyze and summarize
    Tool: [internal analysis]
    Expected: Trend assessment
    On Failure: abort
----------------------------------------

ESTIMATED DURATION: 5 actions
========================================
```

### Example 2: Multi-Site Research Plan
```
========================================
TACTICAL PLAN: TP-B3M5N8
========================================

STATUS: DRAFT

GOAL: Compare BTC price across 3 exchanges
CATEGORY: research

SUCCESS CRITERIA:
  1. BTC/USDT prices from Binance, Coinbase, Kraken
  2. Price differences calculated
  3. Arbitrage opportunity identified if >0.5%

PRE-CONDITIONS:
  [ ] All exchange sites accessible
  [ ] No rate limiting active

STEPS:
----------------------------------------
[ ] Step 1: Get Binance BTC price
    Tool: mcp__playwright__browser_navigate + snapshot
    Expected: Price extracted
    On Failure: skip (continue with others)

[ ] Step 2: Get Coinbase BTC price
    Tool: mcp__playwright__browser_navigate + snapshot
    Expected: Price extracted
    On Failure: skip

[ ] Step 3: Get Kraken BTC price
    Tool: mcp__playwright__browser_navigate + snapshot
    Expected: Price extracted
    On Failure: skip

[ ] Step 4: Calculate differences
    Tool: [internal calculation]
    Expected: Percentage diff computed
    On Failure: abort

[ ] Step 5: Generate report
    Tool: [internal]
    Expected: Summary with recommendation
    On Failure: abort
----------------------------------------

ESTIMATED DURATION: 8 actions
========================================
```

## Execution Flow

### Phase 1: Planning
```
1. Receive task from user/trigger
2. Analyze complexity (steps needed)
3. Create plan with TACTICAL PLAN format
4. Output: BRIDGE_SIGNAL:PLAN_CREATED
5. If user approval needed, wait for confirmation
```

### Phase 2: Execution
```
1. Output: BRIDGE_SIGNAL:PLAN_STARTED
2. For each step:
   a. Output: BRIDGE_SIGNAL:STEP_PROGRESS (started)
   b. Execute the action using appropriate tool
   c. Check result
   d. If success: BRIDGE_SIGNAL:STEP_PROGRESS (completed)
   e. If failure: Handle per On Failure strategy
3. Continue until all steps done or abort
```

### Phase 3: Completion
```
1. Compile results from all steps
2. Generate summary
3. Output: BRIDGE_SIGNAL:PLAN_COMPLETED
4. Return final data/report to user
```

## Failure Handling Strategies

### retry
```
Max attempts: 3
Delay between: 2 seconds
If still fails: escalate to skip or abort
```

### skip
```
Log the skip reason
Continue to next step
Mark final status as "partial" if critical step skipped
```

### abort
```
Stop execution immediately
Output: BRIDGE_SIGNAL:PLAN_ERROR
Report what was completed vs what failed
```

### self_correct
```
1. Invoke self-correction skill
2. Analyze why step failed
3. Apply fix if possible
4. Retry with corrected approach
5. If still fails: escalate to skip/abort
```

## Integration with Other Skills

### web-operator
- All web navigation steps use web-operator patterns
- Stealth timing is applied automatically
- Site-specific selectors from web-operator are used

### self-correction
- When On Failure = self_correct, invoke that skill
- Pass error message and page state
- Apply any suggested fixes before retry

## Plan Storage

Plans should be logged for future reference:
```
Location: logs/plans/
Format: TP-[ID].json
Content: Full plan + execution results
```

## Output Examples for WhatsApp

The bridge will format signals for WhatsApp like this:

**Plan Created:**
```
📋 New Plan: TP-A7X9K2
Goal: Analyze ETH/BTC ratio
Steps: 5
Category: Trading
```

**Progress Update:**
```
🔄 TP-A7X9K2 [2/5]
Extracting price data...
```

**Completion:**
```
✅ Plan TP-A7X9K2 Complete!
ETH/BTC: 0.0524 (+2.3%)
Trend: Bullish recovery
```

**Error:**
```
⚠️ TP-A7X9K2 Error at Step 3
Selector not found
Action: Attempting self-correction...
```

## Important Rules

1. **Always signal progress** - The user may be watching via WhatsApp
2. **Use exact BRIDGE_SIGNAL format** - The bridge parses these literally
3. **Plan before acting** - Complex tasks need roadmaps
4. **Handle failures gracefully** - Don't crash, recover or report
5. **Keep plans atomic** - Each step should do ONE thing
6. **Estimate accurately** - Set realistic expectations
7. **Save plans** - Future reference and learning
