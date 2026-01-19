# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unified WhatsApp Agent - A WhatsApp bot that connects to Claude Code CLI for autonomous task execution with browser automation. Two services work together: WhatsApp API (port 3000) handles WhatsApp Web connection, Bridge (port 3001) orchestrates Claude CLI execution.

## Commands

```bash
# Start both services (WhatsApp API + Bridge)
npm start

# Start services separately
npm run start:api    # WhatsApp API on port 3000
npm run start:bridge # Bridge on port 3001

# Development with auto-reload
npm run dev
```

**Before starting:** Always check if ports are already in use:
```bash
netstat -ano | findstr ":3000 :3001"
```

## Architecture

```
WhatsApp Message → WhatsApp API (3000) → Webhook → Bridge (3001) → Claude CLI
                                                                      ↓
                                                              Native Skills
                                                              (web-operator,
                                                               self-correction,
                                                               tactical-planning)
                                                                      ↓
                                                            Response → WhatsApp
```

### Core Components

**WhatsApp API** (`src/whatsapp-api/`): whatsapp-web.js wrapper with QR auth, session persistence, webhook notifications.

**Bridge** (`src/bridge/`):
- `core/BridgeOrchestrator.js` - Main orchestration logic
- `claude/CmdExecutor.js` - Spawns Claude CLI with stream-json output
- `agent/AgentIntegration.js` - Guard + Knowledge Base integration
- `ai/SummarizerService.js` - OpenRouter AI for response formatting

**Native Skills** (`skills/`): SKILL.md instruction files that Claude reads and executes using available tools (Playwright MCP, Bash, Read, Write).

### Guard System

Commands are classified before execution:
- **GREEN**: Auto-execute (read operations, git status, npm list)
- **YELLOW**: Execute + log to WhatsApp (npm install, git commit, file modifications)
- **RED**: Require WhatsApp approval (registry, executables, credentials)
- **BLACKLISTED**: Never execute (format, diskpart, system destruction)

Configuration: `config/guard_policy.json`

## Key Files

| Path | Purpose |
|------|---------|
| `src/index.js` | Entry point - starts both services |
| `src/bridge/claude/CmdExecutor.js` | Claude CLI process spawning |
| `src/bridge/core/BridgeOrchestrator.js` | Message routing and orchestration |
| `skills/*/SKILL.md` | Native skill instructions |
| `config/guard_policy.json` | Command classification rules |
| `config/personas.json` | Multi-persona definitions |

## Environment Variables

Required in `.env`:
```bash
PORT=3000                    # WhatsApp API port
BRIDGE_PORT=3001             # Bridge port
BASE_PATH=C:\MainAgent       # Project root (for skill discovery)
WEBHOOK_URL=http://localhost:3001/webhook/whatsapp
WHATSAPP_API_URL=http://localhost:3000
OPENROUTER_API_KEY=...       # For AI summarization
```

## Data Persistence

- `sessions/` - WhatsApp session tokens (preserve between restarts)
- `data/bridge.db` - Bridge database (sql.js)
- `memory/` - Knowledge base SQLite
- `logs/` - Daily rotating logs (30-day retention)

## Persona System

Messages are routed to personas based on WhatsApp group name patterns (config/group-mappings.json):

| Persona | Trigger Groups | Focus |
|---------|---------------|-------|
| **TradingExpert** | "Trading Expert*" | SMC analysis, market intelligence |
| **Trading** | "Trading*", "Crypto*", "BTC*" | Price monitoring, news |
| **Dev** | "Dev*", "Code*" | Full development access |
| **General** | All other groups | Web browsing, Q&A |

Persona config: `config/personas.json` - includes system prompts, allowed skills, memory scopes.

## Skills System

Skills use SKILL.md format (instructions, not executable code). Claude reads these and uses available tools:

- **web-operator**: Uses `mcp__playwright__*` tools for browser automation
- **self-correction**: Analyzes DOM failures, updates selectors using Edit tool
- **tactical-planning**: Creates structured plans with `BRIDGE_SIGNAL:` prefixes for WhatsApp
- **market-intelligence**: SMC (Smart Money Concepts) analysis framework for trading groups

Skills are discovered from `skills/` directory when Claude CLI runs with `cwd: BASE_PATH`.

**Priority Skills:** TradingExpert persona has `market-intelligence` as priority skill - Claude should use this skill first for trading analysis requests.

## Web Task Detection

Bridge detects web-related tasks by keywords and enables Playwright MCP:
`tradingview`, `crypto`, `analyze`, `chart`, `browse`, `website`, `price`, `coingecko`, `binance`

## Message Flow Protocol

1. WhatsApp message received → webhook to `/webhook/whatsapp`
2. Guard classifies command
3. If web task detected → Playwright MCP enabled
4. Claude CLI spawned with `--output-format stream-json`
5. Output processed, summarized if >4000 chars
6. Response sent back via WhatsApp API `/api/send-to-chat`

## Logs Location

- `logs/bridge-YYYY-MM-DD.log` - Bridge activity
- `logs/agent-YYYY-MM-DD.log` - WhatsApp API activity
- `logs/error-YYYY-MM-DD.log` - Errors

---

## UNIFIED EXECUTIVE PROTOCOL

**This protocol applies to ALL tasks, not just trading. Follow it exactly.**

### 1. Mandatory Learning Loop (The Knowledge Engine)

Every task MUST include pre-task research and post-task documentation:

**PRE-TASK (Before Starting):**
```
BRIDGE_SIGNAL:LEARNING_QUERY
{
  "phase": "pre_task",
  "query": "[task type] + [context keywords]",
  "purpose": "Retrieve relevant lessons before execution"
}

→ Query KnowledgeBase for:
  - Similar past tasks
  - Known failure patterns
  - Successful approaches
  - Site-specific selectors (if web task)
```

**POST-TASK (After Completion):**
```
BRIDGE_SIGNAL:LEARNING_SAVE
{
  "phase": "post_task",
  "task_type": "[category]",
  "outcome": "success|partial|failed",
  "lesson": "[Key insight to remember]",
  "selectors_used": [...],  // if web task
  "duration_actions": [N]
}

→ Save to KnowledgeBase:
  - What worked
  - What failed (and why)
  - Any new patterns discovered
  - Selector updates (if applicable)
```

### 2. Executive Summary Format (Final Output)

**EVERY task must end with this structured summary:**

```
📌 EXECUTIVE SUMMARY
════════════════════════════════════════════════════════
📋 Task: [What was requested - one line]
📝 Bottom Line: [Key finding/result - 1-2 sentences]

📊 Key Metrics:
  • [Metric 1]: [Value]
  • [Metric 2]: [Value]
  • [Metric 3]: [Value]

⚡ Action: [What to do next - clear recommendation]

🛡️ Risk: [Main risk or caveat to consider]
════════════════════════════════════════════════════════
```

**Category-Specific Metrics:**

| Category | Metric Examples |
|----------|----------------|
| Trading | Price, % Change, Trend Direction, POI Distance, R:R Ratio |
| Research | Sources Found, Confidence %, Key Facts Count |
| Web Automation | Pages Visited, Data Points Extracted, Success Rate |
| Development | Files Changed, Tests Pass/Fail, Build Status |
| General | Query Answer, Confidence, Sources |

### 3. BRIDGE_SIGNAL Protocol (Internal Status Updates)

All internal progress updates use the `BRIDGE_SIGNAL:` prefix for WhatsApp relay:

```
BRIDGE_SIGNAL:TASK_STARTED
{
  "taskId": "[ID]",
  "category": "[trading|research|automation|dev|general]",
  "description": "[What we're doing]"
}

BRIDGE_SIGNAL:PROGRESS
{
  "taskId": "[ID]",
  "step": [N],
  "total": [M],
  "action": "[Current action]"
}

BRIDGE_SIGNAL:TASK_COMPLETED
{
  "taskId": "[ID]",
  "status": "success|partial|failed",
  "summary": "[Brief outcome]"
}
```

### 4. Architectural Constants

**Paths (Always Use These):**
```
BASE_PATH:       C:\MainAgent
SKILLS:          C:\MainAgent\skills\
SCREENSHOTS:     C:\MainAgent\screenshots\
LOGS:            C:\MainAgent\logs\
MEMORY:          C:\MainAgent\memory\
CONFIG:          C:\MainAgent\config\
```

**Browser Settings (For All Trading):**
```
headless: false  ← ALWAYS visible browser for trading personas
viewport: 1920x1080
userAgent: real Chrome
```

### 5. Protocol Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     UNIFIED TASK EXECUTION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. RECEIVE TASK                                                 │
│     └─→ Classify category (trading/research/dev/general)        │
│                                                                  │
│  2. PRE-TASK LEARNING LOOP                                       │
│     └─→ Query KnowledgeBase for relevant past lessons            │
│     └─→ Output: BRIDGE_SIGNAL:LEARNING_QUERY                     │
│                                                                  │
│  3. CREATE PLAN (if multi-step)                                  │
│     └─→ Use tactical-planning skill for complex tasks            │
│     └─→ Output: BRIDGE_SIGNAL:PLAN_CREATED                       │
│                                                                  │
│  4. EXECUTE STEPS                                                │
│     └─→ For each step: BRIDGE_SIGNAL:PROGRESS                    │
│     └─→ Handle errors with self-correction skill                 │
│                                                                  │
│  5. POST-TASK LEARNING LOOP                                      │
│     └─→ Save outcome to KnowledgeBase                            │
│     └─→ Output: BRIDGE_SIGNAL:LEARNING_SAVE                      │
│                                                                  │
│  6. EXECUTIVE SUMMARY                                            │
│     └─→ Always end with 📌 EXECUTIVE SUMMARY block               │
│     └─→ Output: BRIDGE_SIGNAL:TASK_COMPLETED                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Trading-Specific Additions

For trading analysis, the Executive Summary includes MTF Consensus:

```
📌 EXECUTIVE SUMMARY
════════════════════════════════════════════════════════
📋 Task: SMC Analysis for [ASSET]
📝 Bottom Line: [Bullish/Bearish] structure on 4H, [alignment status] on 1H

📊 Key Metrics:
  • Price: $[current]
  • 4H Trend: [BULLISH/BEARISH]
  • 1H Alignment: [✅ ALIGNED / ❌ CONFLICTING]
  • Nearest POI: [OB/FVG] at $[price] ([X%] away)
  • R:R Ratio: [X:1]

⚡ Action: [LONG at $X / SHORT at $X / WAIT for alignment / NO TRADE]

🛡️ Risk: Invalidation at $[price] ([X%] from entry)

MTF CONSENSUS: [✅ PROCEED / ❌ MARKET DISCONNECT]
════════════════════════════════════════════════════════
```

### 7. Risk-Adjusted Signal Protocol (RASP)

**MANDATORY for TradingExpert persona - calculates and persists trade signals.**

Reference: `skills/market-intelligence/SKILL.md` → "RISK-ADJUSTED SIGNAL PROTOCOL"

#### Leverage Calculation (ALWAYS CALCULATE)
```
Leverage = Max Risk (1-2%) / Distance to Stop Loss (%)

CONSTRAINTS:
⛔ MAX: 20x (never exceed)
⚠️ RECOMMENDED: 10x for high conviction
✅ SAFE: 1x-5x for standard setups

POSITION SIZING ($1,000 portfolio):
Position = Portfolio × Risk% × Leverage
```

#### Decision Tree: SIGNAL vs WAIT
```
[SIGNAL] - Output full signal when:
  ✅ HTF trend clear
  ✅ LTF aligned with HTF
  ✅ Liquidity sweep confirmed
  ✅ Confluence ≥ 4/5
  ✅ R:R ≥ 1:2
  ✅ EMA 200 aligned

[WAIT] - Output single reason when:
  ❌ ANY check fails
  → "WAIT: [reason]"
  → NO entry/SL/TP/leverage
```

#### Data Persistence (CRITICAL)
```
BEFORE WhatsApp output, ALWAYS save:

BRIDGE_SIGNAL:SIGNAL_SAVE
{
  "asset": "[SYMBOL]",
  "side": "[LONG/SHORT]",
  "entry": [price],
  "sl": [price],
  "tp1": [price],
  "tp2": [price],
  "tp3": [price],
  "leverage": [X],
  "position_usd": [calculated],
  "execution_ready": true
}
```

#### WhatsApp Signal Format
```
🚀 **SIGNAL: [ASSET]**

📶 **Direction:** [LONG/SHORT]
🎯 **Entry:** $[Price]
🛑 **Stop Loss:** $[Price] ([X%] risk)
🏆 **Targets:**
   • TP1: $[Price] (1:[X] R:R)
   • TP2: $[Price] (1:[X] R:R)
   • TP3: $[Price] (1:[X] R:R)

💰 **Risk Management:**
   • Leverage: [X]x
   • Risk: [1-2]%
   • Position: $[X] (of $1000 portfolio)
   • R:R Ratio: 1:[X]

💡 **Rationale:** [1-sentence SMC explanation]

⏰ **Valid Until:** [Invalidation condition]

───────────────────────────
📊 Source: Binance Demo
🔗 Confluence: [X]/5
```

#### WAIT Format
```
⏸️ **WAIT: [ASSET]**

📊 Current Price: $[Price]
🔍 Reason: [Single sentence]

📋 Watching For:
   • [Condition needed]

───────────────────────────
Next check: [Timeframe]
```
