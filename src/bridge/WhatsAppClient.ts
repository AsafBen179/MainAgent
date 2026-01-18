/**
 * WhatsApp Client - TypeScript wrapper for whatsapp-web.js
 *
 * Features:
 * - Robust session restoration with graceful fallback to QR scan
 * - Event emitter pattern for message handling
 * - Centralized logging with context
 */

import { Client, LocalAuth, MessageMedia, Message } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import appLogger from '../utils/logger';

const logger = appLogger.child({ component: 'WhatsAppClient' });

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  type: string;
  isGroupMsg: boolean;
  groupName?: string;
  author?: string;
  notifyName?: string;
  fromMe: boolean;
}

export interface WhatsAppClientOptions {
  sessionPath?: string;
  autoConnect?: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'authenticated' | 'ready' | 'auth_failure';

export class WhatsAppClient extends EventEmitter {
  private client: Client | null = null;
  private isReady: boolean = false;
  private qrCode: string | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private sessionPath: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(options: WhatsAppClientOptions = {}) {
    super();
    this.sessionPath = options.sessionPath || path.join(process.cwd(), 'sessions');

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  /**
   * Clean up stale lock files from previous crashes
   */
  private cleanupStaleLocks(): void {
    const clientSessionDir = path.join(this.sessionPath, 'session-whatsapp-api-client');
    const lockFiles = [
      'lockfile',
      'DevToolsActivePort',
      'SingletonLock',
      'SingletonSocket',
      'SingletonCookie'
    ];

    try {
      for (const lockFile of lockFiles) {
        const lockPath = path.join(clientSessionDir, lockFile);
        if (fs.existsSync(lockPath)) {
          fs.unlinkSync(lockPath);
          logger.debug(`Removed stale lock file: ${lockFile}`);
        }
      }
    } catch (error) {
      logger.warn('Could not clean up some lock files', { error: (error as Error).message });
    }
  }

  /**
   * Find Chrome/Chromium executable
   */
  private findChromePath(): string | undefined {
    const chromePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      process.env.CHROME_PATH,
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      'C:/Users/asaf1/.cache/puppeteer/chrome/win64-143.0.7499.192/chrome-win64/chrome.exe',
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
    ].filter(Boolean) as string[];

    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        logger.info(`Using Chrome at: ${chromePath}`);
        return chromePath;
      }
    }

    logger.warn('No Chrome executable found, using Puppeteer default');
    return undefined;
  }

  /**
   * Initialize the WhatsApp client
   */
  private initializeClient(): void {
    this.cleanupStaleLocks();

    const executablePath = this.findChromePath();

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'whatsapp-api-client',
        dataPath: this.sessionPath
      }),
      puppeteer: {
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ]
      }
    });

    this.setupEventHandlers();
    logger.info('WhatsApp client initialized');
  }

  /**
   * Set up event handlers for the WhatsApp client
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', async (qr: string) => {
      this.connectionStatus = 'connecting';
      try {
        this.qrCode = await QRCode.toDataURL(qr);
        const qrTerminal = await QRCode.toString(qr, { type: 'terminal', small: true });

        logger.info('QR Code generated - please scan with WhatsApp');
        console.log('\n=== WhatsApp QR Code ===');
        console.log('Scan this QR code with your WhatsApp:');
        console.log(qrTerminal);
        console.log('========================\n');

        this.emit('qr', this.qrCode);
      } catch (error) {
        logger.error('Failed to generate QR code', { error: (error as Error).message });
      }
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.connectionStatus = 'ready';
      this.qrCode = null;
      this.reconnectAttempts = 0;
      logger.info('WhatsApp client is ready and authenticated');
      this.emit('ready');
    });

    this.client.on('authenticated', () => {
      this.connectionStatus = 'authenticated';
      logger.info('WhatsApp client authenticated successfully');
      this.emit('authenticated');
    });

    this.client.on('loading_screen', (percent: number, message: string) => {
      logger.debug(`Loading: ${percent}% - ${message}`);
    });

    this.client.on('auth_failure', (msg: string) => {
      this.connectionStatus = 'auth_failure';
      this.isReady = false;
      logger.error('Authentication failed - session may be invalid', { reason: msg });

      // Handle invalid session gracefully
      this.handleAuthFailure();
      this.emit('auth_failure', msg);
    });

    this.client.on('disconnected', (reason: string) => {
      this.connectionStatus = 'disconnected';
      this.isReady = false;
      this.qrCode = null;
      logger.warn('WhatsApp client disconnected', { reason });
      this.emit('disconnected', reason);
    });

    this.client.on('message', async (message: Message) => {
      try {
        await this.handleIncomingMessage(message);
      } catch (error) {
        logger.error('Error handling incoming message', { error: (error as Error).message });
      }
    });

    this.client.on('error', (error: Error) => {
      logger.error('WhatsApp client error', { error: error.message });
    });
  }

  /**
   * Handle authentication failure - clear session and prepare for new QR
   */
  private async handleAuthFailure(): Promise<void> {
    logger.warn('Handling auth failure - preparing for new QR scan');

    // Don't crash - just reset state and wait for new connection attempt
    this.isReady = false;
    this.connectionStatus = 'disconnected';

    // Clear the invalid session
    const sessionDir = path.join(this.sessionPath, 'session-whatsapp-api-client');
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        logger.info('Cleared invalid session - ready for new QR scan');
      }
    } catch (error) {
      logger.warn('Could not clear session directory', { error: (error as Error).message });
    }
  }

  /**
   * Start the WhatsApp client
   */
  async start(): Promise<void> {
    try {
      // Destroy existing client if any
      if (this.client) {
        try {
          logger.info('Destroying existing client before reconnecting...');
          await this.client.destroy();
        } catch (error) {
          logger.warn('Could not destroy existing client', { error: (error as Error).message });
        }
        this.isReady = false;
        this.connectionStatus = 'disconnected';
        this.qrCode = null;
        this.client = null;
        this.cleanupStaleLocks();
      }

      // Initialize and start
      this.initializeClient();
      logger.info('Starting WhatsApp client...');
      await this.client!.initialize();
      logger.info('WhatsApp client initialization completed');
    } catch (error) {
      const errorMsg = (error as Error).message;
      logger.error('Failed to start WhatsApp client', { error: errorMsg });

      // Check if it's a session-related error
      if (errorMsg.includes('session') || errorMsg.includes('auth') || errorMsg.includes('Target closed')) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          logger.info(`Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          await this.handleAuthFailure();
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.start();
        }
      }

      throw error;
    }
  }

  /**
   * Handle incoming WhatsApp message
   */
  private async handleIncomingMessage(message: Message): Promise<void> {
    const chat = await message.getChat();

    const whatsappMessage: WhatsAppMessage = {
      id: message.id.id,
      chatId: message.from,
      from: message.from,
      to: message.to,
      body: message.body,
      timestamp: message.timestamp,
      type: message.type,
      isGroupMsg: chat.isGroup,
      groupName: chat.isGroup ? chat.name : undefined,
      author: message.author,
      notifyName: (message as any).notifyName,
      fromMe: message.fromMe
    };

    logger.info('Incoming message received', {
      chatId: whatsappMessage.chatId,
      isGroup: whatsappMessage.isGroupMsg,
      groupName: whatsappMessage.groupName,
      fromMe: whatsappMessage.fromMe,
      preview: whatsappMessage.body?.substring(0, 50)
    });

    // Emit for router to handle
    this.emit('message', whatsappMessage);
  }

  /**
   * Send a message to a chat
   */
  async sendToChat(chatId: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isReady || !this.client) {
      return { success: false, error: 'WhatsApp client is not ready' };
    }

    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }

    try {
      const result = await this.client.sendMessage(chatId, message);
      logger.info('Message sent successfully', { chatId, messageId: result.id.id });
      return { success: true, messageId: result.id.id };
    } catch (error) {
      const errorMsg = (error as Error).message;

      // Handle known whatsapp-web.js bug
      if (errorMsg.includes('markedUnread')) {
        logger.warn('markedUnread bug - message likely sent', { chatId });
        return { success: true, messageId: `pending-${Date.now()}` };
      }

      logger.error('Failed to send message', { chatId, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Send media to a chat
   */
  async sendMedia(
    chatId: string,
    mediaBase64: string,
    mimetype: string,
    filename: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isReady || !this.client) {
      return { success: false, error: 'WhatsApp client is not ready' };
    }

    try {
      const media = new MessageMedia(mimetype, mediaBase64, filename);
      const result = await this.client.sendMessage(chatId, media, { caption });
      logger.info('Media sent successfully', { chatId, filename });
      return { success: true, messageId: result.id.id };
    } catch (error) {
      logger.error('Failed to send media', { chatId, error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get chat info by ID
   */
  async getChatInfo(chatId: string): Promise<{ id: string; name: string; isGroup: boolean } | null> {
    if (!this.isReady || !this.client) return null;

    try {
      const chat = await this.client.getChatById(chatId);
      return {
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup
      };
    } catch (error) {
      logger.error('Failed to get chat info', { chatId, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Get current status
   */
  getStatus(): { isReady: boolean; connectionStatus: ConnectionStatus; hasQrCode: boolean } {
    return {
      isReady: this.isReady,
      connectionStatus: this.connectionStatus,
      hasQrCode: !!this.qrCode
    };
  }

  /**
   * Get QR code for authentication
   */
  getQrCode(): string | null {
    return this.qrCode;
  }

  /**
   * Stop the client
   */
  async stop(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      this.connectionStatus = 'disconnected';
      logger.info('WhatsApp client stopped');
    }
  }
}

export default WhatsAppClient;
