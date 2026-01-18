#!/usr/bin/env node
/**
 * Execution Guard - MCP Server
 *
 * This is the safety gateway for the Universal Autonomous Agent Core.
 * All commands pass through this server for classification and approval.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CommandClassifier, ClassificationResult, RiskLevel } from './classifier.js';
import { WhatsAppClient } from '../bridge/whatsapp-client.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

// Tool argument schemas
const ExecuteCommandArgsSchema = z.object({
  command: z.string().describe('The command to execute'),
  workingDirectory: z.string().optional().describe('Working directory for command execution'),
  reason: z.string().optional().describe('Reason for running this command')
});

const ClassifyCommandArgsSchema = z.object({
  command: z.string().describe('The command to classify')
});

// Initialize components
const classifier = new CommandClassifier();
const whatsappClient = new WhatsAppClient();

// Ensure log directory exists
const logDir = join(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

/**
 * Log an action to the local log file
 */
function logAction(level: RiskLevel, command: string, result: string, approved: boolean): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    command,
    result: result.substring(0, 500),
    approved
  };

  const logFile = join(logDir, `guard-${new Date().toISOString().split('T')[0]}.log`);
  appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

/**
 * Execute a command after safety checks
 */
async function executeWithGuard(
  command: string,
  workingDirectory?: string
): Promise<{ success: boolean; output: string; classification: ClassificationResult }> {
  const classification = classifier.classify(command);

  // BLACKLISTED - Never execute
  if (classification.level === 'BLACKLISTED') {
    await whatsappClient.notifyBlocked(command, classification.reason);
    logAction('BLACKLISTED', command, 'BLOCKED', false);

    return {
      success: false,
      output: `🚫 BLOCKED: ${classification.reason}`,
      classification
    };
  }

  // RED - Requires approval
  if (classification.level === 'RED') {
    const approvalId = await whatsappClient.requestApproval(
      command,
      classification.reason,
      classifier.getApprovalTimeout()
    );

    const approvalResult = await whatsappClient.waitForApproval(
      approvalId,
      classifier.getApprovalTimeout()
    );

    if (approvalResult !== 'approved') {
      logAction('RED', command, `Approval ${approvalResult}`, false);

      return {
        success: false,
        output: `❌ Command ${approvalResult === 'denied' ? 'denied' : 'timed out'} - approval not granted`,
        classification
      };
    }

    // Approved - proceed with execution
    await whatsappClient.logCommand(command, 'RED', 'Approved and executing...');
  }

  // YELLOW - Execute and log
  if (classification.level === 'YELLOW') {
    await whatsappClient.logCommand(command, 'YELLOW');
  }

  // Execute the command
  try {
    const options = workingDirectory ? { cwd: workingDirectory } : {};
    const { stdout, stderr } = await execAsync(command, {
      ...options,
      timeout: 120000, // 2 minute timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    const output = stdout || stderr || 'Command completed successfully';
    logAction(classification.level, command, output, true);

    // Log result for YELLOW commands
    if (classification.level === 'YELLOW') {
      await whatsappClient.logCommand(command, 'YELLOW', output.substring(0, 200));
    }

    return {
      success: true,
      output,
      classification
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logAction(classification.level, command, `ERROR: ${errorMessage}`, true);

    return {
      success: false,
      output: `Error executing command: ${errorMessage}`,
      classification
    };
  }
}

// Create the MCP Server
const server = new Server(
  {
    name: 'execution-guard',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'execute_command',
        description: `Execute a system command through the Execution Guard safety layer.

Commands are classified into safety levels:
- GREEN: Safe read operations - auto-executed
- YELLOW: Sensitive operations - executed and logged to WhatsApp
- RED: Critical operations - requires WhatsApp approval before execution
- BLACKLISTED: Dangerous commands - never executed

All commands are logged for traceability.`,
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The command to execute'
            },
            workingDirectory: {
              type: 'string',
              description: 'Working directory for command execution (optional)'
            },
            reason: {
              type: 'string',
              description: 'Reason for running this command (helps with auditing)'
            }
          },
          required: ['command']
        }
      },
      {
        name: 'classify_command',
        description: 'Classify a command to check its safety level without executing it.',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The command to classify'
            }
          },
          required: ['command']
        }
      },
      {
        name: 'get_guard_status',
        description: 'Get the current status of the Execution Guard',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'execute_command': {
      const parsed = ExecuteCommandArgsSchema.parse(args);
      const result = await executeWithGuard(parsed.command, parsed.workingDirectory);

      const levelEmoji = {
        GREEN: '🟢',
        YELLOW: '🟡',
        RED: '🔴',
        BLACKLISTED: '🚫'
      }[result.classification.level];

      return {
        content: [
          {
            type: 'text',
            text: `${levelEmoji} [${result.classification.level}] ${result.success ? 'Success' : 'Failed'}\n\n${result.output}`
          }
        ]
      };
    }

    case 'classify_command': {
      const parsed = ClassifyCommandArgsSchema.parse(args);
      const classification = classifier.classify(parsed.command);

      const levelEmoji = {
        GREEN: '🟢',
        YELLOW: '🟡',
        RED: '🔴',
        BLACKLISTED: '🚫'
      }[classification.level];

      return {
        content: [
          {
            type: 'text',
            text: `${levelEmoji} Classification: ${classification.level}\n\n` +
              `Command: ${classification.command}\n` +
              `Reason: ${classification.reason}\n` +
              `Auto-execute: ${classification.autoExecute}\n` +
              `Requires approval: ${classification.requiresApproval}\n` +
              `Will log to WhatsApp: ${classification.logToWhatsApp}`
          }
        ]
      };
    }

    case 'get_guard_status': {
      return {
        content: [
          {
            type: 'text',
            text: `🛡️ Execution Guard Status\n\n` +
              `Status: Active\n` +
              `Version: 1.0.0\n` +
              `Policy: guard_policy.json\n` +
              `Approval Timeout: ${classifier.getApprovalTimeout()}s\n` +
              `WhatsApp Integration: Connected\n` +
              `Log Directory: ${logDir}`
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Execution Guard MCP Server running on stdio');
}

main().catch(console.error);
