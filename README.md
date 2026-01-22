# Unified WhatsApp Trading Agent

A powerful autonomous trading intelligence system with WhatsApp integration, Claude CLI execution, and a 6-pillar confluence trading framework. Self-driven market discovery via direct Binance API with intelligent filtering and signal lifecycle management.

## System Overview

```
                                  UNIFIED TRADING AGENT ARCHITECTURE

 ╔═══════════════════════════════════════════════════════════════════════════════════════╗
 ║                                                                                       ║
 ║   ┌─────────────────┐                    ┌─────────────────────────────────────────┐  ║
 ║   │   WhatsApp      │◄──── Signals ──────│         BINANCE ENGINE v3.1             │  ║
 ║   │   (User)        │                    │         ════════════════════            │  ║
 ║   └────────┬────────┘                    │  ┌─────────────────────────────────┐    │  ║
 ║            │                             │  │ Market Scanner (10min cycle)    │    │  ║
 ║            │ Commands                    │  │ → Volume, RVOL, Momentum filter │    │  ║
 ║            ▼                             │  └───────────────┬─────────────────┘    │  ║
 ║   ┌─────────────────┐                    │                  ▼                      │  ║
 ║   │   Bridge        │                    │  ┌─────────────────────────────────┐    │  ║
 ║   │   Orchestrator  │                    │  │ Smart Filter (Memory Check)     │    │  ║
 ║   │   + Personas    │                    │  │ → Mute check, Time/Price delta  │    │  ║
 ║   └────────┬────────┘                    │  └───────────────┬─────────────────┘    │  ║
 ║            │                             │                  ▼                      │  ║
 ║            ▼                             │  ┌─────────────────────────────────┐    │  ║
 ║   ┌─────────────────┐                    │  │ Signal Gatekeeper               │    │  ║
 ║   │   Claude CLI    │────── Triggers ───►│  │ → Daily limit, Active trades    │    │  ║
 ║   │   + Skills      │                    │  └───────────────┬─────────────────┘    │  ║
 ║   └─────────────────┘                    │                  ▼                      │  ║
 ║                                          │  ┌─────────────────────────────────┐    │  ║
 ║                                          │  │ 6-Pillar Analysis               │    │  ║
 ║                                          │  │ → 75% confidence threshold      │    │  ║
 ║                                          │  └─────────────────────────────────┘    │  ║
 ║                                          └─────────────────────────────────────────┘  ║
 ║                                                                                       ║
 ╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

## Features

### Trading System
- **Binance Engine v3.1**: Self-driven market discovery via direct Binance API
- **6-Pillar Confluence**: SMC, Indicators, Risk, Sentiment, On-Chain, Fundamentals
- **Smart Memory Filter**: Prevents redundant analysis with time/price delta checks
- **Signal Gatekeeper**: Daily direction limits and active trade blocking
- **4-Hour Mute System**: Cooldown after WAIT results or low confidence
- **75% Confidence Threshold**: Only high-conviction signals sent to WhatsApp
- **Trade Lifecycle Tracking**: Automatic SL/TP monitoring with status updates

### Core Features
- **WhatsApp Integration**: Full WhatsApp Web connection via whatsapp-web.js
- **Claude CLI Execution**: Autonomous task execution with real-time streaming
- **Multi-Persona System**: Context-aware routing (TradingExpert, Dev, General)
- **Browser Automation**: Stealth Playwright with anti-detection
- **Knowledge Base**: SQLite learning with persona-scoped memory
- **Guard System**: Command classification (GREEN/YELLOW/RED) for security

## Security Notice

> **All sensitive data is excluded via `.gitignore`.**
>
> - WhatsApp sessions (`sessions/`)
> - Databases (`data/*.db`, `memory/*.db`)
> - Environment variables (`.env`)
> - API keys and credentials

---

## Trading System Components

### 1. Binance Engine (v3.1)

The central hub for autonomous market discovery and signal management.

```
BINANCE ENGINE PIPELINE:
════════════════════════════════════════════════════════════════════

   ┌──────────────────┐
   │  MARKET SCANNER  │  Every 10 minutes
   │  647 USDT pairs  │
   └────────┬─────────┘
            │ Volume ≥ $20M, Change ≥ 3%
            ▼
   ┌──────────────────┐
   │  RVOL FILTER     │  Relative Volume > 1.5
   └────────┬─────────┘
            │ ~5-15 candidates
            ▼
   ┌──────────────────┐
   │  SMART FILTER    │  Memory check
   │  Rule 0: MUTE    │  4h cooldown after WAIT
   │  Rule 1: NEW     │  First-time asset
   │  Rule 2: TIME    │  >4h since analysis
   │  Rule 3: DELTA   │  >2% price change
   └────────┬─────────┘
            │ 2-5 to analyze
            ▼
   ┌──────────────────┐
   │ SIGNAL GATEKEEPER│  Duplicate prevention
   │  • Daily limit   │  No same-direction repeat
   │  • Active trade  │  Block if SL/TP not hit
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │  6-PILLAR        │  Full confluence check
   │  ANALYSIS        │  75% threshold (12+ points)
   └────────┬─────────┘
            │
            ├─── SIGNAL ≥75% ──► WhatsApp + Record
            │
            └─── WAIT <75% ────► Mute 4 hours (no message)

════════════════════════════════════════════════════════════════════
```

#### CLI Commands

```bash
# Market scanning
npm run binance:scan           # Basic scan
npm run binance:smart-scan     # Full pipeline with memory

# Analysis history
npm run binance:history        # View analyzed assets
npm run binance:check          # Check specific symbol
npm run binance:observations   # View observation list

# Signal management
npm run signals                # View signal history
npm run signals:active         # View active signals only
npm run signals:gatekeeper     # Check gatekeeper status
npm run signals:monitor        # Single status check
npm run signals:monitor-start  # Start background monitor

# Mute management (via binance-client.js)
node scripts/binance-client.js muted           # View muted assets
node scripts/binance-client.js mute BTCUSDT    # Manually mute
node scripts/binance-client.js unmute BTCUSDT  # Remove mute
node scripts/binance-client.js check-confidence 12  # Check threshold
```

### 2. 6-Pillar Confluence System

```
6-PILLAR SCORING (15 points max):
════════════════════════════════════════════════════════════════════

PILLAR 1: SMC CORE (4 points)
  ☐ HTF (4H) trend clear (BOS confirmed)        +1
  ☐ LTF (1H) aligned with HTF                   +1
  ☐ Unmitigated POI (Order Block/FVG)           +1
  ☐ Liquidity sweep confirmed                    +1

PILLAR 2: INDICATOR LOGIC (3 points)
  ☐ Fibonacci OTE zone (0.618-0.786)            +1
  ☐ RSI divergence or extreme reading           +1
  ☐ Volume Profile POC alignment                 +1

PILLAR 3: RISK MANAGEMENT (2 points)
  ☐ R:R ratio ≥ 1:2                             +1
  ☐ Leverage ≤ 20x (valid calculation)          +1

PILLAR 4: SOCIAL SENTIMENT (2 points)
  ☐ Sentiment aligned with technical bias        +1
  ☐ No contrarian warning                        +1

PILLAR 5: ON-CHAIN INTEL (2 points)
  ☐ On-chain flow aligned with bias              +1
  ☐ No whale divergence warning                  +1

PILLAR 6: FUNDAMENTAL INTEL (2 points)
  ☐ No negative news veto                        +1
  ☐ Positive catalyst OR neutral                 +1

════════════════════════════════════════════════════════════════════
CONFIDENCE THRESHOLDS:
  13-15 pts (87-100%) → STRONG SIGNAL (full position)
  12 pts (80%)        → MODERATE SIGNAL (75% position)
  11 pts (73%)        → WAIT + 4h mute (no message)
  <11 pts (<73%)      → WAIT + 4h mute (no message)

MINIMUM: 75% confidence (12+ points) for ANY signal
════════════════════════════════════════════════════════════════════
```

### 3. Signal Output Format

**When SIGNAL (≥75% confidence):**
```
🚀 **SIGNAL: SOL/USDT**

📶 **Direction:** LONG
🎯 **Entry:** $198.50
🛑 **Stop Loss:** $195.00 (1.76%)
🏆 **Targets:**
   • TP1: $205.00 (1:1.86 R:R)
   • TP2: $212.00 (1:3.86 R:R)

💰 **Risk Management:**
   • Leverage: 5x
   • Risk: 2%
   • Position: $100
   • R:R Ratio: 1:3.86

🛡️ **Confidence:** 80% (threshold: 75%)
💡 **Rationale:** Bullish BOS on 4H with liquidity sweep

📊 Source: Binance API
🔗 Confluence: 12/15 points
```

**When WAIT (<75% confidence):**
- NO WhatsApp message sent
- Asset muted for 4 hours
- Logged to KnowledgeBase only

---

## Data Storage

### Analysis History (`data/analysis_history.json`)
```json
{
  "assets": {
    "BTCUSDT": {
      "symbol": "BTCUSDT",
      "last_analysis_time": "2026-01-21T18:30:00.000Z",
      "last_price": 105250.00,
      "last_rvol": 1.85,
      "analysis_count": 5,
      "last_result": {
        "signal": "WAIT",
        "confidence": "NORMAL",
        "confluence_score": 11,
        "confidence_percent": 73
      },
      "mute_until": "2026-01-21T22:30:00.000Z",
      "mute_reason": "WAIT_RESULT"
    }
  }
}
```

### Signal History (`data/signals_history.json`)
```json
{
  "signals": [
    {
      "id": "SIG_1706912345678_BTCUSDT",
      "symbol": "BTCUSDT",
      "direction": "LONG",
      "status": "Active",
      "entry_price": 105000,
      "sl_price": 103000,
      "tp1_price": 108000,
      "tp2_price": 110000,
      "tp3_price": 115000,
      "confluence_score": 12,
      "confidence": "MODERATE",
      "history": [...]
    }
  ],
  "stats": { "total": 15, "wins": 10, "losses": 3, "active": 2 }
}
```

### Signal Status Types
| Status | Description |
|--------|-------------|
| `Active` | Trade is open, monitoring SL/TP |
| `Hit_SL` | Stop loss hit (LOSS) |
| `Hit_TP1` | First target hit (50% closed) |
| `Hit_TP2` | Second target hit (30% closed) |
| `Hit_TP3` | Final target hit (FULL WIN) |
| `Invalidated` | Market conditions changed |
| `Closed_Manual` | Manually closed |

---

## Skills Directory

| Skill | Purpose | Triggers |
|-------|---------|----------|
| **binance-engine** | Market scanning, signal management | "scan market", "smart scan" |
| **market-intelligence** | 6-pillar orchestration | "analyze X", "market analysis" |
| **smc-core** | Smart Money Concepts | Layer 1 of 6-pillar |
| **indicator-logic** | Technical indicators | Layer 2 of 6-pillar |
| **risk-management** | Position sizing, R:R | Layer 3 of 6-pillar |
| **social-sentiment** | X/Twitter sentiment | Layer 4 of 6-pillar |
| **on-chain-intel** | Whale tracking | Layer 5 of 6-pillar |
| **fundamental-intel** | News analysis | Layer 6 of 6-pillar |
| **web-operator** | Browser automation | "browse", "screenshot" |
| **self-correction** | DOM failure analysis | "fix selector" |
| **tactical-planning** | Multi-step execution | "create plan" |

---

## Persona System

Messages are routed to specialized personas based on WhatsApp group context.

| Persona | Trigger Groups | Allowed Skills |
|---------|---------------|----------------|
| **TradingExpert** | "Trading Expert*" | market-intelligence, binance-engine, all trading skills |
| **Trading** | "Trading*", "Crypto*" | web-operator, market-intelligence |
| **Dev** | "Dev*", "Code*" | All skills |
| **General** | All others | web-operator only |

---

## Project Structure

```
MainAgent/
├── skills/                           # Claude Code skills
│   ├── binance-engine/SKILL.md       # Market scanning hub
│   ├── market-intelligence/SKILL.md  # 6-pillar orchestrator
│   ├── smc-core/SKILL.md             # Smart Money Concepts
│   ├── indicator-logic/SKILL.md      # Technical indicators
│   ├── risk-management/SKILL.md      # Position sizing
│   ├── social-sentiment/SKILL.md     # Twitter sentiment
│   ├── on-chain-intel/SKILL.md       # Whale tracking
│   ├── fundamental-intel/SKILL.md    # News analysis
│   ├── web-operator/SKILL.md         # Browser automation
│   ├── self-correction/SKILL.md      # DOM failure fix
│   └── tactical-planning/SKILL.md    # Multi-step plans
│
├── scripts/
│   └── binance-client.js             # Binance API utility
│
├── src/
│   ├── index.js                      # Unified entry point
│   ├── bridge/                       # Claude CLI orchestration
│   │   ├── core/BridgeOrchestrator.js
│   │   ├── agent/PersonaRouter.js
│   │   ├── agent/KnowledgeBase.js
│   │   └── claude/CmdExecutor.js
│   └── whatsapp-api/                 # WhatsApp connection
│       └── whatsappService.js
│
├── config/
│   ├── personas.json                 # Persona definitions
│   ├── group-mappings.json           # Group routing
│   ├── guard_policy.json             # Security rules
│   └── scan_results.json             # Latest scan output
│
├── data/
│   ├── analysis_history.json         # Analysis memory
│   ├── signals_history.json          # Trade tracking
│   └── observation_list.json         # Watchlist
│
├── memory/                           # SQLite databases
├── sessions/                         # WhatsApp sessions
└── logs/                             # Application logs
```

---

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

## Usage

```bash
# Start full system (WhatsApp + Bridge)
npm start

# Start services separately
npm run start:api      # WhatsApp API (port 3000)
npm run start:bridge   # Bridge (port 3001)

# Run market scan manually
npm run binance:smart-scan
```

---

## Environment Variables

```bash
# Server Ports
PORT=3000
BRIDGE_PORT=3001

# Paths
SESSION_PATH=./sessions
BASE_PATH=C:\MainAgent

# WhatsApp
WEBHOOK_URL=http://localhost:3001/webhook/whatsapp
WHATSAPP_API_URL=http://localhost:3000

# Browser
HEADED_MODE=true

# AI Summarization
OPENROUTER_API_KEY=your-api-key
OPENROUTER_MODEL=xiaomi/mimo-v2-flash:free

# Admin
ADMIN_PHONES=972501234567
```

---

## Documentation

- **[WORKFLOW.md](./WORKFLOW.md)** - Complete trading workflow documentation
- **[CLAUDE.md](./CLAUDE.md)** - Agent instructions and context

---

## License

Private - All rights reserved

---

*Built with Claude Code + Binance Engine + 6-Pillar Confluence System*
