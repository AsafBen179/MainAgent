---
name: tactical-planning
description: This skill should be used when the user asks to "create a plan", "plan a mission", "analyze multiple steps", "execute a complex task", "monitor progress", or when starting any multi-step web automation, trading analysis, or research task that requires structured execution.
version: 1.0.0
---

# Tactical Planning Skill - Structured Execution Plans

Use this skill to "think before acting" on complex, multi-step tasks. Create a roadmap before execution so:
- Progress can be monitored via WhatsApp
- Each step has clear success criteria
- Failures can be handled gracefully
- The user understands what will happen

## When to Create a Plan

**Always create a plan for:**
- Tasks with 3+ distinct steps
- Web automation involving multiple pages
- Data extraction from multiple sources
- Any task the user wants to monitor

**Skip planning for:**
- Simple single-step tasks
- Quick lookups or screenshots
- Direct answers from memory

## Plan Structure

### 1. Goal Definition

```
GOAL: [Clear description of what we're achieving]
CATEGORY: trading | research | data_extraction | automation
SUCCESS CRITERIA:
  - [Measurable outcome 1]
  - [Measurable outcome 2]
```

### 2. Pre-Conditions

Before starting, verify:
- Required access/permissions
- Network connectivity
- Previous data if needed

### 3. Step-by-Step Actions

Each step must have:
- **Action**: What to do (navigate, click, extract, etc.)
- **Target**: URL, selector, or description
- **Expected Outcome**: What should happen
- **On Failure**: abort | retry | skip | self_correct

## Plan Template

```
========================================
TACTICAL PLAN: [ID]
========================================

STATUS: DRAFT → APPROVED → EXECUTING → COMPLETED

GOAL: [Description]
CATEGORY: [Category]

SUCCESS CRITERIA:
  1. [Criterion 1]
  2. [Criterion 2]

PRE-CONDITIONS:
  [ ] [Condition 1]
  [ ] [Condition 2]

STEPS:
----------------------------------------
[ ] Step 1: [action]
    Target: [target]
    Expected: [outcome]
    On Failure: [strategy]

[ ] Step 2: [action]
    Target: [target]
    Expected: [outcome]
    On Failure: [strategy]
----------------------------------------

OUTCOME: [Pending]
========================================
```

## Example: Trading Analysis Plan

```
========================================
TACTICAL PLAN: TP-ABC123
========================================

STATUS: APPROVED

GOAL: Analyze ETH/BTC ratio on TradingView
CATEGORY: trading

SUCCESS CRITERIA:
  1. Extract current price
  2. Capture chart screenshot
  3. Identify trend direction
  4. Note key support/resistance levels

PRE-CONDITIONS:
  [x] TradingView accessible
  [x] Browser available

STEPS:
----------------------------------------
[x] Step 1: navigate
    Target: https://www.tradingview.com/symbols/ETHBTC/
    Expected: Page loads with chart
    On Failure: retry

[ ] Step 2: waitFor
    Target: .tv-symbol-price-quote__value
    Expected: Price element visible
    On Failure: self_correct

[ ] Step 3: screenshot
    Target: Full page
    Expected: Chart image saved
    On Failure: skip

[ ] Step 4: extract
    Target: Price, change %, volume
    Expected: Data extracted
    On Failure: retry
----------------------------------------

OUTCOME: Pending
========================================
```

## Execution Flow

### Phase 1: Planning
1. Receive task from user
2. Create plan with steps
3. Send plan summary to WhatsApp for approval

### Phase 2: Approval
1. User reviews plan
2. User approves or requests changes
3. Plan status changes to APPROVED

### Phase 3: Execution
1. Execute steps sequentially
2. Update status after each step
3. Send progress updates to WhatsApp
4. Handle failures per step strategy

### Phase 4: Completion
1. Mark plan as COMPLETED or FAILED
2. Summarize outcomes
3. Send final report to WhatsApp

## Progress Updates

Send updates to WhatsApp at key points:

```
📋 Plan Started: TP-ABC123
Goal: Analyze ETH/BTC on TradingView
Steps: 4

✅ Step 1/4: Navigated to TradingView
🔄 Step 2/4: Waiting for price element...

✅ Plan Completed!
- Price: 0.03524 BTC
- Change: +1.29%
- Trend: Recovering from lows
```

## Failure Handling Strategies

### abort
Stop execution immediately. Use for critical failures.

### retry
Retry the step (max 2-3 times). Use for transient errors.

### skip
Skip this step and continue. Use for optional steps.

### self_correct
Invoke self-correction skill to fix the issue, then retry.

## Saving Plans

Plans are saved to `plans/` directory:
- `plans/TP-ABC123.json` - Individual plan
- `plans/current.json` - Active plan

## Best Practices

1. **Keep steps atomic**: Each step does one thing
2. **Set realistic timeouts**: Web pages need time to load
3. **Include verification**: Confirm each step succeeded
4. **Plan for failure**: Define fallback strategies
5. **Communicate progress**: Keep user informed via WhatsApp

## Integration with Other Skills

- **web-operator**: Executes navigation and interaction steps
- **self-correction**: Fixes selector issues during execution

## Important Notes

- Always create a plan for complex tasks
- Send plan summary before starting execution
- Update WhatsApp with progress at each step
- Save plans for future reference and learning
