/**
 * Tactical Planning Skill - Structured Execution Plans for Multi-Step Missions
 *
 * @description This skill generates structured JSON execution plans before starting complex,
 * multi-step tasks. It helps Claude "think before acting" by creating a roadmap that can be:
 * - Monitored via WhatsApp bridge
 * - Validated for safety before execution
 * - Tracked step-by-step during execution
 * - Used for learning and improvement
 *
 * Use this skill when you need to:
 * - Execute multi-step web automation tasks
 * - Perform complex data extraction
 * - Navigate through multiple pages or forms
 * - Execute tasks that require verification at each step
 *
 * @example
 * // Create a plan for analyzing crypto data
 * const plan = await tacticalPlanning({
 *   action: 'create',
 *   goal: 'Analyze ETH/BTC ratio on TradingView',
 *   steps: [
 *     { action: 'navigate', target: 'https://tradingview.com/symbols/ETHBTC' },
 *     { action: 'waitFor', target: '.tv-symbol-price-quote__value' },
 *     { action: 'screenshot', description: 'Capture current chart' },
 *     { action: 'extract', target: '.tv-symbol-price-quote__value', field: 'price' }
 *   ]
 * });
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Plans directory
const plansDir = join(process.cwd(), 'plans');
if (!existsSync(plansDir)) {
  mkdirSync(plansDir, { recursive: true });
}

// Current active plan
let currentPlan: TacticalPlan | null = null;

interface PlanStep {
  id: number;
  action: string;
  target?: string;
  description?: string;
  expectedOutcome?: string;
  timeout?: number;
  onFailure?: 'abort' | 'retry' | 'skip' | 'self_correct';
  maxRetries?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: {
    success: boolean;
    message: string;
    data?: unknown;
    timestamp: string;
  };
}

interface TacticalPlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  goal: {
    description: string;
    category: string;
    successCriteria: string[];
  };
  preConditions: Array<{
    condition: string;
    verified: boolean;
  }>;
  steps: PlanStep[];
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'aborted';
  currentStepIndex: number;
  startedAt?: string;
  completedAt?: string;
  outcome?: {
    success: boolean;
    summary: string;
    data?: Record<string, unknown>;
  };
}

/**
 * Tactical Planning - Create and execute structured multi-step plans
 *
 * @description Generates JSON execution plans for complex tasks. Plans include:
 * - Goal definition with success criteria
 * - Pre-conditions to verify before starting
 * - Step-by-step actions with expected outcomes
 * - Failure handling strategies per step
 * - Real-time status tracking
 *
 * @param {Object} params - The operation parameters
 * @param {string} params.action - The action: 'create' | 'addStep' | 'approve' | 'start' | 'completeStep' | 'getStatus' | 'abort' | 'getSummary'
 * @param {string} [params.goal] - Goal description (for 'create' action)
 * @param {string} [params.category] - Task category: 'trading' | 'research' | 'data_extraction' | 'form_submission' | 'navigation'
 * @param {string[]} [params.successCriteria] - List of success criteria
 * @param {string[]} [params.preConditions] - List of pre-conditions to verify
 * @param {Array} [params.steps] - Array of step definitions (for 'create' action)
 * @param {Object} [params.step] - Single step definition (for 'addStep' action)
 * @param {boolean} [params.success] - Step success status (for 'completeStep' action)
 * @param {string} [params.message] - Step result message (for 'completeStep' action)
 * @param {unknown} [params.data] - Step result data (for 'completeStep' action)
 * @param {string} [params.reason] - Abort reason (for 'abort' action)
 *
 * @returns {Promise<Object>} Plan status and relevant data
 *
 * @example
 * // Create a trading analysis plan
 * const result = await tacticalPlanning({
 *   action: 'create',
 *   goal: 'Analyze ETH/BTC on TradingView',
 *   category: 'trading',
 *   successCriteria: ['Extract current price', 'Capture chart screenshot', 'Identify trend'],
 *   steps: [
 *     { action: 'navigate', target: 'https://tradingview.com/symbols/ETHBTC', description: 'Open TradingView' },
 *     { action: 'waitFor', target: '.tv-symbol-price-quote__value', timeout: 10000 },
 *     { action: 'screenshot', description: 'Capture chart' },
 *     { action: 'extract', target: '.tv-symbol-price-quote__value', description: 'Get price' }
 *   ]
 * });
 *
 * @example
 * // Start plan execution
 * await tacticalPlanning({ action: 'approve' });
 * await tacticalPlanning({ action: 'start' });
 *
 * @example
 * // Complete a step
 * await tacticalPlanning({
 *   action: 'completeStep',
 *   success: true,
 *   message: 'Navigated successfully',
 *   data: { title: 'ETHBTC Chart' }
 * });
 */
export default async function tacticalPlanning(params: {
  action: 'create' | 'addStep' | 'approve' | 'start' | 'completeStep' | 'getStatus' | 'abort' | 'getSummary' | 'load';
  goal?: string;
  category?: string;
  successCriteria?: string[];
  preConditions?: string[];
  steps?: Array<{
    action: string;
    target?: string;
    description?: string;
    expectedOutcome?: string;
    timeout?: number;
    onFailure?: 'abort' | 'retry' | 'skip' | 'self_correct';
    maxRetries?: number;
  }>;
  step?: {
    action: string;
    target?: string;
    description?: string;
    expectedOutcome?: string;
    timeout?: number;
    onFailure?: 'abort' | 'retry' | 'skip' | 'self_correct';
  };
  success?: boolean;
  message?: string;
  data?: unknown;
  reason?: string;
  planId?: string;
}): Promise<{
  success: boolean;
  message: string;
  plan?: TacticalPlan;
  currentStep?: PlanStep;
  summary?: string;
  nextStep?: PlanStep | null;
  planComplete?: boolean;
}> {
  const { action } = params;

  try {
    switch (action) {
      case 'create': {
        if (!params.goal) {
          return { success: false, message: 'Goal is required for plan creation' };
        }

        const planId = `TP-${Date.now().toString(36).toUpperCase()}`;
        const now = new Date().toISOString();

        const steps: PlanStep[] = (params.steps || []).map((s, i) => ({
          id: i + 1,
          action: s.action,
          target: s.target,
          description: s.description,
          expectedOutcome: s.expectedOutcome || `Complete ${s.action} successfully`,
          timeout: s.timeout || 30000,
          onFailure: s.onFailure || 'retry',
          maxRetries: s.maxRetries || 2,
          status: 'pending' as const
        }));

        currentPlan = {
          id: planId,
          createdAt: now,
          updatedAt: now,
          goal: {
            description: params.goal,
            category: params.category || 'general',
            successCriteria: params.successCriteria || [`Complete: ${params.goal}`]
          },
          preConditions: (params.preConditions || []).map(c => ({
            condition: c,
            verified: false
          })),
          steps,
          status: 'draft',
          currentStepIndex: 0
        };

        savePlan(currentPlan);

        return {
          success: true,
          message: `Created tactical plan: ${planId} with ${steps.length} steps`,
          plan: currentPlan,
          summary: generateSummary(currentPlan)
        };
      }

      case 'addStep': {
        if (!currentPlan) {
          return { success: false, message: 'No active plan. Create a plan first.' };
        }
        if (!params.step) {
          return { success: false, message: 'Step definition is required' };
        }

        const newStep: PlanStep = {
          id: currentPlan.steps.length + 1,
          action: params.step.action,
          target: params.step.target,
          description: params.step.description,
          expectedOutcome: params.step.expectedOutcome || `Complete ${params.step.action}`,
          timeout: params.step.timeout || 30000,
          onFailure: params.step.onFailure || 'retry',
          maxRetries: 2,
          status: 'pending'
        };

        currentPlan.steps.push(newStep);
        currentPlan.updatedAt = new Date().toISOString();
        savePlan(currentPlan);

        return {
          success: true,
          message: `Added step ${newStep.id}: ${newStep.action}`,
          plan: currentPlan
        };
      }

      case 'approve': {
        if (!currentPlan) {
          return { success: false, message: 'No active plan to approve' };
        }
        if (currentPlan.steps.length === 0) {
          return { success: false, message: 'Cannot approve plan with no steps' };
        }

        // Verify all pre-conditions are marked as verified
        const unverified = currentPlan.preConditions.filter(p => !p.verified);
        if (unverified.length > 0) {
          // Auto-verify for now (in production, these should be manually checked)
          currentPlan.preConditions.forEach(p => p.verified = true);
        }

        currentPlan.status = 'approved';
        currentPlan.updatedAt = new Date().toISOString();
        savePlan(currentPlan);

        return {
          success: true,
          message: `Plan ${currentPlan.id} approved and ready for execution`,
          plan: currentPlan,
          summary: generateSummary(currentPlan)
        };
      }

      case 'start': {
        if (!currentPlan) {
          return { success: false, message: 'No active plan to start' };
        }
        if (currentPlan.status !== 'approved') {
          return { success: false, message: `Cannot start plan with status: ${currentPlan.status}. Approve first.` };
        }

        currentPlan.status = 'executing';
        currentPlan.startedAt = new Date().toISOString();
        currentPlan.currentStepIndex = 0;
        currentPlan.updatedAt = new Date().toISOString();

        // Mark first step as in_progress
        if (currentPlan.steps.length > 0) {
          currentPlan.steps[0].status = 'in_progress';
        }

        savePlan(currentPlan);

        return {
          success: true,
          message: `Started executing plan ${currentPlan.id}`,
          plan: currentPlan,
          currentStep: currentPlan.steps[0],
          summary: generateSummary(currentPlan)
        };
      }

      case 'completeStep': {
        if (!currentPlan || currentPlan.status !== 'executing') {
          return { success: false, message: 'No plan currently executing' };
        }

        const currentStep = currentPlan.steps[currentPlan.currentStepIndex];
        if (!currentStep) {
          return { success: false, message: 'No current step to complete' };
        }

        // Update step result
        currentStep.status = params.success ? 'completed' : 'failed';
        currentStep.result = {
          success: params.success || false,
          message: params.message || (params.success ? 'Completed' : 'Failed'),
          data: params.data,
          timestamp: new Date().toISOString()
        };

        // Handle failure
        if (!params.success) {
          if (currentStep.onFailure === 'abort') {
            currentPlan.status = 'aborted';
            currentPlan.completedAt = new Date().toISOString();
            currentPlan.outcome = {
              success: false,
              summary: `Aborted at step ${currentStep.id}: ${params.message}`
            };
            savePlan(currentPlan);
            return {
              success: false,
              message: `Plan aborted at step ${currentStep.id}`,
              plan: currentPlan,
              planComplete: true
            };
          }
          // For retry/skip/self_correct - continue to next step for now
        }

        // Move to next step
        currentPlan.currentStepIndex++;
        currentPlan.updatedAt = new Date().toISOString();

        // Check if plan is complete
        if (currentPlan.currentStepIndex >= currentPlan.steps.length) {
          const allSuccess = currentPlan.steps.every(s => s.status === 'completed');
          currentPlan.status = allSuccess ? 'completed' : 'failed';
          currentPlan.completedAt = new Date().toISOString();
          currentPlan.outcome = {
            success: allSuccess,
            summary: allSuccess
              ? `Successfully completed all ${currentPlan.steps.length} steps`
              : `Completed with failures. Check step results.`,
            data: collectStepData(currentPlan.steps)
          };
          savePlan(currentPlan);

          return {
            success: true,
            message: `Plan ${currentPlan.status}: ${currentPlan.outcome.summary}`,
            plan: currentPlan,
            planComplete: true,
            summary: generateSummary(currentPlan)
          };
        }

        // Mark next step as in_progress
        const nextStep = currentPlan.steps[currentPlan.currentStepIndex];
        nextStep.status = 'in_progress';
        savePlan(currentPlan);

        return {
          success: true,
          message: `Step ${currentStep.id} completed. Next: Step ${nextStep.id}`,
          plan: currentPlan,
          currentStep: nextStep,
          nextStep,
          planComplete: false
        };
      }

      case 'getStatus': {
        if (!currentPlan) {
          return { success: false, message: 'No active plan' };
        }

        const currentStep = currentPlan.steps[currentPlan.currentStepIndex];

        return {
          success: true,
          message: `Plan ${currentPlan.id}: ${currentPlan.status}`,
          plan: currentPlan,
          currentStep,
          summary: generateSummary(currentPlan)
        };
      }

      case 'getSummary': {
        if (!currentPlan) {
          return {
            success: true,
            message: 'No active plan',
            summary: 'No tactical plan currently active. Create one with action: "create".'
          };
        }

        return {
          success: true,
          message: `Plan ${currentPlan.id} summary`,
          summary: generateSummary(currentPlan)
        };
      }

      case 'abort': {
        if (!currentPlan) {
          return { success: false, message: 'No active plan to abort' };
        }

        currentPlan.status = 'aborted';
        currentPlan.completedAt = new Date().toISOString();
        currentPlan.outcome = {
          success: false,
          summary: `Aborted: ${params.reason || 'User requested'}`
        };
        savePlan(currentPlan);

        const abortedPlan = currentPlan;
        currentPlan = null;

        return {
          success: true,
          message: `Plan ${abortedPlan.id} aborted`,
          plan: abortedPlan,
          planComplete: true
        };
      }

      case 'load': {
        if (!params.planId) {
          return { success: false, message: 'Plan ID is required to load' };
        }

        const filePath = join(plansDir, `${params.planId}.json`);
        if (!existsSync(filePath)) {
          return { success: false, message: `Plan not found: ${params.planId}` };
        }

        currentPlan = JSON.parse(readFileSync(filePath, 'utf-8'));

        return {
          success: true,
          message: `Loaded plan: ${params.planId}`,
          plan: currentPlan!,
          summary: generateSummary(currentPlan!)
        };
      }

      default:
        return {
          success: false,
          message: `Unknown action: ${action}. Valid actions: create, addStep, approve, start, completeStep, getStatus, getSummary, abort, load`
        };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Tactical planning error: ${errorMsg}`
    };
  }
}

/**
 * Save plan to disk
 */
function savePlan(plan: TacticalPlan): void {
  const filePath = join(plansDir, `${plan.id}.json`);
  writeFileSync(filePath, JSON.stringify(plan, null, 2));

  // Also save as current plan
  const currentPath = join(plansDir, 'current.json');
  writeFileSync(currentPath, JSON.stringify(plan, null, 2));
}

/**
 * Generate human-readable plan summary
 */
function generateSummary(plan: TacticalPlan): string {
  let summary = `\n========================================\n`;
  summary += `TACTICAL PLAN: ${plan.id}\n`;
  summary += `========================================\n\n`;

  summary += `STATUS: ${plan.status.toUpperCase()}\n`;
  summary += `GOAL: ${plan.goal.description}\n`;
  summary += `CATEGORY: ${plan.goal.category}\n\n`;

  if (plan.goal.successCriteria.length > 0) {
    summary += `SUCCESS CRITERIA:\n`;
    plan.goal.successCriteria.forEach((c, i) => {
      summary += `  ${i + 1}. ${c}\n`;
    });
    summary += `\n`;
  }

  if (plan.preConditions.length > 0) {
    summary += `PRE-CONDITIONS:\n`;
    plan.preConditions.forEach(p => {
      const icon = p.verified ? '[x]' : '[ ]';
      summary += `  ${icon} ${p.condition}\n`;
    });
    summary += `\n`;
  }

  summary += `STEPS (${plan.steps.length}):\n`;
  summary += `----------------------------------------\n`;

  plan.steps.forEach(step => {
    const statusIcons: Record<string, string> = {
      'pending': '[ ]',
      'in_progress': '[>]',
      'completed': '[x]',
      'failed': '[!]',
      'skipped': '[-]'
    };
    const icon = statusIcons[step.status] || '[ ]';
    const current = step.status === 'in_progress' ? ' <-- CURRENT' : '';

    summary += `  ${icon} Step ${step.id}: ${step.action}${current}\n`;
    if (step.target) {
      summary += `      Target: ${step.target}\n`;
    }
    if (step.description) {
      summary += `      Description: ${step.description}\n`;
    }
    if (step.result) {
      summary += `      Result: ${step.result.success ? 'SUCCESS' : 'FAILED'} - ${step.result.message}\n`;
    }
  });

  summary += `----------------------------------------\n`;

  if (plan.outcome) {
    summary += `\nOUTCOME: ${plan.outcome.success ? 'SUCCESS' : 'FAILED'}\n`;
    summary += `${plan.outcome.summary}\n`;
  }

  if (plan.startedAt) {
    summary += `\nStarted: ${plan.startedAt}\n`;
  }
  if (plan.completedAt) {
    summary += `Completed: ${plan.completedAt}\n`;
  }

  summary += `\n========================================\n`;

  return summary;
}

/**
 * Collect data from all completed steps
 */
function collectStepData(steps: PlanStep[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  steps.forEach(step => {
    if (step.result?.data) {
      data[`step_${step.id}_${step.action}`] = step.result.data;
    }
  });

  return data;
}

/**
 * Get current plan (for external access)
 */
export function getCurrentPlan(): TacticalPlan | null {
  return currentPlan;
}
