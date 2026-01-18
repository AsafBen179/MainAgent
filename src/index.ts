/**
 * Unified Multi-Persona WhatsApp Agent
 *
 * Entry point that initializes all components:
 * - WhatsApp Client (message receiving/sending)
 * - Group-Persona Mapper (routes groups to personas)
 * - Hardened Guard (persona-aware security)
 * - Message Router (internal message processing)
 * - Knowledge Base (learning & memory)
 *
 * NO EXTERNAL HTTP CALLS - all processing is internal.
 */

import appLogger from './utils/logger';
import { WhatsAppClient } from './bridge/WhatsAppClient';
import { GroupPersonaMapper } from './bridge/GroupPersonaMapper';
import { HardenedGuard } from './bridge/HardenedGuard';
import { MessageRouter } from './bridge/MessageRouter';
import { KnowledgeBase, getKnowledgeBase, closeKnowledgeBase } from './core/memory/knowledge-base';

const logger = appLogger.child({ component: 'Main' });

// Configuration
const CONFIG = {
  sessionPath: process.env.SESSION_PATH || './sessions',
  configDir: process.env.CONFIG_DIR || './config',
  memoryDir: process.env.MEMORY_DIR || './memory'
};

// Global instances
let whatsappClient: WhatsAppClient | null = null;
let messageRouter: MessageRouter | null = null;
let isShuttingDown = false;

/**
 * Initialize all components and start the unified agent
 */
async function main(): Promise<void> {
  logger.info('Starting Unified Multi-Persona WhatsApp Agent...');
  logger.info('Configuration', CONFIG);

  try {
    // Step 1: Initialize Knowledge Base (Memory)
    logger.info('Initializing Knowledge Base...');
    const knowledgeBase = getKnowledgeBase();
    const stats = knowledgeBase.getStats();
    logger.info('Knowledge Base initialized', {
      totalLessons: stats.total_lessons,
      successfulLessons: stats.successful_lessons,
      failedLessons: stats.failed_lessons
    });

    // Step 2: Initialize Group-Persona Mapper
    logger.info('Initializing Group-Persona Mapper...');
    const personaMapper = new GroupPersonaMapper(CONFIG.configDir);
    const personas = personaMapper.getAllPersonas();
    logger.info('Persona Mapper initialized', {
      personas: Array.from(personas.keys())
    });

    // Step 3: Initialize Hardened Guard
    logger.info('Initializing Hardened Guard...');
    const guard = new HardenedGuard(personaMapper, CONFIG.configDir);
    logger.info('Hardened Guard initialized');

    // Step 4: Initialize WhatsApp Client
    logger.info('Initializing WhatsApp Client...');
    whatsappClient = new WhatsAppClient({
      sessionPath: CONFIG.sessionPath
    });

    // Step 5: Initialize Message Router
    logger.info('Initializing Message Router...');
    messageRouter = new MessageRouter(
      whatsappClient,
      personaMapper,
      guard,
      knowledgeBase
    );

    // Step 6: Wire up event handlers
    setupEventHandlers(whatsappClient, messageRouter, personaMapper);

    // Step 7: Start WhatsApp Client
    logger.info('Starting WhatsApp Client...');
    await whatsappClient.start();

    logger.info('Unified WhatsApp Agent is running!');
    logger.info('Waiting for WhatsApp authentication...');

  } catch (error) {
    logger.error('Failed to start agent', { error: (error as Error).message });
    process.exit(1);
  }
}

/**
 * Set up event handlers between components
 */
function setupEventHandlers(
  whatsapp: WhatsAppClient,
  router: MessageRouter,
  personaMapper: GroupPersonaMapper
): void {
  // WhatsApp ready
  whatsapp.on('ready', () => {
    logger.info('WhatsApp is ready! Agent is now accepting messages.');
    logPersonaMappings(personaMapper);
  });

  // WhatsApp QR code generated
  whatsapp.on('qr', (qrCode: string) => {
    logger.info('QR Code generated - please scan with WhatsApp app');
  });

  // WhatsApp authenticated
  whatsapp.on('authenticated', () => {
    logger.info('WhatsApp authenticated successfully');
  });

  // WhatsApp disconnected
  whatsapp.on('disconnected', (reason: string) => {
    logger.warn('WhatsApp disconnected', { reason });
    if (!isShuttingDown) {
      logger.info('Attempting to reconnect...');
      setTimeout(() => whatsapp.start(), 5000);
    }
  });

  // WhatsApp auth failure
  whatsapp.on('auth_failure', (msg: string) => {
    logger.error('WhatsApp authentication failed', { reason: msg });
    logger.info('Session cleared - please scan new QR code on next connection');
  });

  // Incoming message -> Route to persona
  whatsapp.on('message', async (message) => {
    try {
      await router.route(message);
    } catch (error) {
      logger.error('Error routing message', {
        chatId: message.chatId,
        error: (error as Error).message
      });
    }
  });

  // Message processed
  router.on('message_processed', (result) => {
    logger.info('Message processed', {
      chatId: result.originalMessage.chatId,
      persona: result.persona,
      processingTime: result.processingTime
    });
  });
}

/**
 * Log persona mappings for debugging
 */
function logPersonaMappings(personaMapper: GroupPersonaMapper): void {
  logger.info('Active Persona Mappings:');
  const personas = personaMapper.getAllPersonas();
  for (const [name, config] of personas) {
    logger.info(`  - ${name}: ${config.description}`, {
      skills: config.allowedSkills.join(', '),
      guardPolicy: config.guardPolicy
    });
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop WhatsApp client
    if (whatsappClient) {
      logger.info('Stopping WhatsApp client...');
      await whatsappClient.stop();
    }

    // Close knowledge base
    logger.info('Closing Knowledge Base...');
    closeKnowledgeBase();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: (error as Error).message });
    process.exit(1);
  }
}

// Register signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

// Start the agent
main().catch((error) => {
  logger.error('Fatal error', { error: error.message });
  process.exit(1);
});
