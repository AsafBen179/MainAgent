#!/usr/bin/env node
/**
 * SEASP MCP Server
 * Self-Evolution, Accuracy & Security Protocol
 *
 * Provides tools for:
 * - Self-improvement with safety guardrails
 * - Root Cause Analysis
 * - Playbook management
 * - Code validation
 * - Auto-rollback
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { getSelfEvolutionCoordinator } from './self-evolution.js';
import { getRCAEngine } from './rca-engine.js';
import { getConstitutionEnforcer } from './constitution-enforcer.js';
import { getPlaybookSystem } from './playbook-system.js';
import { getKnowledgeBase } from '../memory/knowledge-base.js';

// Initialize components
const evolution = getSelfEvolutionCoordinator();
const rca = getRCAEngine();
const enforcer = getConstitutionEnforcer();
const playbooks = getPlaybookSystem();
const kb = getKnowledgeBase();

// Schemas
const AnalyzeFailureSchema = z.object({
  task_type: z.string(),
  task_description: z.string(),
  error_message: z.string(),
  stderr: z.string().optional()
});

const ValidateCodeSchema = z.object({
  code: z.string(),
  filename: z.string().optional()
});

const CheckPathSchema = z.object({
  path: z.string(),
  operation: z.enum(['read', 'write', 'delete', 'execute'])
});

const CreatePlaybookSchema = z.object({
  name: z.string(),
  description: z.string(),
  task_types: z.array(z.string()),
  keywords: z.array(z.string()),
  steps: z.array(z.object({
    action: z.string(),
    tool: z.string(),
    args: z.record(z.unknown()),
    expectedOutcome: z.string()
  })),
  category: z.string().optional()
});

const RecordExecutionSchema = z.object({
  playbook_id: z.string(),
  success: z.boolean(),
  steps_completed: z.number(),
  total_steps: z.number(),
  duration_ms: z.number(),
  failed_step: z.number().optional(),
  error: z.string().optional()
});

// Create MCP Server
const server = new Server(
  {
    name: 'seasp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // === SELF-EVOLUTION TOOLS ===
      {
        name: 'evolve',
        description: `Trigger the self-evolution loop for a failed task.

This will:
1. Analyze the failure (RCA)
2. Propose a fix if possible
3. Run sanity check
4. Apply fix with [Self-Improvement] commit
5. Auto-rollback if validation fails

Only works on mutable layers (src/skills/, playbooks/, etc.)
Immutable core (src/guard/, config/) is protected.`,
        inputSchema: {
          type: 'object',
          properties: {
            task_type: { type: 'string', description: 'Type of failed task' },
            task_description: { type: 'string', description: 'What was attempted' },
            error_message: { type: 'string', description: 'Error that occurred' },
            stderr: { type: 'string', description: 'Standard error output' }
          },
          required: ['task_type', 'task_description', 'error_message']
        }
      },
      {
        name: 'analyze_failure',
        description: 'Run Root Cause Analysis on a failure without attempting to fix it.',
        inputSchema: {
          type: 'object',
          properties: {
            task_type: { type: 'string' },
            task_description: { type: 'string' },
            error_message: { type: 'string' },
            stderr: { type: 'string' }
          },
          required: ['task_type', 'task_description', 'error_message']
        }
      },
      {
        name: 'rollback',
        description: 'Manually rollback a self-improvement attempt.',
        inputSchema: {
          type: 'object',
          properties: {
            attempt_id: { type: 'string', description: 'ID of the improvement attempt' }
          },
          required: ['attempt_id']
        }
      },

      // === SECURITY TOOLS ===
      {
        name: 'validate_code',
        description: `Validate code for forbidden patterns before execution.

Checks for:
- eval() and dynamic code execution
- Direct child_process calls (bypassing Guard)
- VM module usage
- Network operations outside whitelist
- Obfuscated code
- System path modifications`,
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code to validate' },
            filename: { type: 'string', description: 'Filename for context' }
          },
          required: ['code']
        }
      },
      {
        name: 'check_path_access',
        description: 'Check if an operation is allowed on a path (immutable vs mutable).',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Target path' },
            operation: { type: 'string', enum: ['read', 'write', 'delete', 'execute'] }
          },
          required: ['path', 'operation']
        }
      },
      {
        name: 'check_network_access',
        description: 'Check if a URL is in the network whitelist.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to check' }
          },
          required: ['url']
        }
      },

      // === PLAYBOOK TOOLS ===
      {
        name: 'find_playbook',
        description: `Find an existing playbook for a task.

Before starting a task, check if there's a proven playbook to follow.
This ensures consistency and leverages past successes.`,
        inputSchema: {
          type: 'object',
          properties: {
            task_type: { type: 'string' },
            task_description: { type: 'string' },
            category: { type: 'string' }
          },
          required: ['task_type', 'task_description']
        }
      },
      {
        name: 'create_playbook',
        description: `Create a new playbook from a successful task workflow.

Saves the steps for reuse. Include verification steps for cross-channel validation.`,
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            task_types: { type: 'array', items: { type: 'string' } },
            keywords: { type: 'array', items: { type: 'string' } },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  tool: { type: 'string' },
                  args: { type: 'object' },
                  expectedOutcome: { type: 'string' }
                }
              }
            },
            category: { type: 'string' }
          },
          required: ['name', 'description', 'task_types', 'keywords', 'steps']
        }
      },
      {
        name: 'record_playbook_execution',
        description: 'Record the result of a playbook execution for accuracy tracking.',
        inputSchema: {
          type: 'object',
          properties: {
            playbook_id: { type: 'string' },
            success: { type: 'boolean' },
            steps_completed: { type: 'number' },
            total_steps: { type: 'number' },
            duration_ms: { type: 'number' },
            failed_step: { type: 'number' },
            error: { type: 'string' }
          },
          required: ['playbook_id', 'success', 'steps_completed', 'total_steps', 'duration_ms']
        }
      },
      {
        name: 'resume_playbook',
        description: 'Resume a paused playbook (after human review).',
        inputSchema: {
          type: 'object',
          properties: {
            playbook_id: { type: 'string' }
          },
          required: ['playbook_id']
        }
      },

      // === STATUS TOOLS ===
      {
        name: 'get_evolution_stats',
        description: 'Get statistics about self-evolution attempts and playbooks.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_playbooks_needing_review',
        description: 'Get playbooks that have been paused due to accuracy threshold violations.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_security_constitution',
        description: 'Get the current security rules and thresholds.',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // === SELF-EVOLUTION ===
    case 'evolve': {
      const parsed = AnalyzeFailureSchema.parse(args);
      const result = await evolution.evolve(
        parsed.task_type,
        parsed.task_description,
        parsed.error_message,
        parsed.stderr
      );

      const emoji = result.success ? '✅' : '❌';
      let text = `${emoji} Self-Evolution ${result.success ? 'Successful' : 'Failed'}\n\n`;
      text += `Attempt ID: ${result.attemptId}\n`;
      text += `Message: ${result.message}\n`;

      if (result.analysis) {
        text += `\n📊 Analysis:\n`;
        text += `  Category: ${result.analysis.category}\n`;
        text += `  Confidence: ${(result.analysis.confidence * 100).toFixed(0)}%\n`;
        text += `  Root Cause: ${result.analysis.rootCause}\n`;

        if (result.analysis.proposedFix) {
          text += `\n🔧 Proposed Fix:\n`;
          text += `  Target: ${result.analysis.proposedFix.targetFile}\n`;
          text += `  Type: ${result.analysis.proposedFix.changeType}\n`;
          text += `  Description: ${result.analysis.proposedFix.description}\n`;
        }
      }

      return { content: [{ type: 'text', text }] };
    }

    case 'analyze_failure': {
      const parsed = AnalyzeFailureSchema.parse(args);
      const analysis = await rca.analyzeFailure(
        parsed.task_type,
        parsed.task_description,
        parsed.error_message,
        parsed.stderr
      );

      let text = `📊 Root Cause Analysis\n\n`;
      text += `ID: ${analysis.id}\n`;
      text += `Category: ${analysis.category}\n`;
      text += `Confidence: ${(analysis.confidence * 100).toFixed(0)}%\n`;
      text += `Status: ${analysis.status}\n\n`;
      text += `Root Cause: ${analysis.rootCause}\n\n`;

      if (analysis.evidence.length > 0) {
        text += `Evidence:\n${analysis.evidence.map(e => `  - ${e}`).join('\n')}\n\n`;
      }

      if (analysis.similarPastFailures.length > 0) {
        text += `Similar Past Issues:\n`;
        analysis.similarPastFailures.forEach((f, i) => {
          text += `  ${i + 1}. ${f.summary}\n`;
          if (f.solution) text += `     Solution: ${f.solution}\n`;
        });
      }

      return { content: [{ type: 'text', text }] };
    }

    case 'rollback': {
      const { attempt_id } = args as { attempt_id: string };
      const success = await evolution.manualRollback(attempt_id);

      return {
        content: [{
          type: 'text',
          text: success
            ? `✅ Rolled back attempt ${attempt_id}`
            : `❌ Failed to rollback attempt ${attempt_id}`
        }]
      };
    }

    // === SECURITY ===
    case 'validate_code': {
      const parsed = ValidateCodeSchema.parse(args);
      const result = enforcer.validateCode(parsed.code, parsed.filename);

      if (result.valid) {
        return { content: [{ type: 'text', text: '✅ Code validation passed - no forbidden patterns detected' }] };
      }

      let text = `🚫 Code Validation Failed\n\n`;
      text += `Violations found: ${result.violations.length}\n\n`;

      result.violations.forEach((v, i) => {
        const emoji = v.severity === 'critical' ? '🔴' : v.severity === 'high' ? '🟠' : '🟡';
        text += `${i + 1}. ${emoji} ${v.pattern}\n`;
        text += `   Severity: ${v.severity}\n`;
        text += `   Reason: ${v.reason}\n`;
        if (v.line) text += `   Line: ${v.line}\n`;
        if (v.match) text += `   Match: ${v.match}\n`;
        text += '\n';
      });

      return { content: [{ type: 'text', text }] };
    }

    case 'check_path_access': {
      const parsed = CheckPathSchema.parse(args);
      const result = enforcer.checkPathAccess(parsed.path, parsed.operation);

      const emoji = result.allowed ? '✅' : '🚫';
      return {
        content: [{
          type: 'text',
          text: `${emoji} Path Access Check\n\n` +
            `Path: ${parsed.path}\n` +
            `Operation: ${parsed.operation}\n` +
            `Allowed: ${result.allowed}\n` +
            `Is Immutable: ${result.isImmutable}\n` +
            `Requires Validation: ${result.requiresValidation}\n` +
            `Reason: ${result.reason}`
        }]
      };
    }

    case 'check_network_access': {
      const { url } = args as { url: string };
      const result = enforcer.checkNetworkAccess(url);

      const emoji = result.allowed ? '✅' : result.requiresApproval ? '🟡' : '🚫';
      return {
        content: [{
          type: 'text',
          text: `${emoji} Network Access Check\n\n` +
            `URL: ${url}\n` +
            `Allowed: ${result.allowed}\n` +
            `Requires Approval: ${result.requiresApproval}\n` +
            `Reason: ${result.reason}`
        }]
      };
    }

    // === PLAYBOOKS ===
    case 'find_playbook': {
      const { task_type, task_description, category } = args as {
        task_type: string;
        task_description: string;
        category?: string;
      };

      const result = evolution.checkForPlaybook(task_type, task_description, category);

      if (!result.found) {
        return { content: [{ type: 'text', text: '📭 No matching playbook found. Consider creating one after successful completion.' }] };
      }

      const pb = result.playbook!;
      let text = `📋 Playbook Found: ${pb.name}\n\n`;
      text += `ID: ${pb.id}\n`;
      text += `Description: ${pb.description}\n`;
      text += `Accuracy: ${(result.accuracy! * 100).toFixed(0)}%\n`;
      text += `Uses: ${pb.metrics.timesUsed}\n\n`;
      text += `Steps:\n`;
      pb.steps.forEach((s: { id: number; action: string; tool: string; expectedOutcome: string }) => {
        text += `  ${s.id}. ${s.action} (${s.tool})\n`;
        text += `     Expected: ${s.expectedOutcome}\n`;
      });

      return { content: [{ type: 'text', text }] };
    }

    case 'create_playbook': {
      const parsed = CreatePlaybookSchema.parse(args);
      const id = evolution.saveAsPlaybook(
        parsed.name,
        parsed.description,
        parsed.task_types,
        parsed.keywords,
        parsed.steps,
        parsed.category
      );

      return {
        content: [{
          type: 'text',
          text: `✅ Playbook Created\n\nID: ${id}\nName: ${parsed.name}\nSteps: ${parsed.steps.length}`
        }]
      };
    }

    case 'record_playbook_execution': {
      const parsed = RecordExecutionSchema.parse(args);
      await playbooks.recordExecution({
        playbookId: parsed.playbook_id,
        success: parsed.success,
        stepsCompleted: parsed.steps_completed,
        totalSteps: parsed.total_steps,
        duration: parsed.duration_ms,
        failedStep: parsed.failed_step,
        error: parsed.error
      });

      return {
        content: [{
          type: 'text',
          text: `✅ Execution recorded for playbook ${parsed.playbook_id}`
        }]
      };
    }

    case 'resume_playbook': {
      const { playbook_id } = args as { playbook_id: string };
      const success = playbooks.resumePlaybook(playbook_id);

      return {
        content: [{
          type: 'text',
          text: success
            ? `✅ Playbook ${playbook_id} resumed`
            : `❌ Failed to resume playbook ${playbook_id}`
        }]
      };
    }

    // === STATUS ===
    case 'get_evolution_stats': {
      const stats = evolution.getStats();

      let text = `📊 Self-Evolution Statistics\n\n`;
      text += `Improvement Attempts:\n`;
      text += `  Total: ${stats.totalAttempts}\n`;
      text += `  Successful: ${stats.successful}\n`;
      text += `  Failed: ${stats.failed}\n`;
      text += `  Rolled Back: ${stats.rolledBack}\n\n`;
      text += `Playbooks:\n`;
      text += `  Total: ${stats.playbooks.total}\n`;
      text += `  Active: ${stats.playbooks.active}\n`;
      text += `  Under Review: ${stats.playbooks.underReview}\n`;
      text += `  Average Accuracy: ${(stats.playbooks.averageAccuracy * 100).toFixed(0)}%`;

      return { content: [{ type: 'text', text }] };
    }

    case 'get_playbooks_needing_review': {
      const needsReview = playbooks.getPlaybooksNeedingReview();

      if (needsReview.length === 0) {
        return { content: [{ type: 'text', text: '✅ No playbooks need review' }] };
      }

      let text = `⚠️ Playbooks Needing Review\n\n`;
      needsReview.forEach(pb => {
        text += `${pb.name} (${pb.id})\n`;
        text += `  Reason: ${pb.pauseReason}\n`;
        text += `  Accuracy: ${(playbooks.getPlaybookAccuracy(pb) * 100).toFixed(0)}%\n\n`;
      });

      return { content: [{ type: 'text', text }] };
    }

    case 'get_security_constitution': {
      const config = enforcer.getSelfEvolutionConfig();

      let text = `🔒 Security Constitution\n\n`;
      text += `Self-Evolution Config:\n`;
      text += `  Commit Prefix: ${config.commitPrefix}\n`;
      text += `  Requires Sanity Check: ${config.requiresSanityCheck}\n`;
      text += `  Rollback on Failure: ${config.rollbackOnFailure}\n`;
      text += `  Max Auto Retries: ${config.maxAutoRetries}\n`;
      text += `  Accuracy Threshold: ${(config.accuracyThreshold * 100).toFixed(0)}%\n`;
      text += `  Cooldown Period: ${config.cooldownPeriod}s\n\n`;
      text += `Immutable Core: src/guard/*, config/*, src/evolution/constitution-enforcer.ts\n`;
      text += `Mutable Layers: src/skills/*, playbooks/*, memory/*`;

      return { content: [{ type: 'text', text }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SEASP MCP Server running (Self-Evolution, Accuracy & Security Protocol)');
}

main().catch(console.error);
