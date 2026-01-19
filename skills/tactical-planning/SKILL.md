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

---

## ⛔ MANDATORY PLATFORM RULE ⛔

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   ALL TRADING PLANS MUST USE BINANCE DEMO - NO EXCEPTIONS                     ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ✅ ONLY URL ALLOWED: https://demo.binance.com/en/*                          ║
║                                                                               ║
║   ⛔ FORBIDDEN URLs:                                                          ║
║      - https://www.tradingview.com/*     ← NEVER USE FOR TRADING              ║
║      - https://www.binance.com/*         ← NEVER USE (REAL MONEY)             ║
║                                                                               ║
║   Every trading plan MUST include URL validation step                         ║
║   If URL is not demo.binance.com → ABORT THE PLAN                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

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

## PRIMARY EXECUTION ENVIRONMENT: BINANCE DEMO

**⚠️ All trading analysis and execution plans MUST use Binance DEMO only.**

```
╔═══════════════════════════════════════════════════════════════════╗
║                    CRITICAL SAFETY RULE                           ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ✅ ONLY USE: https://demo.binance.com/en/*                       ║
║  ❌ NEVER USE: https://www.binance.com/* (REAL MONEY)             ║
║  ❌ NEVER USE: https://binance.com/* (REAL MONEY)                 ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Binance DEMO URLs for Plans

```
SPOT TRADING:
  URL: https://demo.binance.com/en/trade/SOL_USDT?type=spot
  Template: https://demo.binance.com/en/trade/[BASE]_[QUOTE]?type=spot

FUTURES TRADING:
  URL: https://demo.binance.com/en/futures/SOLUSDT
  Template: https://demo.binance.com/en/futures/[SYMBOL]

CHARTING:
  The Binance interface has TradingView charts built-in
  Click "TradingView" tab to access advanced charting
```

### Auth Verification Step (Required for Trading Plans)

```
[ ] Step 0: Verify Binance Authentication
    Tool: Bash (file existence check only)
    Check: sessions/binance_auth.json exists?
    If NO:
      - Warn: "Demo trading unavailable"
      - Option: Continue with read-only analysis
    If YES:
      - Session will be loaded by Playwright MCP
      - Proceed to Step 1
```

### Demo Trading Safety Check (Required for Order Plans)

```
[ ] Step X: MOCK MODE VERIFICATION ⚠️ CRITICAL
    Tool: mcp__playwright__browser_snapshot
    Expected: "MOCK" badge visible in order form area
    On Failure: ABORT - Do not proceed without MOCK mode

    CHECK:
    - Look for [data-testid="mock-trading-badge"]
    - Look for span:has-text("MOCK")
    - Look for "Mock Balance" indicator
    - If ANY real trading indicators → ABORT IMMEDIATELY
```

---

## Example Plans

### Example 1: Binance DEMO Crypto Analysis Plan
```
========================================
TACTICAL PLAN: TP-A7X9K2
========================================

STATUS: APPROVED

GOAL: Analyze SOL/USDT on Binance DEMO with 5-indicator stack
CATEGORY: trading
PLATFORM: demo.binance.com (DEMO ONLY)

SUCCESS CRITERIA:
  1. Current SOL/USDT price extracted from Binance DEMO
  2. 5 indicators checked (SMC, Liquidity, Volume Profile, EMA 200, RSI)
  3. Chart screenshot saved
  4. Gold Standard 5-pillar consensus determined

PRE-CONDITIONS:
  [x] Binance DEMO accessible (demo.binance.com)
  [x] Playwright MCP available
  [ ] Binance auth available (optional for read-only)

STEPS:
----------------------------------------
[ ] Step 0: Check Binance Auth
    Tool: Bash (Test-Path sessions/binance_auth.json)
    Expected: True or False
    On Failure: continue (read-only mode)

[x] Step 1: Navigate to Binance DEMO Spot Trading
    Tool: mcp__playwright__browser_navigate
    URL: https://demo.binance.com/en/trade/SOL_USDT?type=spot
    Expected: Page loads with chart (verify demo.binance.com in URL)
    On Failure: retry

[ ] Step 2: Wait for TradingView chart to load
    Tool: mcp__playwright__browser_wait (3-4 seconds)
    Expected: Chart container visible
    On Failure: self_correct

[ ] Step 3: Extract price data
    Tool: mcp__playwright__browser_snapshot
    Expected: Current price from .showPrice
    On Failure: retry

[ ] Step 4: Set timeframe to 4H
    Tool: mcp__playwright__browser_click
    Target: Timeframe selector → 4H
    Expected: 4H candles displayed
    On Failure: retry

[ ] Step 5: Capture 4H chart screenshot
    Tool: mcp__playwright__browser_take_screenshot
    Expected: Image saved
    On Failure: skip

[ ] Step 6: Analyze 5-indicator consensus
    Tool: [internal analysis]
    Expected: Gold Standard rating (0-5)
    On Failure: abort
----------------------------------------

ESTIMATED DURATION: 7 actions
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

## MTF Alignment Check (Trading Plans Only)

**For ANY trading analysis plan, this check is MANDATORY:**

### Timeframe Alignment Verification Step

Add this step to ALL trading/SMC analysis plans:

```
[ ] Step X: MTF Alignment Verification
    Tool: [internal analysis]
    Input: 4H screenshot + 1H screenshot
    Expected: Timeframe consensus determined
    On Failure: abort (cannot proceed without alignment)

    ALIGNMENT_CHECK:
    ├─ 4H Bias: [BULLISH / BEARISH / RANGING]
    ├─ 1H Alignment: [✅ ALIGNED / ❌ CONFLICTING]
    ├─ Trade Direction Allowed: [LONG ONLY / SHORT ONLY / NONE]
    └─ Proceed to Thesis: [YES / NO - Market Disconnect]
```

### Trading Plan Template with MTF Check (Binance)

```
========================================
TACTICAL PLAN: SMC-[ID]
========================================

STATUS: DRAFT
CATEGORY: trading
PLATFORM: BINANCE (Primary)

GOAL: SMC Analysis for [ASSET] on Binance

MTF ALIGNMENT REQUIREMENT:
  [ ] 4H Chart analyzed FIRST
  [ ] 4H Bias locked before LTF analysis
  [ ] 1H/15M must ALIGN with 4H trend
  [ ] EMA 200 position confirms trend
  [ ] If conflict → Output "Market Disconnect"

5-INDICATOR STACK:
  [ ] Smart Money Concepts (LuxAlgo)
  [ ] Liquidity Sweeps
  [ ] Volume Profile (Fixed Range)
  [ ] EMA 200
  [ ] RSI/MACD (optional)

STEPS:
----------------------------------------
[ ] Step 0: Check Binance Auth
    Tool: Bash (Test-Path sessions/binance_auth.json)
    Expected: True or False (continue either way for analysis)
    On Failure: continue (read-only mode)

[ ] Step 1: Navigate to [ASSET] on Binance DEMO
    Tool: mcp__playwright__browser_navigate
    URL: https://demo.binance.com/en/trade/[ASSET]_USDT?type=spot
    Expected: Chart loads (verify demo.binance.com in URL)
    On Failure: retry

[ ] Step 2: Wait for TradingView tab to load
    Tool: mcp__playwright__browser_wait (3-4 seconds)
    Expected: Chart container visible
    On Failure: self_correct

[ ] Step 3: Set timeframe to 4H
    Tool: mcp__playwright__browser_click
    Target: Timeframe selector → 4H
    Expected: 4H candles displayed
    On Failure: retry

[ ] Step 4: Capture 4H chart screenshot
    Tool: mcp__playwright__browser_take_screenshot
    Expected: 4H_analysis.png saved
    On Failure: retry

[ ] Step 5: Analyze 4H structure + EMA 200 position
    Tool: [internal analysis]
    Expected: Determine BULLISH or BEARISH
    On Failure: abort
    OUTPUT:
      4H_BIAS = [direction]
      EMA_200_POSITION = [price above/below]

[ ] Step 6: Set timeframe to 1H
    Tool: mcp__playwright__browser_click
    Target: Timeframe selector → 1H
    Expected: 1H candles displayed
    On Failure: retry

[ ] Step 7: Capture 1H chart screenshot
    Tool: mcp__playwright__browser_take_screenshot
    Expected: 1H_analysis.png saved
    On Failure: retry

[ ] Step 8: MTF ALIGNMENT CHECK ⚠️ CRITICAL
    Tool: [internal verification]
    Expected: 1H aligns with 4H bias
    On Failure: Output "Market Disconnect" and ABORT

    CHECK:
    - If 4H=BULLISH and 1H shows Short setup → ABORT
    - If 4H=BEARISH and 1H shows Long setup → ABORT
    - If price below EMA 200 but bias BULLISH → CAUTION
    - If aligned → PROCEED to thesis

[ ] Step 9: 5-Pillar Gold Standard Check
    Tool: [internal analysis]
    Expected: Score 0-5 based on:
      1. Trend Alignment (HTF matches LTF)
      2. SMC Setup (BOS/CHoCH + OB/FVG)
      3. Liquidity Sweep Confirmation
      4. Volume Profile POI Match
      5. EMA 200 Trend Filter
    On Failure: Report partial score

[ ] Step 10: Generate Trade Thesis (only if aligned)
    Tool: [internal]
    Expected: SMC Setup with POI, SL, TP
    On Failure: abort

    THESIS FORMAT:
    ┌─────────────────────────────────────────┐
    │ SYMBOL: [ASSET]/USDT                    │
    │ DIRECTION: [LONG/SHORT]                 │
    │ ENTRY: $[price]                         │
    │ STOP LOSS: $[price]                     │
    │ TAKE PROFIT: $[price]                   │
    │ R:R: [X]:1                              │
    │ GOLD STANDARD: [X/5]                    │
    │ EMA 200: [Above/Below] at $[price]      │
    └─────────────────────────────────────────┘
----------------------------------------

ESTIMATED DURATION: 11 actions
========================================
```

### Demo Trading Order Plan Template (Binance Mock Mode)

```
========================================
TACTICAL PLAN: DEMO-[ID]
========================================

STATUS: DRAFT
CATEGORY: demo_trading
PLATFORM: BINANCE (Mock Mode REQUIRED)

GOAL: Execute Paper Trade for [ASSET] on Binance DEMO

SAFETY REQUIREMENTS (ALL MUST PASS):
  [ ] URL is demo.binance.com (NOT www.binance.com)
  [ ] Binance auth exists (sessions/binance_auth.json)
  [ ] User logged in (user menu visible)
  [ ] Paper/Demo balance displayed (virtual funds only)

TRADE PARAMETERS:
  Symbol:     [ASSET]/USDT
  Direction:  [LONG/SHORT]
  Order Type: [Limit/Market]
  Entry:      $[price]
  Amount:     [quantity]
  Stop Loss:  $[price]
  Take Profit: $[price]

STEPS:
----------------------------------------
[ ] Step 0: Verify Binance Auth Exists
    Tool: Bash (Test-Path sessions/binance_auth.json)
    Expected: True
    On Failure: ABORT - "Cannot demo trade without auth"

[ ] Step 1: Navigate to Binance DEMO Spot Trading
    Tool: mcp__playwright__browser_navigate
    URL: https://demo.binance.com/en/trade/[ASSET]_USDT?type=spot
    Expected: Trading page loads (verify demo.binance.com)
    On Failure: retry

[ ] Step 2: Wait for page load
    Tool: mcp__playwright__browser_wait (4 seconds)
    Expected: Order form visible
    On Failure: self_correct

[ ] Step 3: Verify User Logged In
    Tool: mcp__playwright__browser_snapshot
    Expected: User avatar/menu visible, no login button
    On Failure: ABORT - "Session expired, re-run capture-binance-auth.js"

[ ] Step 4: VERIFY DEMO URL ⚠️ CRITICAL
    Tool: mcp__playwright__browser_snapshot
    Expected: URL contains "demo.binance.com"
    On Failure: ABORT - "Not on demo.binance.com. DO NOT PROCEED."

    SAFETY CHECK:
    ┌──────────────────────────────────────────────────┐
    │ ✅ URL must be: demo.binance.com/*               │
    │ ❌ If www.binance.com → ABORT IMMEDIATELY        │
    │ ❌ If binance.com → ABORT IMMEDIATELY            │
    │ ❌ If real balance shown → ABORT IMMEDIATELY     │
    │ ✅ Only proceed on demo.binance.com              │
    └──────────────────────────────────────────────────┘

[ ] Step 5: Take Pre-Order Screenshot
    Tool: mcp__playwright__browser_take_screenshot
    Expected: Screenshot showing demo.binance.com URL
    On Failure: ABORT - "Cannot verify demo environment"

[ ] Step 6: Select Order Type
    Tool: mcp__playwright__browser_click
    Target: [Limit/Market] button
    Expected: Order type selected
    On Failure: retry

[ ] Step 7: Enter Price (if Limit order)
    Tool: mcp__playwright__browser_type
    Target: Price input field
    Value: [entry price]
    Expected: Price entered
    On Failure: retry

[ ] Step 8: Enter Amount
    Tool: mcp__playwright__browser_type
    Target: Amount input field
    Value: [quantity]
    Expected: Amount entered
    On Failure: retry

[ ] Step 9: Final DEMO URL Verification Before Submit
    Tool: mcp__playwright__browser_snapshot
    Expected: Confirm still on demo.binance.com
    On Failure: ABORT - "URL changed from demo site"

[ ] Step 10: Submit Mock Order
    Tool: mcp__playwright__browser_click
    Target: Buy/Sell button
    Expected: Order submitted
    On Failure: retry

[ ] Step 11: Capture Order Confirmation
    Tool: mcp__playwright__browser_take_screenshot
    Expected: Confirmation visible
    On Failure: skip (check open orders manually)

[ ] Step 12: Verify in Open Orders
    Tool: mcp__playwright__browser_snapshot
    Expected: New order appears in list
    On Failure: skip
----------------------------------------

ESTIMATED DURATION: 13 actions
========================================
```

### BRIDGE_SIGNAL for Demo Trading

```
BRIDGE_SIGNAL:DEMO_ORDER
{
  "planId": "DEMO-XXXXXX",
  "symbol": "[ASSET]/USDT",
  "direction": "LONG|SHORT",
  "orderType": "Limit|Market",
  "entry": "[price]",
  "amount": "[quantity]",
  "status": "submitted|filled|failed",
  "mockVerified": true,
  "screenshotPath": "[path]"
}
```

---

### MTF Check Signal for WhatsApp

```
BRIDGE_SIGNAL:MTF_CHECK
{
  "planId": "SMC-XXXXXX",
  "asset": "[SYMBOL]",
  "htf_bias": "BULLISH|BEARISH|RANGING",
  "ltf_alignment": "ALIGNED|CONFLICTING",
  "trade_allowed": "LONG|SHORT|NONE",
  "proceed": true|false
}
```

**If alignment fails, output:**
```
BRIDGE_SIGNAL:MARKET_DISCONNECT
{
  "planId": "SMC-XXXXXX",
  "asset": "[SYMBOL]",
  "reason": "4H is [X] but 1H shows [Y] setup",
  "recommendation": "Wait for realignment",
  "next_check": "[X hours]"
}
```

---

## Important Rules

1. **Always signal progress** - The user may be watching via WhatsApp
2. **Use exact BRIDGE_SIGNAL format** - The bridge parses these literally
3. **Plan before acting** - Complex tasks need roadmaps
4. **Handle failures gracefully** - Don't crash, recover or report
5. **Keep plans atomic** - Each step should do ONE thing
6. **Estimate accurately** - Set realistic expectations
7. **Save plans** - Future reference and learning
8. **MTF First for Trading** - NEVER skip timeframe alignment check
9. **4H is Law** - Trade direction must match HTF bias
10. **No Conflict Trades** - If timeframes disagree, output "Market Disconnect"

---

## UNIFIED EXECUTIVE PROTOCOL INTEGRATION

### Pre-Plan Learning Loop

**Before creating ANY plan, query KnowledgeBase:**

```
BRIDGE_SIGNAL:LEARNING_QUERY
{
  "phase": "pre_task",
  "query": "tactical_plan [category] [goal_keywords]",
  "purpose": "Retrieve similar past plans and lessons learned"
}

→ Check for:
  - Similar plans executed before
  - Steps that commonly fail
  - Estimated vs actual action counts
  - Category-specific patterns
```

### Post-Plan Learning Save

**After plan execution completes, save to KnowledgeBase:**

```
BRIDGE_SIGNAL:LEARNING_SAVE
{
  "phase": "post_task",
  "task_type": "tactical_plan",
  "plan_id": "[TP-XXXXXX]",
  "category": "[trading|research|automation|monitoring]",
  "outcome": "success|partial|failed",
  "steps_planned": [N],
  "steps_completed": [M],
  "steps_failed": [X],
  "failure_reasons": ["..."],
  "lesson": "[What to remember for next time]"
}
```

### Executive Summary Format (General Tasks)

**End EVERY plan execution with this format:**

```
📌 EXECUTIVE SUMMARY
════════════════════════════════════════════════════════
📋 Task: [Plan goal - one line]
📝 Bottom Line: [What was achieved in 1-2 sentences]

📊 Key Metrics:
  • Plan ID: [TP-XXXXXX]
  • Category: [trading/research/automation/monitoring]
  • Steps Completed: [M/N]
  • Actions Executed: [X]
  • Success Rate: [X%]

⚡ Action: [Next steps / What to do with results]

🛡️ Risk: [Any failures, partial completions, or concerns]
════════════════════════════════════════════════════════
```

### Executive Summary Format (Trading Plans)

**For trading category plans, include MTF Consensus:**

```
📌 EXECUTIVE SUMMARY
════════════════════════════════════════════════════════
📋 Task: SMC Analysis Plan for [ASSET]
📝 Bottom Line: [Bullish/Bearish] on 4H, [alignment] on 1H. [Setup assessment]

📊 Key Metrics:
  • Plan ID: [SMC-XXXXXX]
  • Current Price: $[price]
  • 4H Trend: [BULLISH/BEARISH/RANGING]
  • 1H Alignment: [✅ ALIGNED / ❌ CONFLICTING]
  • POI: [OB/FVG] at $[price]
  • R:R Ratio: [X:1]

⚡ Action: [LONG at $X / SHORT at $X / WAIT / NO TRADE]

🛡️ Risk: Invalidation at $[price]

MTF CONSENSUS: [✅ PROCEED / ❌ MARKET DISCONNECT]
════════════════════════════════════════════════════════
```

### Path Constants

```
BASE_PATH:    C:\MainAgent
Plans:        C:\MainAgent\logs\plans\
Screenshots:  C:\MainAgent\screenshots\
Logs:         C:\MainAgent\logs\
Memory:       C:\MainAgent\memory\
```

### Complete Plan Execution Flow with BRIDGE_SIGNAL

```
1. BRIDGE_SIGNAL:LEARNING_QUERY (pre-task)

2. BRIDGE_SIGNAL:PLAN_CREATED
   {"planId": "...", "goal": "...", "steps": N}

3. BRIDGE_SIGNAL:PLAN_STARTED
   {"planId": "...", "message": "Starting execution..."}

4. For each step:
   BRIDGE_SIGNAL:STEP_PROGRESS
   {"planId": "...", "step": N, "total": M, "status": "started|completed|failed"}

5. [If trading] BRIDGE_SIGNAL:MTF_CHECK
   [If conflict] BRIDGE_SIGNAL:MARKET_DISCONNECT

6. BRIDGE_SIGNAL:PLAN_COMPLETED
   {"planId": "...", "status": "success|partial|failed", "summary": "..."}

7. BRIDGE_SIGNAL:LEARNING_SAVE (post-task)

8. Output 📌 EXECUTIVE SUMMARY
```
