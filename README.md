# Unified Multi-Persona WhatsApp Agent

An autonomous WhatsApp agent with multi-persona support, self-learning memory, and layered security guards.

## Security Notice

> **This is an autonomous agent project. All sensitive data is strictly excluded via `.gitignore`.**
>
> The following are NEVER committed to this repository:
> - WhatsApp session tokens (`sessions/`)
> - Local databases (`memory/*.db`)
> - Environment variables (`.env`)
> - API keys and credentials

## Architecture

```
WhatsApp Message
       |
       v
+------------------+
|  WhatsAppClient  |  (whatsapp-web.js)
+------------------+
       |
       v
+------------------+
|  MessageRouter   |  Internal routing (no HTTP calls)
+------------------+
       |
       v
+------------------+
| GroupPersonaMapper|  Maps group -> persona
+------------------+
       |
       v
+------------------+     +------------------+
| HardenedGuard    | --> | Persona Policy   |
+------------------+     +------------------+
       |
       v
+------------------+
|  KnowledgeBase   |  SQLite memory
+------------------+
       |
       v
+------------------+
|   Agent Core     |  Process & respond
+------------------+
```

## Personas

| Persona | Description | Guard Policy | Skills |
|---------|-------------|--------------|--------|
| **Trading** | Crypto market analysis | Restrictive | web-operator, crypto-news |
| **Dev** | Full development access | Standard | All skills |
| **General** | Information retrieval | Highly restrictive | web-operator only |

## Project Structure

```
src/
├── index.ts              # Unified entry point
├── bridge/
│   ├── WhatsAppClient.ts     # whatsapp-web.js wrapper
│   ├── GroupPersonaMapper.ts # Group -> Persona mapping
│   ├── MessageRouter.ts      # Internal message routing
│   └── HardenedGuard.ts      # Persona-aware security
├── core/
│   ├── agent-core.ts         # Main agent logic
│   ├── guard/                # Execution Guard
│   ├── memory/               # Knowledge Base (SQLite)
│   ├── evolution/            # SEASP (Self-Evolution)
│   └── planner/              # Sequential thinking
├── skills/
│   ├── web-operator/         # Browser automation
│   ├── self-correction/      # Self-correcting execution
│   └── scrapers/             # Data scrapers
└── utils/
    └── logger.ts             # Centralized logging
```

## Configuration

**Persona Definitions:** `config/personas.json`
```json
{
  "Trading": { "guardPolicy": "trading", "allowedSkills": ["web-operator", "crypto-news"] },
  "Dev": { "guardPolicy": "default", "allowedSkills": ["all"] },
  "General": { "guardPolicy": "restricted", "allowedSkills": ["web-operator"] }
}
```

**Group Mappings:** `config/group-mappings.json`
```json
{
  "mappings": [
    { "groupNamePattern": "^Trading.*|.*Crypto.*", "persona": "Trading" },
    { "groupNamePattern": "^Dev.*|.*Development.*", "persona": "Dev" },
    { "groupNamePattern": ".*", "persona": "General" }
  ]
}
```

## Guard Classification

| Level | Behavior | Example |
|-------|----------|---------|
| GREEN | Auto-execute | `git status`, `ls`, `dir` |
| YELLOW | Execute + log | `npm install`, `git push` |
| RED | Requires approval | Registry edits, credentials |
| BLACKLISTED | Never execute | Format disk, delete system files |

**Key Security Feature:** Persona policy ALWAYS prevails over global policy.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npm start
```

On first run, scan the QR code with WhatsApp to authenticate.

## Development

```bash
npm run dev    # Development mode with ts-node
npm run watch  # TypeScript watch mode
```

## Key Features

- **Multi-Persona Support:** Different capabilities per WhatsApp group
- **Hardened Guard:** Persona-specific security policies
- **Self-Learning Memory:** SQLite-backed knowledge base
- **No External HTTP Calls:** All processing is internal
- **Robust Session Handling:** Graceful recovery from auth failures
- **Centralized Logging:** All events logged with chatId/persona context

## License

Private - All rights reserved

---

*Built with Claude Code*
