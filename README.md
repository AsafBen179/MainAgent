# Unified WhatsApp Agent

A powerful WhatsApp bot that connects to Claude Code CLI for autonomous task execution with browser automation, intelligent task processing, and multi-project support.

## Features

- **WhatsApp Integration**: Full WhatsApp Web connection via whatsapp-web.js
- **Claude CLI Execution**: Autonomous task execution with real-time streaming output
- **Native Skills**: Three core autonomous skills (webOperator, selfCorrection, tacticalPlanning)
- **Browser Automation**: Stealth Playwright with anti-detection and headed mode
- **Smart Task Detection**: Automatic detection of web-related tasks for browser enablement
- **AI Summarization**: OpenRouter integration for intelligent response formatting
- **Guard System**: Command classification (GREEN/YELLOW/RED) for security
- **Knowledge Base**: SQLite-based learning from successful/failed operations
- **Self-Correction**: Autonomous DOM failure analysis and selector updates
- **Tactical Planning**: Structured JSON execution plans for multi-step missions

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
        │ QR Code                            │ Agent Integration
        v                                    v
   ┌─────────┐                    ┌──────────────────────┐
   │ Terminal│                    │  Guard + Knowledge   │
   └─────────┘                    │  + Skills + AI       │
                                  └──────────────────────┘
```

## Native Skills

Three autonomous skills are available in the root `skills/` directory, following Claude Code native format:

### 1. webOperator.ts - Stealth Browser Automation

**Purpose:** Access external websites without bot detection.

**Features:**
- Headed mode (visible browser) for monitoring
- Anti-detection: disabled automation flags, realistic user agent
- Human-like delays and interactions
- Session management for browser reuse

**Actions:** `launch`, `navigate`, `click`, `type`, `screenshot`, `getContent`, `waitFor`, `evaluate`, `close`

**Example:**
```typescript
await webOperator({
  action: 'navigate',
  url: 'https://tradingview.com/symbols/ETHBTC',
  waitForSelector: '.tv-symbol-price-quote__value'
});
```

### 2. selfCorrection.ts - DOM Failure Analysis

**Purpose:** Automatically fix web automation failures.

**Features:**
- Error categorization (selector_outdated, timeout, network, etc.)
- Alternative selector finder from page content
- Memory-based learning from past corrections
- Automatic fix application

**Actions:** `analyzeFailure`, `findAlternatives`, `learnCorrection`, `getMemory`, `applyFix`, `categorizeError`

**Example:**
```typescript
const result = await selfCorrection({
  action: 'analyzeFailure',
  failedSelector: '#old-price',
  errorMessage: 'Element not found',
  pageContent: document.documentElement.outerHTML
});
// Returns alternative selectors with confidence scores
```

### 3. tacticalPlanning.ts - Structured Execution Plans

**Purpose:** "Think before acting" - create roadmaps for complex tasks.

**Features:**
- JSON execution plans with success criteria
- Step-by-step tracking with status
- Pre-condition verification
- WhatsApp bridge integration for monitoring

**Actions:** `create`, `addStep`, `approve`, `start`, `completeStep`, `getStatus`, `getSummary`, `abort`, `load`

**Example:**
```typescript
await tacticalPlanning({
  action: 'create',
  goal: 'Analyze ETH/BTC on TradingView',
  category: 'trading',
  successCriteria: ['Extract price', 'Capture chart', 'Identify trend'],
  steps: [
    { action: 'navigate', target: 'https://tradingview.com/symbols/ETHBTC' },
    { action: 'waitFor', target: '.tv-symbol-price-quote__value' },
    { action: 'screenshot', description: 'Capture chart' },
    { action: 'extract', target: '.tv-symbol-price-quote__value' }
  ]
});
```

## Components

### WhatsApp API (`src/whatsapp-api/`)
- **Port:** 3000
- **Purpose:** WhatsApp Web connection via whatsapp-web.js
- **Features:**
  - QR code display in terminal
  - Session persistence
  - Message sending/receiving with `sendSeen: false` fix
  - Webhook notifications to Bridge

### Bridge (`src/bridge/`)
- **Port:** 3001
- **Purpose:** Claude CLI orchestration and response handling
- **Features:**
  - Webhook receiver for WhatsApp messages
  - Claude CLI spawning with stream-json output
  - Session management per chat/project
  - Playwright MCP for browser automation
  - AI-powered output summarization
  - Guard system for command classification
  - Knowledge base for learning

### Agent Integration (`src/bridge/agent/`)
- **ExecutionGuard**: Classifies commands as safe/sensitive/dangerous
- **KnowledgeBase**: SQLite storage for lessons learned
- **Skills Configuration**: Loads and manages native skills

## Project Structure

```
├── skills/                         # Native Claude Code skills
│   ├── index.ts                    # Skills export and metadata
│   ├── webOperator.ts              # Stealth browser automation
│   ├── selfCorrection.ts           # DOM failure analysis
│   └── tacticalPlanning.ts         # Structured execution plans
├── src/
│   ├── index.js                    # Unified entry point
│   ├── whatsapp-api/
│   │   ├── index.js                # WhatsApp API server
│   │   ├── whatsappService.js      # whatsapp-web.js wrapper
│   │   ├── messageHandler.js       # Message processing
│   │   └── utils/                  # Logger, validator
│   └── bridge/
│       ├── index.js                # Bridge server entry
│       ├── app.js                  # Express app setup
│       ├── core/
│       │   ├── BridgeOrchestrator.js   # Main orchestration
│       │   ├── EventBus.js             # Event system
│       │   └── CommandQueue.js         # Task queue
│       ├── claude/
│       │   ├── CmdExecutor.js          # Claude CLI execution
│       │   ├── SessionManager.js       # Session management
│       │   └── OutputProcessor.js      # Output processing
│       ├── agent/
│       │   ├── AgentIntegration.js     # Guard + Knowledge
│       │   ├── ExecutionGuard.js       # Command classification
│       │   └── KnowledgeBase.js        # Learning database
│       ├── ai/
│       │   ├── OpenRouterClient.js     # AI summarization
│       │   └── SummarizerService.js    # Output formatting
│       └── whatsapp/
│           ├── WhatsAppClient.js       # API client
│           ├── WebhookHandler.js       # Webhook processing
│           └── ResponseSender.js       # Send responses
├── config/
│   ├── guard_policy.json           # Command classification rules
│   ├── skills.json                 # Skills configuration
│   └── bridge.config.json          # Bridge settings
├── plans/                          # Tactical execution plans (JSON)
├── screenshots/                    # Browser screenshots
├── memory/                         # SQLite knowledge base
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

### Playwright MCP Configuration
The Bridge automatically enables Playwright MCP for web-related tasks. The MCP config is located at:
```
~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/playwright/.mcp.json
```

Web tasks are detected by keywords like: `tradingview`, `crypto`, `analyze`, `chart`, `browse`, `website`, etc.

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
4. **Guard classifies** command (GREEN/YELLOW/RED)
5. **Bridge** detects if web task, enables Playwright MCP if needed
6. **Claude CLI** executes with native skills available
7. **Skills** may be invoked (webOperator, selfCorrection, tacticalPlanning)
8. **Output processed** and summarized by OpenRouter AI
9. **Response sent** back to WhatsApp group

## Task Examples

### Trading Analysis
```
"Analyze ETH/BTC ratio on TradingView"
```
Claude uses `webOperator` to navigate, `tacticalPlanning` to structure the analysis, and returns the full report.

### Web Research
```
"Check the latest news about Bitcoin on CoinDesk"
```
Claude browses with stealth mode, extracts content, and summarizes findings.

### Multi-Step Mission
```
"Create a plan to monitor SOL price alerts on 3 exchanges"
```
Claude creates a tactical plan, executes steps sequentially, and reports progress via WhatsApp.

## API Endpoints

### WhatsApp API (port 3000)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/status` | GET | Connection status |
| `/api/qr` | GET | Get QR code |
| `/api/connect` | POST | Initialize connection |
| `/api/send` | POST | Send message |
| `/api/send-to-chat` | POST | Send to specific chat |
| `/docs` | GET | API documentation (Redoc) |

### Bridge (port 3001)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhook/whatsapp` | POST | Receive WhatsApp webhooks |
| `/api/sessions` | GET | List active sessions |
| `/api/stats` | GET | System statistics |

## Guard Classification

Commands are classified into safety levels:

| Level | Description | Examples |
|-------|-------------|----------|
| **GREEN** | Safe operations | Read files, git status, npm list |
| **YELLOW** | Sensitive but allowed | npm install, git commit |
| **RED** | Requires approval | rm commands, git push --force |
| **BLACKLISTED** | Always blocked | System modification, credential access |

## Logs

Logs are stored in `logs/`:
- `bridge-YYYY-MM-DD.log` - Bridge activity
- `agent-YYYY-MM-DD.log` - WhatsApp API activity
- `error-YYYY-MM-DD.log` - Errors

## Troubleshooting

### WhatsApp messages not sending
- Ensure the `sendSeen: false` option is set in whatsappService.js
- Check if WhatsApp session is authenticated (look for "ready" in logs)

### Browser not opening for web tasks
- Verify Playwright MCP is installed: `npm install -g @playwright/mcp`
- Check MCP config uses `node` directly, not `npx`
- Ensure web task keywords are in the command

### Skills not discovered
- Verify `BASE_PATH` in `.env` points to project root
- Check that `skills/` folder exists with `.ts` files
- Restart Bridge after adding new skills

### Claude CLI timeout
- Check if Claude process produces output (idle timeout is 3 minutes)
- Verify Claude CLI is authenticated: `claude --version`

## License

Private - All rights reserved

---

*Built with Claude Code + Native Skills + Playwright MCP*
