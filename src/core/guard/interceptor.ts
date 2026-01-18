/**
 * Command Interceptor
 *
 * This module provides utilities for intercepting and validating commands
 * before they are executed. Can be used as a Claude Code hook.
 */

import { CommandClassifier, ClassificationResult } from './classifier.js';
import { WhatsAppClient } from '../bridge/whatsapp-client.js';

export interface InterceptionResult {
  allowed: boolean;
  classification: ClassificationResult;
  message: string;
  requiresWait: boolean;
  approvalId?: string;
}

export class CommandInterceptor {
  private classifier: CommandClassifier;
  private whatsappClient: WhatsAppClient;

  constructor(policyPath?: string) {
    this.classifier = new CommandClassifier(policyPath);
    this.whatsappClient = new WhatsAppClient(policyPath);
  }

  /**
   * Intercept a command and determine if it should be allowed
   */
  async intercept(command: string): Promise<InterceptionResult> {
    const classification = this.classifier.classify(command);

    switch (classification.level) {
      case 'BLACKLISTED':
        await this.whatsappClient.notifyBlocked(command, classification.reason);
        return {
          allowed: false,
          classification,
          message: `BLOCKED: ${classification.reason}`,
          requiresWait: false
        };

      case 'RED':
        const approvalId = await this.whatsappClient.requestApproval(
          command,
          classification.reason,
          this.classifier.getApprovalTimeout()
        );
        return {
          allowed: false, // Not allowed yet - needs approval
          classification,
          message: `Approval required. Request ID: ${approvalId}`,
          requiresWait: true,
          approvalId
        };

      case 'YELLOW':
        // Log but allow
        await this.whatsappClient.logCommand(command, 'YELLOW');
        return {
          allowed: true,
          classification,
          message: 'Sensitive command - logged to WhatsApp',
          requiresWait: false
        };

      case 'GREEN':
      default:
        return {
          allowed: true,
          classification,
          message: 'Safe command - proceeding',
          requiresWait: false
        };
    }
  }

  /**
   * Wait for approval of a previously intercepted RED command
   */
  async waitForApproval(approvalId: string): Promise<boolean> {
    const result = await this.whatsappClient.waitForApproval(
      approvalId,
      this.classifier.getApprovalTimeout()
    );
    return result === 'approved';
  }

  /**
   * Quick check without WhatsApp interaction (for preview purposes)
   */
  classifyOnly(command: string): ClassificationResult {
    return this.classifier.classify(command);
  }

  /**
   * Check if a path operation is allowed
   */
  isPathOperationAllowed(path: string): boolean {
    return this.classifier.isPathAllowed(path);
  }
}

/**
 * CLI Hook Handler
 * This can be configured as a Claude Code pre-command hook
 */
export async function hookHandler(command: string): Promise<{ proceed: boolean; message?: string }> {
  const interceptor = new CommandInterceptor();
  const result = await interceptor.intercept(command);

  if (!result.allowed && !result.requiresWait) {
    // Blacklisted - immediately block
    return {
      proceed: false,
      message: result.message
    };
  }

  if (result.requiresWait && result.approvalId) {
    // RED command - wait for approval
    console.error(`⏳ Waiting for WhatsApp approval (ID: ${result.approvalId})...`);
    const approved = await interceptor.waitForApproval(result.approvalId);

    if (!approved) {
      return {
        proceed: false,
        message: 'Command not approved via WhatsApp'
      };
    }
  }

  return {
    proceed: true,
    message: result.message
  };
}

// CLI entry point for hook usage
if (process.argv[1]?.endsWith('interceptor.js') || process.argv[1]?.endsWith('interceptor.ts')) {
  const command = process.argv[2];

  if (!command) {
    console.error('Usage: interceptor <command>');
    process.exit(1);
  }

  hookHandler(command)
    .then(result => {
      if (result.message) {
        console.error(result.message);
      }
      process.exit(result.proceed ? 0 : 1);
    })
    .catch(error => {
      console.error('Interceptor error:', error);
      process.exit(1);
    });
}
