/**
 * Tactical Planning Module
 *
 * Enforces structured planning before any browser action:
 * 1. Goal definition
 * 2. Step-by-step atomic actions
 * 3. Pre-conditions verification
 * 4. Safety checks against guard_policy
 * 5. Verification criteria for each step
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getBrowserGuard } from '../web-operator/browser-guard.js';
import { getKnowledgeBase } from '../../core/memory/knowledge-base.js';

export interface TacticalStep {
  id: number;
  action: string;                    // e.g., 'navigate', 'click', 'type', 'screenshot', 'verify'
  target?: string;                   // URL, selector, or description
  parameters?: Record<string, unknown>;
  expectedOutcome: string;           // What should happen
  verificationMethod: {
    type: 'url_match' | 'element_visible' | 'text_present' | 'screenshot_compare' | 'custom';
    criteria: string;                // The specific check
  };
  timeout?: number;                  // Max wait time in ms
  onFailure: 'abort' | 'retry' | 'skip' | 'self_correct';
  maxRetries?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: {
    success: boolean;
    message: string;
    screenshot?: string;
    timestamp: string;
  };
}

export interface TacticalPlan {
  id: string;
  created_at: string;
  updated_at: string;

  // Goal definition
  goal: {
    description: string;
    successCriteria: string[];
    category: string;              // e.g., 'data_extraction', 'form_submission', 'navigation'
  };

  // Pre-conditions
  preConditions: Array<{
    condition: string;
    required: boolean;
    verified: boolean;
  }>;

  // Safety assessment
  safetyCheck: {
    passed: boolean;
    checkedAt: string;
    urlsToVisit: Array<{
      url: string;
      classification: string;
      allowed: boolean;
    }>;
    actionsReview: Array<{
      action: string;
      risk: 'low' | 'medium' | 'high';
      approved: boolean;
    }>;
    violations: string[];
  };

  // Steps
  steps: TacticalStep[];

  // Execution state
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'aborted';
  currentStep: number;
  startedAt?: string;
  completedAt?: string;

  // Results
  outcome?: {
    success: boolean;
    summary: string;
    data?: Record<string, unknown>;
    lessonId?: number;
  };
}

export class TacticalPlanner {
  private plansDir: string;
  private currentPlan: TacticalPlan | null = null;
  private browserGuard = getBrowserGuard();
  private kb = getKnowledgeBase();

  constructor(plansDir?: string) {
    this.plansDir = plansDir || join(process.cwd(), 'plans');
    if (!existsSync(this.plansDir)) {
      mkdirSync(this.plansDir, { recursive: true });
    }
  }

  /**
   * Create a new tactical plan (required before any browser action)
   */
  createPlan(
    goalDescription: string,
    successCriteria: string[],
    category: string,
    preConditions: string[] = []
  ): TacticalPlan {
    // Consult memory for similar past tasks
    const pastLessons = this.kb.searchLessons(goalDescription, 5);
    const relevantLessons = pastLessons.filter(l =>
      l.category === category || l.task_type === category
    );

    const plan: TacticalPlan = {
      id: this.generatePlanId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      goal: {
        description: goalDescription,
        successCriteria,
        category
      },

      preConditions: preConditions.map(c => ({
        condition: c,
        required: true,
        verified: false
      })),

      safetyCheck: {
        passed: false,
        checkedAt: '',
        urlsToVisit: [],
        actionsReview: [],
        violations: []
      },

      steps: [],
      status: 'draft',
      currentStep: 0
    };

    // Add warnings from past failures
    if (relevantLessons.length > 0) {
      const failedLessons = relevantLessons.filter(l => !l.success);
      if (failedLessons.length > 0) {
        plan.preConditions.push({
          condition: `WARNING: ${failedLessons.length} past failures in similar tasks. Review lessons: ${failedLessons.map(l => l.id).join(', ')}`,
          required: false,
          verified: true
        });
      }
    }

    this.currentPlan = plan;
    return plan;
  }

  /**
   * Add a step to the current plan
   */
  addStep(
    action: string,
    target: string | undefined,
    expectedOutcome: string,
    verificationMethod: TacticalStep['verificationMethod'],
    options: {
      parameters?: Record<string, unknown>;
      timeout?: number;
      onFailure?: TacticalStep['onFailure'];
      maxRetries?: number;
    } = {}
  ): TacticalStep | null {
    if (!this.currentPlan) return null;

    const step: TacticalStep = {
      id: this.currentPlan.steps.length + 1,
      action,
      target,
      parameters: options.parameters,
      expectedOutcome,
      verificationMethod,
      timeout: options.timeout || 30000,
      onFailure: options.onFailure || 'retry',
      maxRetries: options.maxRetries || 2,
      status: 'pending'
    };

    this.currentPlan.steps.push(step);
    this.currentPlan.updated_at = new Date().toISOString();

    return step;
  }

  /**
   * Run safety check on the plan
   */
  runSafetyCheck(): { passed: boolean; violations: string[] } {
    if (!this.currentPlan) {
      return { passed: false, violations: ['No active plan'] };
    }

    const violations: string[] = [];
    const urlsToVisit: TacticalPlan['safetyCheck']['urlsToVisit'] = [];
    const actionsReview: TacticalPlan['safetyCheck']['actionsReview'] = [];

    for (const step of this.currentPlan.steps) {
      // Check URLs
      if (step.action === 'navigate' && step.target) {
        const classification = this.browserGuard.classifyUrl(step.target);
        urlsToVisit.push({
          url: step.target,
          classification: classification.level,
          allowed: classification.level !== 'BLOCKED'
        });

        if (classification.level === 'BLOCKED') {
          violations.push(`Blocked URL: ${step.target} - ${classification.reason}`);
        } else if (classification.level === 'RESTRICTED') {
          violations.push(`Restricted URL requires approval: ${step.target}`);
        }
      }

      // Check action risk level
      let risk: 'low' | 'medium' | 'high' = 'low';

      if (['click', 'type', 'submit'].includes(step.action)) {
        risk = 'medium';
      }
      if (step.action === 'execute_script' || step.parameters?.script) {
        risk = 'high';
        violations.push(`High-risk action: ${step.action} with script execution`);
      }

      actionsReview.push({
        action: `${step.action} ${step.target || ''}`.trim(),
        risk,
        approved: risk !== 'high'
      });
    }

    const passed = violations.length === 0;

    this.currentPlan.safetyCheck = {
      passed,
      checkedAt: new Date().toISOString(),
      urlsToVisit,
      actionsReview,
      violations
    };

    this.currentPlan.updated_at = new Date().toISOString();

    return { passed, violations };
  }

  /**
   * Verify pre-conditions
   */
  verifyPreCondition(index: number, verified: boolean): boolean {
    if (!this.currentPlan || index >= this.currentPlan.preConditions.length) {
      return false;
    }

    this.currentPlan.preConditions[index].verified = verified;
    this.currentPlan.updated_at = new Date().toISOString();

    return true;
  }

  /**
   * Approve and finalize the plan for execution
   */
  approvePlan(): { approved: boolean; reason?: string } {
    if (!this.currentPlan) {
      return { approved: false, reason: 'No active plan' };
    }

    // Check safety
    if (!this.currentPlan.safetyCheck.passed) {
      const result = this.runSafetyCheck();
      if (!result.passed) {
        return { approved: false, reason: `Safety violations: ${result.violations.join(', ')}` };
      }
    }

    // Check required pre-conditions
    const unverifiedRequired = this.currentPlan.preConditions.filter(
      p => p.required && !p.verified
    );
    if (unverifiedRequired.length > 0) {
      return {
        approved: false,
        reason: `Unverified pre-conditions: ${unverifiedRequired.map(p => p.condition).join(', ')}`
      };
    }

    // Check we have steps
    if (this.currentPlan.steps.length === 0) {
      return { approved: false, reason: 'Plan has no steps' };
    }

    this.currentPlan.status = 'approved';
    this.currentPlan.updated_at = new Date().toISOString();
    this.savePlan();

    return { approved: true };
  }

  /**
   * Start plan execution
   */
  startExecution(): boolean {
    if (!this.currentPlan || this.currentPlan.status !== 'approved') {
      return false;
    }

    this.currentPlan.status = 'executing';
    this.currentPlan.startedAt = new Date().toISOString();
    this.currentPlan.currentStep = 1;
    this.currentPlan.updated_at = new Date().toISOString();
    this.savePlan();

    return true;
  }

  /**
   * Get the current step to execute
   */
  getCurrentStep(): TacticalStep | null {
    if (!this.currentPlan || this.currentPlan.status !== 'executing') {
      return null;
    }

    const step = this.currentPlan.steps.find(s => s.id === this.currentPlan!.currentStep);
    return step || null;
  }

  /**
   * Mark current step as in progress
   */
  startStep(): TacticalStep | null {
    const step = this.getCurrentStep();
    if (!step) return null;

    step.status = 'in_progress';
    this.currentPlan!.updated_at = new Date().toISOString();
    this.savePlan();

    return step;
  }

  /**
   * Complete a step with result
   */
  completeStep(
    success: boolean,
    message: string,
    screenshot?: string
  ): { nextStep: TacticalStep | null; planComplete: boolean } {
    if (!this.currentPlan) {
      return { nextStep: null, planComplete: false };
    }

    const step = this.getCurrentStep();
    if (!step) {
      return { nextStep: null, planComplete: false };
    }

    step.status = success ? 'completed' : 'failed';
    step.result = {
      success,
      message,
      screenshot,
      timestamp: new Date().toISOString()
    };

    if (!success && step.onFailure === 'abort') {
      this.currentPlan.status = 'aborted';
      this.savePlan();
      return { nextStep: null, planComplete: true };
    }

    // Move to next step
    this.currentPlan.currentStep++;
    this.currentPlan.updated_at = new Date().toISOString();

    // Check if plan is complete
    if (this.currentPlan.currentStep > this.currentPlan.steps.length) {
      const allSuccess = this.currentPlan.steps.every(s => s.status === 'completed');
      this.currentPlan.status = allSuccess ? 'completed' : 'failed';
      this.currentPlan.completedAt = new Date().toISOString();

      // Save lesson
      const lessonId = this.kb.saveLesson({
        task_type: this.currentPlan.goal.category,
        task_description: this.currentPlan.goal.description,
        success: allSuccess,
        solution: allSuccess ? this.currentPlan.steps.map(s => `${s.action}: ${s.target}`).join(' -> ') : undefined,
        lesson_summary: `Tactical plan ${this.currentPlan.id}: ${allSuccess ? 'succeeded' : 'failed'}`,
        category: 'tactical_execution'
      });

      this.currentPlan.outcome = {
        success: allSuccess,
        summary: allSuccess
          ? `Completed ${this.currentPlan.steps.length} steps successfully`
          : `Failed at step ${step.id}: ${message}`,
        lessonId
      };

      this.savePlan();
      return { nextStep: null, planComplete: true };
    }

    this.savePlan();
    return { nextStep: this.getCurrentStep(), planComplete: false };
  }

  /**
   * Get plan summary
   */
  getPlanSummary(): string {
    if (!this.currentPlan) {
      return 'No active tactical plan. Create one before browser actions.';
    }

    const p = this.currentPlan;
    let summary = `📋 Tactical Plan: ${p.id}\n`;
    summary += `Status: ${p.status.toUpperCase()}\n\n`;
    summary += `🎯 Goal: ${p.goal.description}\n`;
    summary += `Category: ${p.goal.category}\n\n`;

    if (p.preConditions.length > 0) {
      summary += `📝 Pre-Conditions:\n`;
      for (const pre of p.preConditions) {
        const icon = pre.verified ? '✅' : (pre.required ? '❌' : '⚠️');
        summary += `   ${icon} ${pre.condition}\n`;
      }
      summary += '\n';
    }

    summary += `🔒 Safety Check: ${p.safetyCheck.passed ? 'PASSED' : 'PENDING'}\n`;
    if (p.safetyCheck.violations.length > 0) {
      summary += `   Violations: ${p.safetyCheck.violations.join(', ')}\n`;
    }
    summary += '\n';

    summary += `📝 Steps (${p.steps.length}):\n`;
    for (const step of p.steps) {
      const statusIcon = {
        pending: '⬜',
        in_progress: '🔄',
        completed: '✅',
        failed: '❌',
        skipped: '⏭️'
      }[step.status];
      const current = step.id === p.currentStep ? ' ← CURRENT' : '';
      summary += `   ${statusIcon} ${step.id}. ${step.action}: ${step.target || step.expectedOutcome}${current}\n`;
      summary += `      Verify: ${step.verificationMethod.type} - ${step.verificationMethod.criteria}\n`;
    }

    if (p.outcome) {
      summary += `\n📊 Outcome: ${p.outcome.success ? 'SUCCESS' : 'FAILED'}\n`;
      summary += `   ${p.outcome.summary}\n`;
    }

    return summary;
  }

  /**
   * Get current plan
   */
  getCurrentPlan(): TacticalPlan | null {
    return this.currentPlan;
  }

  /**
   * Check if a plan exists and is approved
   */
  haApprovedPlan(): boolean {
    return this.currentPlan !== null &&
      ['approved', 'executing'].includes(this.currentPlan.status);
  }

  /**
   * Save plan to disk
   */
  private savePlan(): void {
    if (!this.currentPlan) return;

    const filepath = join(this.plansDir, `tactical_plan_${this.currentPlan.id}.json`);
    writeFileSync(filepath, JSON.stringify(this.currentPlan, null, 2));

    // Also save as current plan
    const currentPath = join(this.plansDir, 'tactical_plan.json');
    writeFileSync(currentPath, JSON.stringify(this.currentPlan, null, 2));
  }

  /**
   * Load a plan
   */
  loadPlan(planId: string): TacticalPlan | null {
    const filepath = join(this.plansDir, `tactical_plan_${planId}.json`);
    if (!existsSync(filepath)) return null;

    try {
      const content = readFileSync(filepath, 'utf-8');
      this.currentPlan = JSON.parse(content) as TacticalPlan;
      return this.currentPlan;
    } catch {
      return null;
    }
  }

  /**
   * Abort current plan
   */
  abortPlan(reason: string): void {
    if (!this.currentPlan) return;

    this.currentPlan.status = 'aborted';
    this.currentPlan.completedAt = new Date().toISOString();
    this.currentPlan.outcome = {
      success: false,
      summary: `Plan aborted: ${reason}`
    };

    this.savePlan();
    this.currentPlan = null;
  }

  private generatePlanId(): string {
    return `TP-${Date.now().toString(36).toUpperCase()}`;
  }
}

// Singleton instance
let tacticalPlannerInstance: TacticalPlanner | null = null;

export function getTacticalPlanner(): TacticalPlanner {
  if (!tacticalPlannerInstance) {
    tacticalPlannerInstance = new TacticalPlanner();
  }
  return tacticalPlannerInstance;
}
