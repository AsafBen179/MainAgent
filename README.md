# WhatsApp-Claude Bridge

A WhatsApp bot that connects to Claude Code CLI for autonomous task execution.

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
│                 │ <─────────────── │                 │ <───────────── │                 │
│ whatsapp-web.js │     Response     │  Orchestrator   │    stdout      │  Code execution │
└─────────────────┘                  └─────────────────┘                └─────────────────┘
        │
        │ QR Code
        v
   ┌─────────┐
   │ Terminal│
   └─────────┘
```

## Components

### WhatsApp API (`src/whatsapp-api/`)
- **Port:** 3000
- **Purpose:** WhatsApp Web connection via whatsapp-web.js
- **Features:**
  - QR code display in terminal
  - Session persistence
  - Message sending/receiving
  - Webhook notifications to Bridge

### Bridge (`src/bridge/`)
- **Port:** 3001
- **Purpose:** Claude CLI execution and response handling
- **Features:**
  - Webhook receiver for WhatsApp messages
  - Claude CLI spawning (`CmdExecutor.js`)
  - Session management per chat
  - Output processing and summarization
  - Permission handling for sensitive operations

## Project Structure

```
src/
├── index.js                    # Unified entry point (starts both services)
├── whatsapp-api/
│   ├── index.js                # WhatsApp API server
│   ├── whatsappService.js      # whatsapp-web.js wrapper
│   ├── messageHandler.js       # Message processing
│   ├── db/                     # WhatsApp message database
│   └── utils/                  # Logger, validator
└── bridge/
    ├── index.js                # Bridge server entry
    ├── app.js                  # Express app setup
    ├── core/
    │   ├── BridgeOrchestrator.js   # Main orchestration logic
    │   └── EventBus.js             # Event system
    ├── claude/
    │   ├── CmdExecutor.js          # Claude CLI execution
    │   ├── SessionManager.js       # Chat session management
    │   ├── OutputProcessor.js      # Process CLI output
    │   └── PermissionHandler.js    # Handle permission requests
    ├── whatsapp/
    │   ├── WhatsAppClient.js       # API client for WhatsApp API
    │   ├── WebhookHandler.js       # Webhook processing
    │   └── ResponseSender.js       # Send responses back
    ├── db/                         # Bridge database (sql.js)
    └── utils/                      # Config loader, logger

config/
├── bridge.config.json          # Bridge configuration
└── allowlist.json              # Allowed users/groups
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

# Claude CLI Base Path
BASE_PATH=C:\YourProject

# Admin phones (comma separated)
ADMIN_PHONES=972501234567
```

### Bridge Config (`config/bridge.config.json`)
```json
{
  "server": { "port": 3001, "host": "127.0.0.1" },
  "basePath": "C:\\YourProject",
  "whatsappApi": { "baseUrl": "http://localhost:3000" },
  "claudeCode": {
    "executable": "claude",
    "sessionTimeout": 3600000,
    "maxConcurrentSessions": 10
  }
}
```

## Installation

```bash
npm install
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

1. **User sends WhatsApp message** to connected number
2. **WhatsApp API** receives message via whatsapp-web.js
3. **Webhook sent** to Bridge at `/webhook/whatsapp`
4. **Bridge** spawns Claude CLI with the message as prompt
5. **Claude CLI** executes and returns output
6. **Bridge** processes output and sends response
7. **WhatsApp API** delivers response to user

## API Endpoints

### WhatsApp API (port 3000)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/status` | GET | Connection status |
| `/api/qr` | GET | Get QR code |
| `/api/connect` | POST | Initialize connection |
| `/api/send` | POST | Send message |
| `/docs` | GET | API documentation |

### Bridge (port 3001)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhook/whatsapp` | POST | Receive WhatsApp webhooks |

## Logs

Logs are stored in `logs/`:
- `bridge-YYYY-MM-DD.log` - Bridge activity
- `agent-YYYY-MM-DD.log` - WhatsApp API activity
- `error-YYYY-MM-DD.log` - Errors

## License

Private - All rights reserved

---

*Built with Claude Code*
