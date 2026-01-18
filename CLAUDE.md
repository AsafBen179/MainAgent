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

## Skills System

Skills use SKILL.md format (instructions, not executable code). Claude reads these and uses available tools:

- **web-operator**: Uses `mcp__playwright__*` tools for browser automation
- **self-correction**: Analyzes DOM failures, updates selectors using Edit tool
- **tactical-planning**: Creates structured plans with `BRIDGE_SIGNAL:` prefixes for WhatsApp

Skills are discovered from `skills/` directory when Claude CLI runs with `cwd: BASE_PATH`.

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
