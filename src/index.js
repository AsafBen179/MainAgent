/**
 * Unified WhatsApp Agent Entry Point
 *
 * Starts both services:
 * 1. WhatsApp API Server (port 3000) - handles QR codes, whatsapp-web.js
 * 2. Bridge Server (port 3001) - handles Claude CLI execution
 */

require('dotenv').config();

const path = require('path');

// Set environment defaults
process.env.SESSION_PATH = process.env.SESSION_PATH || path.join(__dirname, '..', 'sessions');
process.env.AUTO_CONNECT = process.env.AUTO_CONNECT || 'true';
process.env.WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/webhook/whatsapp';

console.log('='.repeat(60));
console.log('  Unified WhatsApp Agent Starting...');
console.log('='.repeat(60));
console.log('');
console.log('  WhatsApp API Server: http://localhost:3000');
console.log('  Bridge Server:       http://localhost:3001');
console.log('');
console.log('='.repeat(60));

// Start WhatsApp API Server
console.log('\n[1/2] Starting WhatsApp API Server...');
require('./whatsapp-api/index.js');

// Start Bridge Server after a short delay
setTimeout(() => {
  console.log('\n[2/2] Starting Bridge Server...');
  require('./bridge/index.js');
}, 2000);
