#!/usr/bin/env node
/**
 * Universal Autonomous Agent Core
 *
 * Unified MCP Server combining:
 * - Execution Guard (Safety Layer)
 * - Memory Engine (Self-Learning)
 *
 * Key behaviors:
 * - Auto-queries lessons before executing commands
 * - Auto-saves lessons when commands fail or bugs are fixed
 * - All actions pass through the safety guard
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

import { CommandClassifier, ClassificationResult, RiskLevel } from './guard/classifier.js';
import { WhatsAppClient } from './bridge/whatsapp-client.js';
import { KnowledgeBase, getKnowledgeBase } from './memory/knowledge-base.js';
import { Lesson } from './memory/schema.js';

const execAsync = promisify(exec);

// Initialize components
const classifier = new CommandClassifier();
const whatsappClient = new WhatsAppClient();
const kb = getKnowledgeBase();

// Ensure log directory exists
const logDir = join(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Tool schemas
const ExecuteWithMemoryArgsSchema = z.object({
  command: z.string().describe('The command to execute'),
  task_type: z.string().optional().describe('Type of task for memory lookup'),
  task_description: z.string().optional().describe('Description of what this command does'),
  workingDirectory: z.string().optional().describe('Working directory')
});

const ReflectOnTaskArgsSchema = z.object({
  task_type: z.string().describe('Type of task'),
  task_description: z.string().describe('What was attempted'),
  success: z.boolean().describe('Whether it succeeded'),
  lesson_summary: z.string().describe('Key takeaway'),
  category: z.string().optional(),
  error_message: z.string().optional(),
  root_cause: z.string().optional(),
  solution: z.string().optional(),
  attempts: z.number().optional()
});

const PrepareForTaskArgsSchema = z.object({
  task_type: z.string().describe('Type of task about to be performed'),
  task_description: z.string().describe('Description of the task'),
  category: z.string().optional().describe('Category for filtering lessons')
});

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

  const logFile = join(logDir, `agent-${new Date().toISOString().split('T')[0]}.log`);
  appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

/**
 * Execute a command with full agent capabilities:
 * 1. Check for relevant lessons
 * 2. Pass through safety guard
 * 3. Auto-save lesson on failure
 */
async function executeWithMemory(
  command: string,
  taskType?: string,
  taskDescription?: string,
  workingDirectory?: string
): Promise<{
  success: boolean;
  output: string;
  classification: ClassificationResult;
  relevantLessons: Lesson[];
  lessonSaved?: number;
}> {
  const startTime = Date.now();
  const type = taskType || 'command_execution';
  const description = taskDescription || command;

  // Step 1: Query for relevant lessons BEFORE execution
  const relevantLessons = kb.queryLessons({
    task_type: type,
    search_text: description,
    limit: 3
  });

  // Step 2: Classify the command
  const classification = classifier.classify(command);

  // Step 3: Handle based on classification
  if (classification.level === 'BLACKLISTED') {
    await whatsappClient.notifyBlocked(command, classification.reason);
    logAction('BLACKLISTED', command, 'BLOCKED', false);

    // Auto-save lesson about blocked command
    const lessonId = kb.saveLesson({
      task_type: 'command_blocked',
      task_description: description,
      success: false,
      error_message: `Command blocked: ${classification.reason}`,
      lesson_summary: `Command "${command.substring(0, 50)}..." is blacklisted and should never be attempted`,
      category: 'security'
    });

    return {
      success: false,
      output: `🚫 BLOCKED: ${classification.reason}`,
      classification,
      relevantLessons,
      lessonSaved: lessonId
    };
  }

  // RED commands need approval
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
        classification,
        relevantLessons
      };
    }

    await whatsappClient.logCommand(command, 'RED', 'Approved and executing...');
  }

  // YELLOW commands are logged
  if (classification.level === 'YELLOW') {
    await whatsappClient.logCommand(command, 'YELLOW');
  }

  // Step 4: Execute the command
  try {
    const options = workingDirectory ? { cwd: workingDirectory } : {};
    const { stdout, stderr } = await execAsync(command, {
      ...options,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024
    });

    const output = stdout || stderr || 'Command completed successfully';
    const duration = Date.now() - startTime;

    logAction(classification.level, command, output, true);

    // Log successful execution
    kb.logTaskExecution({
      task_type: type,
      command,
      working_directory: workingDirectory,
      status: 'completed',
      exit_code: 0,
      output: output.substring(0, 5000),
      duration_ms: duration
    });

    if (classification.level === 'YELLOW') {
      await whatsappClient.logCommand(command, 'YELLOW', output.substring(0, 200));
    }

    return {
      success: true,
      output,
      classification,
      relevantLessons
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;

    logAction(classification.level, command, `ERROR: ${errorMessage}`, true);

    // Auto-save lesson about the failure
    const lessonId = kb.saveLesson({
      task_type: type,
      task_description: description,
      success: false,
      error_message: errorMessage,
      lesson_summary: `Command "${command.substring(0, 30)}..." failed: ${errorMessage.substring(0, 100)}`,
      category: extractCategory(command)
    });

    // Log failed execution
    kb.logTaskExecution({
      task_type: type,
      command,
      working_directory: workingDirectory,
      status: 'failed',
      error_output: errorMessage,
      duration_ms: duration,
      lesson_id: lessonId
    });

    // Check if we have a solution for this error
    const solutions = kb.findLessonsForError(errorMessage, 3);

    let outputText = `Error executing command: ${errorMessage}\n\n📝 Lesson auto-saved (ID: ${lessonId})`;

    if (solutions.length > 0) {
      outputText += '\n\n💡 Potentially helpful lessons found:\n';
      solutions.forEach((s, i) => {
        outputText += `${i + 1}. ${s.lesson_summary}\n`;
        if (s.solution) outputText += `   Solution: ${s.solution}\n`;
      });
    }

    return {
      success: false,
      output: outputText,
      classification,
      relevantLessons: solutions,
      lessonSaved: lessonId
    };
  }
}

/**
 * Extract category from command
 */
function extractCategory(command: string): string {
  const lowerCmd = command.toLowerCase();
  if (lowerCmd.startsWith('npm ') || lowerCmd.startsWith('yarn ')) return 'npm';
  if (lowerCmd.startsWith('git ')) return 'git';
  if (lowerCmd.startsWith('pip ') || lowerCmd.startsWith('python ')) return 'python';
  if (lowerCmd.includes('typescript') || lowerCmd.includes('tsc')) return 'typescript';
  if (lowerCmd.startsWith('docker ')) return 'docker';
  if (lowerCmd.includes('powershell') || lowerCmd.includes('ps1')) return 'powershell';
  return 'general';
}

// Create the unified MCP Server
const server = new Server(
  {
    name: 'agent-core',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List all tools (Guard + Memory combined)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // === PRIMARY TOOL ===
      {
        name: 'execute',
        description: `Execute a command through the Agent Core.

This tool automatically:
1. Queries for relevant lessons BEFORE execution
2. Passes the command through the safety guard
3. Auto-saves a lesson if the command FAILS
4. Returns any relevant past lessons that might help

Use this instead of raw shell execution for safety and learning.`,
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'The command to execute' },
            task_type: { type: 'string', description: 'Type of task: bug_fix, installation, configuration, etc.' },
            task_description: { type: 'string', description: 'What this command is trying to accomplish' },
            workingDirectory: { type: 'string', description: 'Working directory for execution' }
          },
          required: ['command']
        }
      },

      // === MEMORY TOOLS ===
      {
        name: 'prepare_for_task',
        description: `Call this BEFORE starting any significant task.

Returns relevant lessons and insights that might help with the task.
This is crucial for avoiding past mistakes and applying known solutions.`,
        inputSchema: {
          type: 'object',
          properties: {
            task_type: { type: 'string', description: 'Type of task: bug_fix, installation, configuration, coding, etc.' },
            task_description: { type: 'string', description: 'Description of what you\'re about to do' },
            category: { type: 'string', description: 'Category: npm, git, typescript, etc.' }
          },
          required: ['task_type', 'task_description']
        }
      },
      {
        name: 'reflect_on_task',
        description: `Call this AFTER completing a task (success or failure).

Saves a lesson learned for future reference. This is how the agent builds knowledge.

CRITICAL: Always call this when:
- A bug is fixed (include the solution!)
- A task fails (include what went wrong)
- A non-obvious solution is discovered
- A workaround is found`,
        inputSchema: {
          type: 'object',
          properties: {
            task_type: { type: 'string', description: 'Type of task' },
            task_description: { type: 'string', description: 'What was attempted' },
            success: { type: 'boolean', description: 'Whether it succeeded' },
            lesson_summary: { type: 'string', description: 'Key takeaway in ONE sentence' },
            category: { type: 'string', description: 'Category' },
            error_message: { type: 'string', description: 'Error encountered (if any)' },
            root_cause: { type: 'string', description: 'Why it failed/succeeded' },
            solution: { type: 'string', description: 'What worked (be specific!)' },
            attempts: { type: 'number', description: 'Number of attempts' }
          },
          required: ['task_type', 'task_description', 'success', 'lesson_summary']
        }
      },
      {
        name: 'find_solution',
        description: 'Find lessons that might help resolve a specific error.',
        inputSchema: {
          type: 'object',
          properties: {
            error_message: { type: 'string', description: 'The error message' },
            limit: { type: 'number', description: 'Max results' }
          },
          required: ['error_message']
        }
      },
      {
        name: 'mark_lesson_used',
        description: 'Mark a lesson as applied (boosts its relevance for future queries).',
        inputSchema: {
          type: 'object',
          properties: {
            lesson_id: { type: 'number', description: 'ID of the lesson' }
          },
          required: ['lesson_id']
        }
      },
      {
        name: 'get_knowledge_stats',
        description: 'Get statistics about the agent\'s knowledge base.',
        inputSchema: { type: 'object', properties: {} }
      },

      // === GUARD TOOLS ===
      {
        name: 'classify_command',
        description: 'Check a command\'s safety level without executing it.',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'The command to classify' }
          },
          required: ['command']
        }
      },
      {
        name: 'get_agent_status',
        description: 'Get the current status of the Agent Core (Guard + Memory).',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'execute': {
      const parsed = ExecuteWithMemoryArgsSchema.parse(args);
      const result = await executeWithMemory(
        parsed.command,
        parsed.task_type,
        parsed.task_description,
        parsed.workingDirectory
      );

      const levelEmoji = {
        GREEN: '🟢',
        YELLOW: '🟡',
        RED: '🔴',
        BLACKLISTED: '🚫'
      }[result.classification.level];

      let response = `${levelEmoji} [${result.classification.level}] ${result.success ? 'Success' : 'Failed'}\n\n`;

      if (result.relevantLessons.length > 0 && result.success) {
        response += '📚 Relevant lessons were found before execution.\n\n';
      }

      response += result.output;

      if (result.lessonSaved) {
        response += `\n\n📝 Lesson auto-saved (ID: ${result.lessonSaved})`;
      }

      return { content: [{ type: 'text', text: response }] };
    }

    case 'prepare_for_task': {
      const parsed = PrepareForTaskArgsSchema.parse(args);

      // Query multiple sources for relevant knowledge
      const byType = kb.queryLessons({ task_type: parsed.task_type, limit: 3 });
      const bySearch = kb.searchLessons(parsed.task_description, 3);
      const byCategory = parsed.category
        ? kb.queryLessons({ category: parsed.category, success_only: true, limit: 2 })
        : [];

      // Combine and dedupe
      const allLessons = [...byType, ...bySearch, ...byCategory];
      const uniqueLessons = allLessons.filter((lesson, index, self) =>
        index === self.findIndex(l => l.id === lesson.id)
      ).slice(0, 5);

      if (uniqueLessons.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `📋 Preparing for: ${parsed.task_description}\n\n` +
              `No relevant lessons found. This appears to be a new type of task.\n` +
              `Remember to call reflect_on_task when done to save what you learn!`
          }]
        };
      }

      const formatted = uniqueLessons.map((lesson, i) => {
        const emoji = lesson.success ? '✅' : '⚠️';
        let text = `${i + 1}. ${emoji} ${lesson.lesson_summary}`;
        if (lesson.solution) text += `\n   💡 Solution: ${lesson.solution}`;
        if (!lesson.success && lesson.error_message) {
          text += `\n   ⚠️ Avoid: ${lesson.error_message.substring(0, 80)}...`;
        }
        return text;
      }).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `📋 Preparing for: ${parsed.task_description}\n\n` +
            `📚 ${uniqueLessons.length} relevant lesson(s) found:\n\n${formatted}\n\n` +
            `Use mark_lesson_used if any of these help!`
        }]
      };
    }

    case 'reflect_on_task': {
      const parsed = ReflectOnTaskArgsSchema.parse(args);
      const lessonId = kb.saveLesson({
        task_type: parsed.task_type,
        task_description: parsed.task_description,
        success: parsed.success,
        lesson_summary: parsed.lesson_summary,
        category: parsed.category,
        error_message: parsed.error_message,
        root_cause: parsed.root_cause,
        solution: parsed.solution,
        attempts_before_success: parsed.attempts
      });

      const emoji = parsed.success ? '✅' : '❌';
      return {
        content: [{
          type: 'text',
          text: `${emoji} Lesson saved (ID: ${lessonId})\n\n` +
            `Type: ${parsed.task_type}\n` +
            `Summary: ${parsed.lesson_summary}\n` +
            (parsed.solution ? `Solution: ${parsed.solution}\n` : '') +
            `\nThis knowledge is now available for future tasks.`
        }]
      };
    }

    case 'find_solution': {
      const { error_message, limit = 5 } = args as { error_message: string; limit?: number };
      const lessons = kb.findLessonsForError(error_message, limit);

      if (lessons.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '🔍 No solutions found for this error. This might be a new issue.'
          }]
        };
      }

      const formatted = lessons.map((l, i) =>
        `${i + 1}. [ID: ${l.id}] ${l.lesson_summary}\n` +
        `   Solution: ${l.solution || 'See lesson details'}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `💡 ${lessons.length} potential solution(s):\n\n${formatted}`
        }]
      };
    }

    case 'mark_lesson_used': {
      const { lesson_id } = args as { lesson_id: number };
      kb.markLessonApplied(lesson_id);
      return {
        content: [{
          type: 'text',
          text: `✨ Lesson ${lesson_id} marked as applied. Relevance boosted.`
        }]
      };
    }

    case 'get_knowledge_stats': {
      const stats = kb.getStats();
      return {
        content: [{
          type: 'text',
          text: `📊 Knowledge Base Stats\n\n` +
            `Total Lessons: ${stats.total_lessons}\n` +
            `  ✅ Successful: ${stats.successful_lessons}\n` +
            `  ❌ Failed: ${stats.failed_lessons}\n` +
            `Tasks Logged: ${stats.total_tasks}\n\n` +
            `Top Categories:\n${stats.most_common_categories.map(c => `  - ${c.category}: ${c.count}`).join('\n')}`
        }]
      };
    }

    case 'classify_command': {
      const { command } = args as { command: string };
      const c = classifier.classify(command);
      const emoji = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴', BLACKLISTED: '🚫' }[c.level];

      return {
        content: [{
          type: 'text',
          text: `${emoji} ${c.level}\n\nCommand: ${c.command}\nReason: ${c.reason}\n` +
            `Auto-execute: ${c.autoExecute}\nRequires approval: ${c.requiresApproval}`
        }]
      };
    }

    case 'get_agent_status': {
      const stats = kb.getStats();
      return {
        content: [{
          type: 'text',
          text: `🤖 Agent Core Status\n\n` +
            `Guard: Active\n` +
            `Memory: Active (${stats.total_lessons} lessons)\n` +
            `WhatsApp: Connected\n` +
            `Approval Timeout: ${classifier.getApprovalTimeout()}s\n` +
            `Log Directory: ${logDir}`
        }]
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
  console.error('Agent Core MCP Server running (Guard + Memory integrated)');
}

main().catch(console.error);
