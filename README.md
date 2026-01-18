# Unified WhatsApp Agent

A powerful WhatsApp bot that connects to Claude Code CLI for autonomous task execution with browser automation, intelligent task processing, and multi-persona support.

## Features

- **WhatsApp Integration**: Full WhatsApp Web connection via whatsapp-web.js
- **Claude CLI Execution**: Autonomous task execution with real-time streaming output
- **Multi-Persona System**: Context-aware personas (TradingExpert, Dev, General) based on group
- **Native Skills**: Four core autonomous skills with SKILL.md instruction format
- **Browser Automation**: Stealth Playwright with anti-detection and headed mode
- **Smart Task Detection**: Automatic detection of web-related tasks for browser enablement
- **AI Summarization**: OpenRouter integration for intelligent response formatting
- **Guard System**: Command classification (GREEN/YELLOW/RED) for security
- **Knowledge Base**: SQLite-based learning with persona-scoped memory
- **Self-Correction**: Autonomous DOM failure analysis and selector updates
- **Tactical Planning**: Structured execution plans with WhatsApp progress signals

## Security Notice

> **All sensitive data is strictly excluded via `.gitignore`.**
>
> The following are NEVER committed:
> - WhatsApp session tokens (`sessions/`)
> - Local databases (`data/*.db`, `memory/*.db`)
> - Environment variables (`.env`)
> - API keys and credentials

## Architecture

```
┌─────────────────┐     Webhook      ┌─────────────────┐     spawn      ┌─────────────────┐
│  WhatsApp API   │ ───────────────> │     Bridge      │ ─────────────> │   Claude CLI    │
│   (port 3000)   │                  │   (port 3001)   │                │                 │
│                 │ <─────────────── │                 │ <───────────── │  + Native Skills│
│ whatsapp-web.js │     Response     │  Orchestrator   │    stdout      │  + Playwright   │
└─────────────────┘                  └─────────────────┘                └─────────────────┘
        │                                    │
        │ QR Code                            │ Persona Router
        v                                    v
   ┌─────────┐                    ┌──────────────────────┐
   │ Terminal│                    │  Guard + Knowledge   │
   └─────────┘                    │  + Personas + AI     │
                                  └──────────────────────┘
```

## Persona System

The agent automatically routes messages to specialized personas based on WhatsApp group context.

### Available Personas

| Persona | Trigger Groups | Focus | Allowed Skills |
|---------|---------------|-------|----------------|
| **TradingExpert** | "Trading Expert*", "Trade Analysis*" | Market intelligence, technical analysis | web-operator, market-intelligence, tactical-planning, self-correction |
| **Trading** | "Trading*", "Crypto*", "BTC*", "ETH*" | Price monitoring, news | web-operator, market-intelligence, tactical-planning |
| **Dev** | "Dev*", "Development*", "Code*" | Full development access | all skills |
| **General** | All other groups | Web browsing, Q&A | web-operator |

### Persona Routing Flow

```
WhatsApp Message (from "Crypto Signals" group)
         ↓
PersonaRouter.route("Crypto Signals")
         ↓
Match: ".*Crypto.*" → Trading persona
         ↓
Inject Trading system prompt + priority skill
         ↓
Claude executes with trading context
         ↓
Save to KnowledgeBase with category="trading"
```

### Configuration

**Group Mappings** (`config/group-mappings.json`):
```json
{
  "mappings": [
    { "groupNamePattern": "^Trading\\s*Expert.*", "persona": "TradingExpert", "priority": 1 },
    { "groupNamePattern": "^Trading.*|.*Crypto.*", "persona": "Trading", "priority": 2 },
    { "groupNamePattern": "^Dev.*|.*Code.*", "persona": "Dev", "priority": 3 },
    { "groupNamePattern": ".*", "persona": "General", "priority": 99 }
  ],
  "groupIdOverrides": {
    "specific_group_id@g.us": "TradingExpert"
  }
}
```

**Personas** (`config/personas.json`):
```json
{
  "TradingExpert": {
    "systemPrompt": "You are an expert cryptocurrency analyst...",
    "allowedSkills": ["web-operator", "market-intelligence", "tactical-planning"],
    "guardPolicy": "trading",
    "memoryScope": "trading",
    "prioritySkill": "market-intelligence"
  }
}
```

## Native Skills

Four autonomous skills are available in the `skills/` directory, using SKILL.md instruction format:

### 1. web-operator - Stealth Browser Automation

**Triggers:** "browse website", "open TradingView", "check crypto prices", "take screenshot"

**Features:**
- Headed mode (visible browser) for monitoring
- Anti-detection: realistic timing, proper viewport
- Site-specific selectors for TradingView, CoinGecko, Binance
- Cookie/popup handling

### 2. self-correction - DOM Failure Analysis

**Triggers:** "element not found", "fix selector", "debug web automation"

**Features:**
- Error categorization (selector_outdated, timeout, dynamic_content, network)
- Alternative selector finder with confidence scores
- Permanent fix application via Edit tool
- Site-specific selector memory

### 3. tactical-planning - Structured Execution Plans

**Triggers:** "create a plan", "plan a mission", "multi-step task"

**Features:**
- JSON execution plans with success criteria
- `BRIDGE_SIGNAL:` protocol for WhatsApp progress updates
- Failure handling strategies (retry, skip, abort, self_correct)
- Integration with other skills

### 4. market-intelligence - Trading Analysis Framework

**Triggers:** "market analysis", "trade thesis", "chart analysis", "price check"

**Features:**
- TradingView and CoinGecko data source configurations
- Trade Thesis structure template
- Visual chart analysis guidelines
- KnowledgeBase logging for learning
- Risk assessment framework

**Trade Thesis Output:**
```
TRADE_THESIS:
==================================================
Asset: ETH/BTC
1. CURRENT STATE - Price, Volume, Market Cap
2. TREND ANALYSIS - Direction, Strength, Evidence
3. KEY LEVELS - Support, Resistance, Pivot
4. VOLUME ANALYSIS - Confirmation/Divergence
5. RISK ASSESSMENT - Bull/Bear scenarios
6. CONFIDENCE LEVEL - High/Medium/Low
==================================================
```

## Components

### WhatsApp API (`src/whatsapp-api/`)
- **Port:** 3000
- **Purpose:** WhatsApp Web connection via whatsapp-web.js
- **Features:** QR code auth, session persistence, `sendSeen: false` fix

### Bridge (`src/bridge/`)
- **Port:** 3001
- **Purpose:** Claude CLI orchestration and response handling
- **Features:**
  - Persona routing based on group context
  - Claude CLI spawning with stream-json output
  - Playwright MCP for browser automation
  - AI-powered output summarization
  - Guard system with persona-specific policies
  - Knowledge base with scoped memory

### Agent Integration (`src/bridge/agent/`)
- **PersonaRouter**: Routes messages to personas based on group patterns
- **AgentIntegration**: Guard + Knowledge + Skills coordination
- **KnowledgeBase**: SQLite storage with persona-scoped categories

## Project Structure

```
├── skills/                         # Native Claude Code skills (SKILL.md format)
│   ├── web-operator/SKILL.md       # Stealth browser automation
│   ├── self-correction/SKILL.md    # DOM failure analysis
│   ├── tactical-planning/SKILL.md  # Structured execution plans
│   └── market-intelligence/SKILL.md # Trading analysis framework
├── src/
│   ├── index.js                    # Unified entry point
│   ├── whatsapp-api/
│   │   ├── index.js                # WhatsApp API server
│   │   ├── whatsappService.js      # whatsapp-web.js wrapper
│   │   └── messageHandler.js       # Message processing
│   └── bridge/
│       ├── index.js                # Bridge server entry
│       ├── app.js                  # Express app setup
│       ├── core/
│       │   └── BridgeOrchestrator.js   # Main orchestration + persona routing
│       ├── claude/
│       │   ├── CmdExecutor.js          # Claude CLI execution
│       │   └── SessionManager.js       # Session management
│       ├── agent/
│       │   ├── PersonaRouter.js        # Group-to-persona routing
│       │   ├── AgentIntegration.js     # Guard + Knowledge
│       │   └── KnowledgeBase.js        # Learning database
│       ├── ai/
│       │   └── SummarizerService.js    # Output formatting
│       └── whatsapp/
│           ├── WebhookHandler.js       # Webhook processing
│           └── ResponseSender.js       # Send responses
├── config/
│   ├── guard_policy.json           # Command classification rules
│   ├── personas.json               # Persona definitions
│   ├── group-mappings.json         # Group → Persona mappings
│   └── bridge.config.json          # Bridge settings
├── memory/                         # SQLite knowledge base (persona-scoped)
└── logs/                           # Application logs
```

## Configuration

### Environment Variables (`.env`)
```bash
# Server Ports
PORT=3000
BRIDGE_PORT=3001

# WhatsApp Settings
SESSION_PATH=./sessions
AUTO_CONNECT=true

# Webhook (WhatsApp API -> Bridge)
WEBHOOK_URL=http://localhost:3001/webhook/whatsapp

# WhatsApp API Connection (Bridge -> WhatsApp API)
WHATSAPP_API_URL=http://localhost:3000

# Claude CLI Base Path (where skills/ folder is located)
BASE_PATH=C:\MainAgent

# Browser Mode
HEADED_MODE=true

# OpenRouter API (for AI summarization)
OPENROUTER_API_KEY=your-api-key
OPENROUTER_MODEL=xiaomi/mimo-v2-flash:free

# Admin phones (comma separated)
ADMIN_PHONES=972501234567
```

## Installation

```bash
# Install dependencies
npm install

# Install Playwright MCP globally (for browser automation)
npm install -g @playwright/mcp

# Install Playwright browsers
npx playwright install chromium
```

## Usage

### Start Both Services
```bash
npm start
```

On first run, scan the QR code displayed in terminal with WhatsApp.

### Start Services Separately
```bash
# Terminal 1: WhatsApp API
npm run start:api

# Terminal 2: Bridge
npm run start:bridge
```

## Message Flow

1. **User sends WhatsApp message** to connected number/group
2. **WhatsApp API** receives message via whatsapp-web.js
3. **Webhook sent** to Bridge at `/webhook/whatsapp`
4. **PersonaRouter** matches group name → selects persona
5. **Guard classifies** command using persona's policy
6. **Bridge** detects if web task, enables Playwright MCP if needed
7. **Claude CLI** executes with persona prompt + priority skill
8. **Skills** may be invoked (market-intelligence for trading, etc.)
9. **Output processed** and saved to KnowledgeBase (persona-scoped)
10. **Response sent** back to WhatsApp group

## Task Examples

### Trading Analysis (TradingExpert Persona)
```
"Analyze ETH/BTC ratio on TradingView"
```
- Routes to TradingExpert persona
- Uses market-intelligence skill (priority)
- Creates Trade Thesis with support/resistance levels
- Saves analysis to trading-scoped memory

### Development Task (Dev Persona)
```
"Fix the bug in the login component"
```
- Routes to Dev persona
- Full skill access
- Standard guard policy

### General Query (General Persona)
```
"What's the weather in Tel Aviv?"
```
- Routes to General persona
- Web browsing only
- Restricted guard policy

## Guard Classification

Commands are classified into safety levels (per persona policy):

| Level | Description | Examples |
|-------|-------------|----------|
| **GREEN** | Safe operations | Read files, git status, npm list |
| **YELLOW** | Sensitive but allowed | npm install, git commit |
| **RED** | Requires approval | rm commands, git push --force |
| **BLACKLISTED** | Always blocked | System modification, credential access |

## Logs

Logs are stored in `logs/`:
- `bridge-YYYY-MM-DD.log` - Bridge activity (includes persona routing)
- `agent-YYYY-MM-DD.log` - WhatsApp API activity
- `error-YYYY-MM-DD.log` - Errors

## Troubleshooting

### Persona not detected correctly
- Check `config/group-mappings.json` patterns
- Verify group name matches expected pattern (case-insensitive)
- Check logs for "Persona routing" entries

### Skills not discovered
- Verify `BASE_PATH` in `.env` points to project root
- Check that `skills/` folder exists with `SKILL.md` files
- Skills use SKILL.md format, not TypeScript exports

### WhatsApp messages not sending
- Ensure the `sendSeen: false` option is set in whatsappService.js
- Check if WhatsApp session is authenticated (look for "ready" in logs)

### Browser not opening for web tasks
- Verify Playwright MCP is installed: `npm install -g @playwright/mcp`
- Check MCP config uses `node` directly, not `npx`
- Ensure web task keywords are in the command

## License

Private - All rights reserved

---

*Built with Claude Code + Native Skills + Playwright MCP + Multi-Persona System*
