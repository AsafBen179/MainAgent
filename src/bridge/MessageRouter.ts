/**
 * Message Router
 *
 * Routes incoming WhatsApp messages to the appropriate persona-specific agent core.
 * Handles message queuing, processing, and response formatting.
 * NO HTTP CALLS - all processing is done internally.
 */

import { EventEmitter } from 'events';
import appLogger from '../utils/logger';
import { WhatsAppClient, WhatsAppMessage } from './WhatsAppClient';
import { GroupPersonaMapper, PersonaConfig } from './GroupPersonaMapper';
import { HardenedGuard } from './HardenedGuard';
import { KnowledgeBase } from '../core/memory/knowledge-base';

const logger = appLogger.child({ component: 'MessageRouter' });

export interface ProcessedMessage {
  originalMessage: WhatsAppMessage;
  persona: string;
  personaConfig: PersonaConfig;
  response: string;
  processingTime: number;
}

export interface MessageQueueItem {
  message: WhatsAppMessage;
  persona: string;
  timestamp: number;
}

export class MessageRouter extends EventEmitter {
  private whatsappClient: WhatsAppClient;
  private personaMapper: GroupPersonaMapper;
  private guard: HardenedGuard;
  private knowledgeBase: KnowledgeBase;

  // Per-persona message queues to prevent conflicts
  private messageQueues: Map<string, MessageQueueItem[]> = new Map();
  private processing: Map<string, boolean> = new Map();

  constructor(
    whatsappClient: WhatsAppClient,
    personaMapper: GroupPersonaMapper,
    guard: HardenedGuard,
    knowledgeBase: KnowledgeBase
  ) {
    super();
    this.whatsappClient = whatsappClient;
    this.personaMapper = personaMapper;
    this.guard = guard;
    this.knowledgeBase = knowledgeBase;

    // Initialize queues for each persona
    for (const [personaId] of personaMapper.getAllPersonas()) {
      this.messageQueues.set(personaId, []);
      this.processing.set(personaId, false);
    }

    logger.info('MessageRouter initialized');
  }

  /**
   * Route an incoming message to the appropriate persona
   */
  async route(message: WhatsAppMessage): Promise<void> {
    const startTime = Date.now();

    // Skip messages from self
    if (message.fromMe) {
      logger.debug('Skipping self-sent message', { chatId: message.chatId });
      return;
    }

    // Determine persona based on group name
    const isPrivate = !message.isGroupMsg;
    const persona = this.personaMapper.matchGroup(message.groupName, isPrivate);
    const personaConfig = this.personaMapper.getPersona(persona);

    if (!personaConfig) {
      logger.error('Persona not found', { persona, chatId: message.chatId });
      return;
    }

    const contextLogger = logger.child({
      chatId: message.chatId,
      persona
    });

    contextLogger.info('Message routed to persona', {
      groupName: message.groupName,
      isPrivate,
      preview: message.body?.substring(0, 50)
    });

    // Add to persona-specific queue
    this.enqueue(message, persona);

    // Process the queue
    await this.processQueue(persona);
  }

  /**
   * Add a message to the persona's queue
   */
  private enqueue(message: WhatsAppMessage, persona: string): void {
    const queue = this.messageQueues.get(persona) || [];
    queue.push({
      message,
      persona,
      timestamp: Date.now()
    });
    this.messageQueues.set(persona, queue);

    logger.debug('Message enqueued', {
      chatId: message.chatId,
      persona,
      queueLength: queue.length
    });
  }

  /**
   * Process messages in a persona's queue
   */
  private async processQueue(persona: string): Promise<void> {
    // Check if already processing for this persona
    if (this.processing.get(persona)) {
      return;
    }

    this.processing.set(persona, true);

    try {
      const queue = this.messageQueues.get(persona) || [];

      while (queue.length > 0) {
        const item = queue.shift()!;
        await this.processMessage(item.message, persona);
      }
    } finally {
      this.processing.set(persona, false);
    }
  }

  /**
   * Process a single message through the agent core
   */
  private async processMessage(message: WhatsAppMessage, persona: string): Promise<void> {
    const startTime = Date.now();
    const contextLogger = logger.child({
      chatId: message.chatId,
      persona
    });

    try {
      const personaConfig = this.personaMapper.getPersona(persona)!;

      // Get relevant lessons from memory (scoped by persona)
      const memoryScope = this.personaMapper.getMemoryScope(persona);
      const relevantLessons = this.knowledgeBase.queryLessons({
        category: memoryScope,
        search_text: message.body,
        limit: 3
      });

      // Build context for processing
      const context = {
        systemPrompt: personaConfig.systemPrompt,
        allowedSkills: personaConfig.allowedSkills,
        guardPolicy: personaConfig.guardPolicy,
        relevantLessons,
        userMessage: message.body
      };

      // Process through the internal agent logic
      const response = await this.executeWithPersona(message.body, persona, context);

      // Format and send response
      const formattedResponse = this.formatResponse(response, persona);
      const sendResult = await this.whatsappClient.sendToChat(message.chatId, formattedResponse);

      const processingTime = Date.now() - startTime;

      if (sendResult.success) {
        contextLogger.info('Response sent successfully', {
          processingTime,
          responseLength: formattedResponse.length
        });
      } else {
        contextLogger.error('Failed to send response', {
          error: sendResult.error
        });
      }

      // Emit event for external listeners
      this.emit('message_processed', {
        originalMessage: message,
        persona,
        personaConfig,
        response: formattedResponse,
        processingTime
      } as ProcessedMessage);

    } catch (error) {
      contextLogger.error('Error processing message', {
        error: (error as Error).message
      });

      // Send error message to user
      await this.whatsappClient.sendToChat(
        message.chatId,
        `Error processing your message. Please try again.`
      );
    }
  }

  /**
   * Execute a command/message with persona-specific policies
   */
  private async executeWithPersona(
    userMessage: string,
    persona: string,
    context: {
      systemPrompt: string;
      allowedSkills: string[];
      guardPolicy: string;
      relevantLessons: any[];
      userMessage: string;
    }
  ): Promise<string> {
    // Check if this looks like a command
    const isCommand = this.looksLikeCommand(userMessage);

    if (isCommand) {
      // Classify command through hardened guard with persona policy
      const classification = this.guard.classifyWithPersona(userMessage, persona);

      if (classification.level === 'BLACKLISTED') {
        return `This operation is not permitted for the ${persona} persona.`;
      }

      if (classification.level === 'RED' && classification.requiresApproval) {
        return `This operation requires approval. Please confirm via WhatsApp.`;
      }

      // For now, return a placeholder - in production this would execute the command
      // through the agent core with proper skill invocation
      return `[${persona}] Command acknowledged. Processing through ${context.guardPolicy} policy.`;
    }

    // For conversational messages, return a contextual response
    // In production, this would go through the AI with the persona's system prompt
    let response = `[${persona} Persona]\n\n`;

    if (context.relevantLessons.length > 0) {
      response += `Found ${context.relevantLessons.length} relevant lesson(s) from memory.\n\n`;
    }

    response += `Processing your request: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"`;

    return response;
  }

  /**
   * Check if a message looks like a command
   */
  private looksLikeCommand(message: string): boolean {
    const commandPatterns = [
      /^[!\/]/,                    // Starts with ! or /
      /^(run|execute|do|npm|git|node|python)/i,  // Common command prefixes
      /\.(exe|bat|sh|ps1)$/i,      // Executable extensions
      /^[a-z]+\s+--?[a-z]/i        // CLI-style arguments
    ];

    return commandPatterns.some(pattern => pattern.test(message.trim()));
  }

  /**
   * Format response for WhatsApp
   */
  private formatResponse(response: string, persona: string): string {
    // Limit response length for WhatsApp
    const maxLength = 4000;

    if (response.length > maxLength) {
      response = response.substring(0, maxLength - 100) + '\n\n[Response truncated...]';
    }

    return response;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): { [persona: string]: { queueLength: number; isProcessing: boolean } } {
    const stats: { [persona: string]: { queueLength: number; isProcessing: boolean } } = {};

    for (const [persona, queue] of this.messageQueues) {
      stats[persona] = {
        queueLength: queue.length,
        isProcessing: this.processing.get(persona) || false
      };
    }

    return stats;
  }
}

export default MessageRouter;
