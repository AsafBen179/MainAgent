#!/usr/bin/env node
/**
 * Skills MCP Server
 *
 * Unified server providing:
 * - Sequential Thinking (Planning)
 * - Web Operator (Browser Automation)
 * - Memory Integration (Knowledge Base)
 * - Safety Guards (Execution + Browser)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { getPlanner } from '../core/planner/planner.js';
import { getWebOperator } from './web-operator/web-operator.js';
import { getBrowserGuard } from './web-operator/browser-guard.js';
import { getKnowledgeBase } from '../core/memory/knowledge-base.js';
import { getSelfCorrector } from './self-correction/self-corrector.js';
import { getCryptoNewsScraper } from './scrapers/crypto-news.js';

// Initialize components
const planner = getPlanner();
const webOperator = getWebOperator(false); // Run with visible browser for demo
const browserGuard = getBrowserGuard();
const kb = getKnowledgeBase();
const selfCorrector = getSelfCorrector();
const cryptoScraper = getCryptoNewsScraper();

// Tool schemas
const CreatePlanSchema = z.object({
  task_type: z.string().describe('Type: bug_fix, feature, research, automation, installation, etc.'),
  description: z.string().describe('What you want to accomplish'),
  success_criteria: z.array(z.string()).describe('How to know when done'),
  category: z.string().optional().describe('Category for memory lookup')
});

const AddPlanStepSchema = z.object({
  action: z.string().describe('Action name'),
  description: z.string().describe('What this step does'),
  dependencies: z.array(z.number()).optional().describe('Step IDs this depends on')
});

const StepUpdateSchema = z.object({
  step_id: z.number().describe('Step ID'),
  result: z.string().optional().describe('Result if completing'),
  error: z.string().optional().describe('Error if failing')
});

const NavigateSchema = z.object({
  session_id: z.string().optional().describe('Browser session ID'),
  url: z.string().describe('URL to navigate to'),
  wait_for_load: z.boolean().optional().describe('Wait for network idle')
});

const ScreenshotSchema = z.object({
  session_id: z.string().describe('Browser session ID'),
  name: z.string().optional().describe('Screenshot name'),
  full_page: z.boolean().optional().describe('Capture full page')
});

const ClickSchema = z.object({
  session_id: z.string().describe('Browser session ID'),
  selector: z.string().describe('CSS selector to click')
});

const TypeSchema = z.object({
  session_id: z.string().describe('Browser session ID'),
  selector: z.string().describe('CSS selector for input'),
  text: z.string().describe('Text to type')
});

// Self-Correction Schemas
const AnalyzeFailureSchema = z.object({
  action: z.string().describe('The action that failed (click, navigate, type, waitForSelector)'),
  selector: z.string().optional().describe('CSS selector if applicable'),
  url: z.string().optional().describe('URL being accessed'),
  error_message: z.string().describe('The error message'),
  stack_trace: z.string().optional().describe('Stack trace if available'),
  page_content: z.string().optional().describe('Page HTML at time of failure')
});

const SelfCorrectSchema = z.object({
  action: z.string().describe('The action that failed'),
  selector: z.string().optional().describe('CSS selector if applicable'),
  url: z.string().optional().describe('URL being accessed'),
  error_message: z.string().describe('The error message'),
  stack_trace: z.string().optional().describe('Stack trace'),
  page_content: z.string().optional().describe('Page HTML for selector analysis')
});

const ScrapeCryptoNewsSchema = z.object({
  source: z.enum(['coindesk', 'decrypt']).optional().describe('News source (default: coindesk)'),
  count: z.number().optional().describe('Number of articles to extract (default: 3)')
});

const AnalyzeSentimentSchema = z.object({
  text: z.string().describe('Text to analyze for sentiment')
});

// Create MCP Server
const server = new Server(
  {
    name: 'agent-skills',
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
      // === PLANNING TOOLS ===
      {
        name: 'create_plan',
        description: `Create a multi-step execution plan for a complex task.

IMPORTANT: Call this BEFORE starting any complex task. The planner will:
1. Consult the Memory Engine for relevant past lessons
2. Generate a structured plan with steps
3. Identify potential warnings from past failures
4. Assess the risk level of the task

This enables Sequential Thinking - planning before action.`,
        inputSchema: {
          type: 'object',
          properties: {
            task_type: { type: 'string', description: 'Type of task' },
            description: { type: 'string', description: 'What to accomplish' },
            success_criteria: {
              type: 'array',
              items: { type: 'string' },
              description: 'How to know when done'
            },
            category: { type: 'string', description: 'Category for memory lookup' }
          },
          required: ['task_type', 'description', 'success_criteria']
        }
      },
      {
        name: 'add_plan_step',
        description: 'Add a custom step to the current plan',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'Action name' },
            description: { type: 'string', description: 'What this step does' },
            dependencies: {
              type: 'array',
              items: { type: 'number' },
              description: 'Step IDs this depends on'
            }
          },
          required: ['action', 'description']
        }
      },
      {
        name: 'finalize_plan',
        description: 'Mark the plan as ready for execution',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'start_step',
        description: 'Begin executing a plan step',
        inputSchema: {
          type: 'object',
          properties: {
            step_id: { type: 'number', description: 'Step ID to start' }
          },
          required: ['step_id']
        }
      },
      {
        name: 'complete_step',
        description: 'Mark a step as completed',
        inputSchema: {
          type: 'object',
          properties: {
            step_id: { type: 'number', description: 'Step ID' },
            result: { type: 'string', description: 'Result of the step' }
          },
          required: ['step_id', 'result']
        }
      },
      {
        name: 'fail_step',
        description: 'Mark a step as failed (auto-saves lesson)',
        inputSchema: {
          type: 'object',
          properties: {
            step_id: { type: 'number', description: 'Step ID' },
            error: { type: 'string', description: 'Error that occurred' }
          },
          required: ['step_id', 'error']
        }
      },
      {
        name: 'complete_plan',
        description: 'Complete the entire plan (auto-saves lesson)',
        inputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: 'Whether plan succeeded' },
            summary: { type: 'string', description: 'Summary of outcome' }
          },
          required: ['success', 'summary']
        }
      },
      {
        name: 'get_plan',
        description: 'Get the current plan summary',
        inputSchema: { type: 'object', properties: {} }
      },

      // === WEB OPERATOR TOOLS ===
      {
        name: 'launch_browser',
        description: `Launch a new browser session for web automation.

The browser is controlled by Playwright and monitored by the Browser Guard.
All navigation is subject to safety checks.`,
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Optional session ID' }
          }
        }
      },
      {
        name: 'navigate',
        description: `Navigate to a URL with safety checks.

URLs are classified as:
- SAFE: Documentation, search engines, dev tools - auto-navigate
- CAUTION: E-commerce, email, downloads - navigate with logging
- RESTRICTED: Financial, auth, admin - requires WhatsApp approval
- BLOCKED: Malware, internal IPs, dangerous - never navigate`,
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Browser session ID (uses default if not specified)' },
            url: { type: 'string', description: 'URL to navigate to' },
            wait_for_load: { type: 'boolean', description: 'Wait for network idle' }
          },
          required: ['url']
        }
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current page for verification',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Browser session ID' },
            name: { type: 'string', description: 'Screenshot name' },
            full_page: { type: 'boolean', description: 'Capture full page' }
          },
          required: ['session_id']
        }
      },
      {
        name: 'click',
        description: 'Click an element on the page',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Browser session ID' },
            selector: { type: 'string', description: 'CSS selector' }
          },
          required: ['session_id', 'selector']
        }
      },
      {
        name: 'type_text',
        description: 'Type text into an input field',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Browser session ID' },
            selector: { type: 'string', description: 'CSS selector for input' },
            text: { type: 'string', description: 'Text to type' }
          },
          required: ['session_id', 'selector', 'text']
        }
      },
      {
        name: 'get_page_content',
        description: 'Get the text content of the current page',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Browser session ID' },
            type: { type: 'string', enum: ['text', 'html'], description: 'Content type' }
          },
          required: ['session_id']
        }
      },
      {
        name: 'classify_url',
        description: 'Check URL safety level without navigating',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to classify' }
          },
          required: ['url']
        }
      },
      {
        name: 'close_browser',
        description: 'Close a browser session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Browser session ID' }
          },
          required: ['session_id']
        }
      },
      {
        name: 'list_sessions',
        description: 'List all active browser sessions',
        inputSchema: { type: 'object', properties: {} }
      },

      // === SELF-CORRECTION TOOLS ===
      {
        name: 'analyze_failure',
        description: `Analyze why a Playwright/web automation action failed.

Uses Root Cause Analysis (RCA) to:
1. Categorize the failure (selector_outdated, timeout, network_error, etc.)
2. Search Memory for similar past failures and solutions
3. Extract evidence from error messages
4. Suggest corrective actions

Returns detailed analysis including confidence score and suggested fixes.`,
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'The action that failed' },
            selector: { type: 'string', description: 'CSS selector if applicable' },
            url: { type: 'string', description: 'URL being accessed' },
            error_message: { type: 'string', description: 'The error message' },
            stack_trace: { type: 'string', description: 'Stack trace if available' },
            page_content: { type: 'string', description: 'Page HTML at time of failure' }
          },
          required: ['action', 'error_message']
        }
      },
      {
        name: 'self_correct',
        description: `Attempt automated self-correction for a web automation failure.

This tool will:
1. Run RCA analysis on the failure
2. Query Memory for past solutions
3. Propose a code fix (only to src/skills/ files)
4. Submit fix to Guard for security validation
5. Apply fix if approved
6. Report outcome to Memory and WhatsApp

IMPORTANT: Can only modify files in src/skills/ or playbooks/.
The Guard validates all proposed code changes for forbidden patterns.`,
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'The action that failed' },
            selector: { type: 'string', description: 'CSS selector if applicable' },
            url: { type: 'string', description: 'URL being accessed' },
            error_message: { type: 'string', description: 'The error message' },
            stack_trace: { type: 'string', description: 'Stack trace' },
            page_content: { type: 'string', description: 'Page HTML for analysis' }
          },
          required: ['action', 'error_message']
        }
      },
      {
        name: 'propose_fix',
        description: `Propose a fix for a failure without applying it.

Useful for reviewing what changes would be made before executing self_correct.
Returns the proposed fix details and Guard validation results.`,
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', description: 'The action that failed' },
            selector: { type: 'string', description: 'CSS selector' },
            url: { type: 'string', description: 'URL' },
            error_message: { type: 'string', description: 'Error message' },
            page_content: { type: 'string', description: 'Page HTML' }
          },
          required: ['action', 'error_message']
        }
      },

      // === CRYPTO NEWS TOOLS ===
      {
        name: 'scrape_crypto_news',
        description: `Scrape top crypto news from CoinDesk or Decrypt.

This is the Web-Operator Playground demonstrating:
1. Live site navigation and scraping
2. Automatic sentiment analysis of headlines
3. Self-evolution - if selectors fail, attempts to find new ones
4. Memory integration - saves successful patterns as playbooks

Returns top articles with sentiment analysis (POSITIVE/NEUTRAL/NEGATIVE).`,
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              enum: ['coindesk', 'decrypt'],
              description: 'News source (default: coindesk)'
            },
            count: {
              type: 'number',
              description: 'Number of articles (default: 3)'
            }
          }
        }
      },
      {
        name: 'analyze_sentiment',
        description: 'Analyze the sentiment of a text (crypto/financial context)',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to analyze' }
          },
          required: ['text']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // === PLANNING TOOLS ===
    case 'create_plan': {
      const parsed = CreatePlanSchema.parse(args);
      const plan = planner.createPlan(
        parsed.task_type,
        parsed.description,
        parsed.success_criteria,
        parsed.category
      );

      return {
        content: [{
          type: 'text',
          text: `📋 Plan Created: ${plan.id}\n\n` +
            `Task: ${plan.task.description}\n` +
            `Risk Level: ${plan.safety.risk_level.toUpperCase()}\n` +
            `${plan.safety.requires_approval ? '⚠️ Requires approval before execution\n' : ''}\n` +
            `📚 Lessons Consulted: ${plan.memory_context.lessons_consulted.length}\n` +
            plan.memory_context.lessons_consulted.map((l, i) =>
              `  ${i + 1}. ${l.summary}`
            ).join('\n') +
            (plan.memory_context.warnings.length > 0 ?
              `\n\n⚠️ Warnings:\n${plan.memory_context.warnings.map((w, i) =>
                `  ${i + 1}. ${w}`
              ).join('\n')}` : '') +
            `\n\n📝 Steps:\n` +
            plan.steps.map(s => `  ${s.id}. ${s.action}: ${s.description}`).join('\n') +
            `\n\nUse finalize_plan when ready to execute.`
        }]
      };
    }

    case 'add_plan_step': {
      const parsed = AddPlanStepSchema.parse(args);
      const step = planner.addStep(parsed.action, parsed.description, parsed.dependencies);

      if (!step) {
        return { content: [{ type: 'text', text: '❌ No active plan. Create one first.' }] };
      }

      return {
        content: [{ type: 'text', text: `✅ Added step ${step.id}: ${step.action}` }]
      };
    }

    case 'finalize_plan': {
      const plan = planner.finalizePlan();
      if (!plan) {
        return { content: [{ type: 'text', text: '❌ No active plan.' }] };
      }

      return {
        content: [{ type: 'text', text: `✅ Plan ${plan.id} finalized and ready for execution.` }]
      };
    }

    case 'start_step': {
      const { step_id } = args as { step_id: number };
      const step = planner.startStep(step_id);

      if (!step) {
        return { content: [{ type: 'text', text: '❌ Cannot start step (not found or dependencies not met).' }] };
      }

      return {
        content: [{ type: 'text', text: `🔄 Started step ${step_id}: ${step.action}` }]
      };
    }

    case 'complete_step': {
      const { step_id, result } = args as { step_id: number; result: string };
      const step = planner.completeStep(step_id, result);

      if (!step) {
        return { content: [{ type: 'text', text: '❌ Step not found.' }] };
      }

      return {
        content: [{ type: 'text', text: `✅ Completed step ${step_id}: ${result}` }]
      };
    }

    case 'fail_step': {
      const { step_id, error } = args as { step_id: number; error: string };
      const step = planner.failStep(step_id, error);

      if (!step) {
        return { content: [{ type: 'text', text: '❌ Step not found.' }] };
      }

      return {
        content: [{ type: 'text', text: `❌ Step ${step_id} failed: ${error}\n📝 Lesson auto-saved.` }]
      };
    }

    case 'complete_plan': {
      const { success, summary } = args as { success: boolean; summary: string };
      const plan = planner.completePlan(success, summary);

      if (!plan) {
        return { content: [{ type: 'text', text: '❌ No active plan.' }] };
      }

      return {
        content: [{
          type: 'text',
          text: `${success ? '✅' : '❌'} Plan ${plan.id} ${success ? 'completed' : 'failed'}\n` +
            `Summary: ${summary}\n` +
            `📝 Lesson saved (ID: ${plan.outcome?.lesson_saved})`
        }]
      };
    }

    case 'get_plan': {
      const summary = planner.getPlanSummary();
      return { content: [{ type: 'text', text: summary }] };
    }

    // === WEB OPERATOR TOOLS ===
    case 'launch_browser': {
      const { session_id } = args as { session_id?: string };
      const result = await webOperator.launchBrowser(session_id);

      return {
        content: [{
          type: 'text',
          text: result.success
            ? `🌐 ${result.message}\nSession ID: ${result.sessionId}`
            : `❌ ${result.message}`
        }]
      };
    }

    case 'navigate': {
      const parsed = NavigateSchema.parse(args);
      let sessionId = parsed.session_id;

      // Auto-launch browser if no session
      if (!sessionId) {
        const sessions = webOperator.listSessions();
        if (sessions.length === 0) {
          const launch = await webOperator.launchBrowser();
          if (!launch.success) {
            return { content: [{ type: 'text', text: `❌ Failed to launch browser: ${launch.message}` }] };
          }
          sessionId = launch.sessionId;
        } else {
          sessionId = sessions[0];
        }
      }

      const result = await webOperator.navigate(sessionId, parsed.url, {
        waitForLoad: parsed.wait_for_load
      });

      const emoji = {
        SAFE: '🟢',
        CAUTION: '🟡',
        RESTRICTED: '🔴',
        BLOCKED: '🚫'
      }[result.classification.level];

      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: `${emoji} Navigation failed\nURL: ${result.url}\nReason: ${result.error || result.classification.reason}`
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: `${emoji} Navigated to: ${result.title || result.url}\nClassification: ${result.classification.level}\nSession: ${sessionId}`
        }]
      };
    }

    case 'screenshot': {
      const parsed = ScreenshotSchema.parse(args);
      const result = await webOperator.takeScreenshot(parsed.session_id, {
        name: parsed.name,
        fullPage: parsed.full_page
      });

      if (!result.success) {
        return { content: [{ type: 'text', text: '❌ Screenshot failed' }] };
      }

      return {
        content: [{
          type: 'text',
          text: `📸 Screenshot saved\nPath: ${result.path}\nURL: ${result.url}`
        }]
      };
    }

    case 'click': {
      const parsed = ClickSchema.parse(args);
      const result = await webOperator.click(parsed.session_id, parsed.selector);

      return {
        content: [{
          type: 'text',
          text: result.success ? `✅ ${result.message}` : `❌ ${result.message}`
        }]
      };
    }

    case 'type_text': {
      const parsed = TypeSchema.parse(args);
      const result = await webOperator.type(parsed.session_id, parsed.selector, parsed.text);

      return {
        content: [{
          type: 'text',
          text: result.success ? `✅ ${result.message}` : `❌ ${result.message}`
        }]
      };
    }

    case 'get_page_content': {
      const { session_id, type = 'text' } = args as { session_id: string; type?: 'text' | 'html' };
      const result = await webOperator.getPageContent(session_id, type);

      if (!result.success) {
        return { content: [{ type: 'text', text: '❌ Failed to get page content' }] };
      }

      return {
        content: [{
          type: 'text',
          text: `📄 Content from: ${result.url}\n\n${result.content.substring(0, 5000)}${result.content.length > 5000 ? '\n...(truncated)' : ''}`
        }]
      };
    }

    case 'classify_url': {
      const { url } = args as { url: string };
      const classification = browserGuard.classifyUrl(url);

      const emoji = {
        SAFE: '🟢',
        CAUTION: '🟡',
        RESTRICTED: '🔴',
        BLOCKED: '🚫'
      }[classification.level];

      return {
        content: [{
          type: 'text',
          text: `${emoji} URL Classification\n\n` +
            `URL: ${url}\n` +
            `Level: ${classification.level}\n` +
            `Category: ${classification.category}\n` +
            `Reason: ${classification.reason}\n` +
            `Requires Approval: ${classification.requiresApproval}`
        }]
      };
    }

    case 'close_browser': {
      const { session_id } = args as { session_id: string };
      const result = await webOperator.closeBrowser(session_id);

      return {
        content: [{
          type: 'text',
          text: result.success ? `✅ ${result.message}` : `❌ ${result.message}`
        }]
      };
    }

    case 'list_sessions': {
      const sessions = webOperator.listSessions();

      if (sessions.length === 0) {
        return { content: [{ type: 'text', text: '📭 No active browser sessions' }] };
      }

      const info = sessions.map(id => {
        const sessionInfo = webOperator.getSessionInfo(id);
        return `- ${id}: ${sessionInfo.url} (${sessionInfo.screenshotCount} screenshots)`;
      }).join('\n');

      return {
        content: [{ type: 'text', text: `🌐 Active Sessions:\n${info}` }]
      };
    }

    // === SELF-CORRECTION TOOLS ===
    case 'analyze_failure': {
      const parsed = AnalyzeFailureSchema.parse(args);

      const result = await selfCorrector.analyzeFailure({
        action: parsed.action,
        selector: parsed.selector,
        url: parsed.url,
        errorMessage: parsed.error_message,
        stackTrace: parsed.stack_trace,
        pageContent: parsed.page_content
      });

      const categoryEmoji: Record<string, string> = {
        selector_outdated: '🎯',
        timeout: '⏱️',
        network_error: '🌐',
        permission_denied: '🔒',
        logic_error: '🐛',
        environment_change: '🔄',
        dependency_issue: '📦',
        insufficient_context: '❓',
        unknown: '❔'
      };

      let response = `🔍 RCA Analysis: ${result.analysis.id}\n\n`;
      response += `Category: ${categoryEmoji[result.analysis.category] || '❔'} ${result.analysis.category}\n`;
      response += `Confidence: ${(result.analysis.confidence * 100).toFixed(0)}%\n`;
      response += `Root Cause: ${result.analysis.rootCause}\n\n`;

      if (result.analysis.evidence.length > 0) {
        response += `Evidence:\n${result.analysis.evidence.map(e => `  - ${e}`).join('\n')}\n\n`;
      }

      if (result.memorySolutions.length > 0) {
        response += `Memory Solutions:\n`;
        for (const sol of result.memorySolutions) {
          response += `  - [${(sol.similarity * 100).toFixed(0)}%] ${sol.summary}\n`;
          if (sol.solution) {
            response += `    Fix: ${sol.solution.substring(0, 100)}\n`;
          }
        }
        response += '\n';
      }

      response += `Suggested Actions:\n${result.suggestedActions.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}`;

      return {
        content: [{ type: 'text', text: response }]
      };
    }

    case 'self_correct': {
      const parsed = SelfCorrectSchema.parse(args);

      const result = await selfCorrector.analyzeAndCorrect({
        action: parsed.action,
        selector: parsed.selector,
        url: parsed.url,
        errorMessage: parsed.error_message,
        stackTrace: parsed.stack_trace,
        pageContent: parsed.page_content
      });

      let response = result.success
        ? `✅ Self-Correction Applied\n\n`
        : `❌ Self-Correction ${result.proposedFix ? 'Blocked' : 'No Fix Available'}\n\n`;

      response += `Analysis: ${result.analysis.category} (${(result.analysis.confidence * 100).toFixed(0)}% confidence)\n`;
      response += `Root Cause: ${result.analysis.rootCause}\n\n`;

      if (result.memorySolution) {
        response += `Memory Solution Found:\n`;
        response += `  Lesson #${result.memorySolution.lessonId}\n`;
        response += `  Solution: ${result.memorySolution.solution.substring(0, 150)}\n`;
        response += `  Confidence: ${(result.memorySolution.confidence * 100).toFixed(0)}%\n\n`;
      }

      if (result.proposedFix) {
        response += `Proposed Fix:\n`;
        response += `  Target: ${result.proposedFix.targetFile}\n`;
        response += `  Description: ${result.proposedFix.description}\n`;
        response += `  Guard Validation: ${result.proposedFix.guardValidation.passed ? '✅ PASSED' : '❌ BLOCKED'}\n`;

        if (!result.proposedFix.guardValidation.passed) {
          response += `  Violations: ${result.proposedFix.guardValidation.violations.join(', ')}\n`;
        }

        response += `  Applied: ${result.applied ? 'Yes' : 'No'}\n`;
      }

      response += `\nMessage: ${result.message}`;

      return {
        content: [{ type: 'text', text: response }]
      };
    }

    case 'propose_fix': {
      const parsed = SelfCorrectSchema.parse(args);

      const result = await selfCorrector.proposeFix({
        action: parsed.action,
        selector: parsed.selector,
        url: parsed.url,
        errorMessage: parsed.error_message,
        stackTrace: parsed.stack_trace,
        pageContent: parsed.page_content
      });

      if (!result.proposal) {
        return {
          content: [{ type: 'text', text: '❌ No fix could be proposed for this failure.' }]
        };
      }

      let response = `📝 Proposed Fix\n\n`;
      response += `Target File: ${result.proposal.targetFile}\n`;
      response += `Description: ${result.proposal.description}\n\n`;

      if (result.proposal.codeChanges.length > 0) {
        response += `Code Changes:\n`;
        for (const change of result.proposal.codeChanges) {
          response += `  Search: "${change.search.substring(0, 50)}..."\n`;
          response += `  Replace: "${change.replace.substring(0, 50)}..."\n\n`;
        }
      }

      response += `Guard Validation: ${result.validation.passed ? '✅ PASSED' : '❌ BLOCKED'}\n`;
      if (!result.validation.passed) {
        response += `Violations:\n${result.validation.violations.map(v => `  - ${v}`).join('\n')}\n`;
      }

      response += `\nCan Apply: ${result.canApply ? 'Yes - run self_correct to apply' : 'No'}`;

      return {
        content: [{ type: 'text', text: response }]
      };
    }

    // === CRYPTO NEWS TOOLS ===
    case 'scrape_crypto_news': {
      const parsed = ScrapeCryptoNewsSchema.parse(args);

      const result = await cryptoScraper.scrapeTopNews(
        parsed.source || 'coindesk',
        parsed.count || 3
      );

      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: `❌ Scraping Failed\n\nSource: ${result.source}\nError: ${result.error}`
          }]
        };
      }

      let response = `📰 Crypto News from ${result.source}\n\n`;

      for (let i = 0; i < result.articles.length; i++) {
        const article = result.articles[i];
        const sentimentEmoji = {
          POSITIVE: '📈',
          NEGATIVE: '📉',
          NEUTRAL: '➡️'
        }[article.sentiment.label];

        response += `${i + 1}. ${sentimentEmoji} ${article.title}\n`;
        response += `   Sentiment: ${article.sentiment.label} (${article.sentiment.score})\n`;
        if (article.sentiment.keywords.length > 0) {
          response += `   Keywords: ${article.sentiment.keywords.join(', ')}\n`;
        }
        if (article.url) {
          response += `   URL: ${article.url}\n`;
        }
        response += '\n';
      }

      if (result.selfEvolved) {
        response += `🔄 Self-Evolution Applied: ${result.evolutionDetails}\n`;
      }

      if (result.screenshot) {
        response += `📸 Screenshot: ${result.screenshot}`;
      }

      return {
        content: [{ type: 'text', text: response }]
      };
    }

    case 'analyze_sentiment': {
      const parsed = AnalyzeSentimentSchema.parse(args);
      const sentiment = cryptoScraper.analyzeSentiment(parsed.text);

      const emoji = {
        POSITIVE: '📈',
        NEGATIVE: '📉',
        NEUTRAL: '➡️'
      }[sentiment.label];

      return {
        content: [{
          type: 'text',
          text: `${emoji} Sentiment Analysis\n\n` +
            `Text: "${parsed.text.substring(0, 100)}${parsed.text.length > 100 ? '...' : ''}"\n\n` +
            `Label: ${sentiment.label}\n` +
            `Score: ${sentiment.score} (-1 to 1)\n` +
            `Keywords: ${sentiment.keywords.length > 0 ? sentiment.keywords.join(', ') : 'none detected'}`
        }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await webOperator.closeAll();
  process.exit(0);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Skills MCP Server running (Planning + Web Operator)');
}

main().catch(console.error);
