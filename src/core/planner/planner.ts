/**
 * Sequential Thinking - Planner
 *
 * Creates and manages multi-step execution plans.
 * Integrates with Memory Engine to learn from past experiences.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Plan, PlanStep, RelevantLesson, PLAN_TEMPLATES } from './schema.js';
import { getKnowledgeBase } from '../memory/knowledge-base.js';
import { Lesson } from '../memory/schema.js';

export class Planner {
  private plansDir: string;
  private currentPlan: Plan | null = null;

  constructor(plansDir?: string) {
    this.plansDir = plansDir || join(process.cwd(), 'plans');
    if (!existsSync(this.plansDir)) {
      mkdirSync(this.plansDir, { recursive: true });
    }
  }

  /**
   * Create a new plan for a complex task
   * Automatically consults memory for relevant lessons
   */
  createPlan(
    taskType: string,
    description: string,
    successCriteria: string[],
    category?: string
  ): Plan {
    const kb = getKnowledgeBase();

    // Step 1: Consult memory for relevant lessons
    const relevantLessons = this.consultMemory(taskType, description, category);

    // Step 2: Extract warnings from failed lessons
    const warnings = relevantLessons
      .filter(l => !kb.queryLessons({ task_type: taskType, failure_only: true, limit: 5 })
        .find(fl => fl.id === l.id)?.success)
      .map(l => l.summary);

    // Step 3: Find matching template or create generic plan
    const template = PLAN_TEMPLATES.find(t => t.task_types.includes(taskType));

    // Step 4: Build the plan
    const plan: Plan = {
      id: this.generatePlanId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      task: {
        type: taskType,
        description,
        success_criteria: successCriteria,
        category
      },

      memory_context: {
        lessons_consulted: relevantLessons,
        warnings: this.getWarningsFromMemory(taskType, category)
      },

      steps: template
        ? template.default_steps.map((s, i) => ({
            ...s,
            id: i + 1,
            status: 'pending' as const
          }))
        : this.generateGenericSteps(taskType, description),

      status: 'planning',

      safety: {
        risk_level: this.assessRiskLevel(taskType, description),
        requires_approval: false
      }
    };

    // Check if approval is needed based on risk
    if (plan.safety.risk_level === 'high' || plan.safety.risk_level === 'critical') {
      plan.safety.requires_approval = true;
    }

    this.currentPlan = plan;
    this.savePlan(plan);

    return plan;
  }

  /**
   * Consult the Memory Engine for relevant lessons
   */
  private consultMemory(taskType: string, description: string, category?: string): RelevantLesson[] {
    const kb = getKnowledgeBase();
    const lessons: RelevantLesson[] = [];

    // Query by task type
    const byType = kb.queryLessons({ task_type: taskType, limit: 3 });
    byType.forEach(l => {
      if (!lessons.find(existing => existing.id === l.id)) {
        lessons.push({
          id: l.id!,
          summary: l.lesson_summary,
          solution: l.solution,
          relevance: `Same task type: ${taskType}`
        });
      }
    });

    // Query by category
    if (category) {
      const byCategory = kb.queryLessons({ category, success_only: true, limit: 2 });
      byCategory.forEach(l => {
        if (!lessons.find(existing => existing.id === l.id)) {
          lessons.push({
            id: l.id!,
            summary: l.lesson_summary,
            solution: l.solution,
            relevance: `Same category: ${category}`
          });
        }
      });
    }

    // Full-text search for relevant content
    const bySearch = kb.searchLessons(description, 3);
    bySearch.forEach(l => {
      if (!lessons.find(existing => existing.id === l.id)) {
        lessons.push({
          id: l.id!,
          summary: l.lesson_summary,
          solution: l.solution,
          relevance: 'Content similarity'
        });
      }
    });

    return lessons.slice(0, 5); // Limit to top 5
  }

  /**
   * Get warnings from past failures
   */
  private getWarningsFromMemory(taskType: string, category?: string): string[] {
    const kb = getKnowledgeBase();
    const warnings: string[] = [];

    // Get failed lessons for this task type
    const failures = kb.queryLessons({
      task_type: taskType,
      failure_only: true,
      limit: 3
    });

    failures.forEach(f => {
      if (f.error_message) {
        warnings.push(`Avoid: ${f.error_message.substring(0, 100)}`);
      }
      if (f.root_cause) {
        warnings.push(`Watch out: ${f.root_cause}`);
      }
    });

    // Get failed lessons for this category
    if (category) {
      const catFailures = kb.queryLessons({
        category,
        failure_only: true,
        limit: 2
      });

      catFailures.forEach(f => {
        const warning = f.lesson_summary;
        if (!warnings.includes(warning)) {
          warnings.push(warning);
        }
      });
    }

    return warnings.slice(0, 5);
  }

  /**
   * Generate generic steps when no template matches
   */
  private generateGenericSteps(taskType: string, description: string): PlanStep[] {
    return [
      { id: 1, action: 'prepare', description: 'Query memory for relevant context', status: 'pending' },
      { id: 2, action: 'analyze', description: `Analyze requirements: ${description}`, status: 'pending' },
      { id: 3, action: 'execute', description: 'Execute the main task', status: 'pending' },
      { id: 4, action: 'verify', description: 'Verify success criteria met', status: 'pending' },
      { id: 5, action: 'save_lesson', description: 'Save outcome to memory', status: 'pending' }
    ];
  }

  /**
   * Assess risk level of a task
   */
  private assessRiskLevel(taskType: string, description: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerDesc = description.toLowerCase();

    // Critical - financial, credentials, system-wide changes
    if (
      lowerDesc.includes('payment') ||
      lowerDesc.includes('financial') ||
      lowerDesc.includes('bank') ||
      lowerDesc.includes('password') ||
      lowerDesc.includes('credential') ||
      lowerDesc.includes('registry') ||
      lowerDesc.includes('system32')
    ) {
      return 'critical';
    }

    // High - installations, deletions, external services
    if (
      taskType === 'installation' ||
      lowerDesc.includes('delete') ||
      lowerDesc.includes('remove') ||
      lowerDesc.includes('api') ||
      lowerDesc.includes('production')
    ) {
      return 'high';
    }

    // Medium - web automation, file changes
    if (
      taskType === 'automation' ||
      taskType === 'web_task' ||
      lowerDesc.includes('browser') ||
      lowerDesc.includes('navigate')
    ) {
      return 'medium';
    }

    // Low - research, reading, analysis
    return 'low';
  }

  /**
   * Add a custom step to the current plan
   */
  addStep(action: string, description: string, dependencies?: number[]): PlanStep | null {
    if (!this.currentPlan) return null;

    const newStep: PlanStep = {
      id: this.currentPlan.steps.length + 1,
      action,
      description,
      dependencies,
      status: 'pending'
    };

    this.currentPlan.steps.push(newStep);
    this.currentPlan.updated_at = new Date().toISOString();
    this.savePlan(this.currentPlan);

    return newStep;
  }

  /**
   * Mark plan as ready for execution
   */
  finalizePlan(): Plan | null {
    if (!this.currentPlan) return null;

    this.currentPlan.status = 'ready';
    this.currentPlan.updated_at = new Date().toISOString();
    this.savePlan(this.currentPlan);

    return this.currentPlan;
  }

  /**
   * Start executing a step
   */
  startStep(stepId: number): PlanStep | null {
    if (!this.currentPlan) return null;

    const step = this.currentPlan.steps.find(s => s.id === stepId);
    if (!step) return null;

    // Check dependencies are completed
    if (step.dependencies) {
      const unmetDeps = step.dependencies.filter(depId => {
        const dep = this.currentPlan!.steps.find(s => s.id === depId);
        return dep && dep.status !== 'completed';
      });

      if (unmetDeps.length > 0) {
        return null; // Dependencies not met
      }
    }

    step.status = 'in_progress';
    step.started_at = new Date().toISOString();
    this.currentPlan.current_step = stepId;
    this.currentPlan.status = 'executing';
    this.currentPlan.updated_at = new Date().toISOString();
    this.savePlan(this.currentPlan);

    return step;
  }

  /**
   * Complete a step
   */
  completeStep(stepId: number, result: string): PlanStep | null {
    if (!this.currentPlan) return null;

    const step = this.currentPlan.steps.find(s => s.id === stepId);
    if (!step) return null;

    step.status = 'completed';
    step.result = result;
    step.completed_at = new Date().toISOString();
    this.currentPlan.updated_at = new Date().toISOString();

    // Check if all steps are completed
    const allCompleted = this.currentPlan.steps.every(
      s => s.status === 'completed' || s.status === 'skipped'
    );

    if (allCompleted) {
      this.currentPlan.status = 'completed';
    }

    this.savePlan(this.currentPlan);
    return step;
  }

  /**
   * Fail a step
   */
  failStep(stepId: number, error: string): PlanStep | null {
    if (!this.currentPlan) return null;

    const step = this.currentPlan.steps.find(s => s.id === stepId);
    if (!step) return null;

    step.status = 'failed';
    step.error = error;
    step.completed_at = new Date().toISOString();
    this.currentPlan.status = 'failed';
    this.currentPlan.updated_at = new Date().toISOString();
    this.savePlan(this.currentPlan);

    // Auto-save lesson about the failure
    const kb = getKnowledgeBase();
    kb.saveLesson({
      task_type: this.currentPlan.task.type,
      task_description: `Step ${stepId}: ${step.action} - ${step.description}`,
      success: false,
      error_message: error,
      lesson_summary: `Plan step "${step.action}" failed: ${error.substring(0, 100)}`,
      category: this.currentPlan.task.category
    });

    return step;
  }

  /**
   * Complete the entire plan
   */
  completePlan(success: boolean, summary: string): Plan | null {
    if (!this.currentPlan) return null;

    this.currentPlan.status = success ? 'completed' : 'failed';
    this.currentPlan.outcome = { success, summary };
    this.currentPlan.updated_at = new Date().toISOString();

    // Save lesson about the overall outcome
    const kb = getKnowledgeBase();
    const lessonId = kb.saveLesson({
      task_type: this.currentPlan.task.type,
      task_description: this.currentPlan.task.description,
      success,
      lesson_summary: summary,
      category: this.currentPlan.task.category,
      solution: success ? `Completed via plan ${this.currentPlan.id}` : undefined
    });

    this.currentPlan.outcome.lesson_saved = lessonId;
    this.savePlan(this.currentPlan);

    return this.currentPlan;
  }

  /**
   * Get the current plan
   */
  getCurrentPlan(): Plan | null {
    return this.currentPlan;
  }

  /**
   * Load a plan by ID
   */
  loadPlan(planId: string): Plan | null {
    const planPath = join(this.plansDir, `${planId}.json`);
    if (!existsSync(planPath)) return null;

    const content = readFileSync(planPath, 'utf-8');
    this.currentPlan = JSON.parse(content);
    return this.currentPlan;
  }

  /**
   * Save the plan to disk
   */
  private savePlan(plan: Plan): void {
    const planPath = join(this.plansDir, `${plan.id}.json`);
    writeFileSync(planPath, JSON.stringify(plan, null, 2));

    // Also save as current plan.json for easy access
    const currentPath = join(this.plansDir, 'plan.json');
    writeFileSync(currentPath, JSON.stringify(plan, null, 2));
  }

  /**
   * Generate a unique plan ID
   */
  private generatePlanId(): string {
    return `PLAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  /**
   * Get plan summary for display
   */
  getPlanSummary(): string {
    if (!this.currentPlan) return 'No active plan';

    const p = this.currentPlan;
    const completedSteps = p.steps.filter(s => s.status === 'completed').length;
    const totalSteps = p.steps.length;

    let summary = `📋 Plan: ${p.id}\n`;
    summary += `Status: ${p.status.toUpperCase()}\n`;
    summary += `Task: ${p.task.description}\n`;
    summary += `Progress: ${completedSteps}/${totalSteps} steps\n`;
    summary += `Risk: ${p.safety.risk_level.toUpperCase()}\n`;

    if (p.memory_context.lessons_consulted.length > 0) {
      summary += `\n📚 Relevant Lessons:\n`;
      p.memory_context.lessons_consulted.forEach((l, i) => {
        summary += `  ${i + 1}. ${l.summary}\n`;
      });
    }

    if (p.memory_context.warnings.length > 0) {
      summary += `\n⚠️ Warnings:\n`;
      p.memory_context.warnings.forEach((w, i) => {
        summary += `  ${i + 1}. ${w}\n`;
      });
    }

    summary += `\n📝 Steps:\n`;
    p.steps.forEach(s => {
      const statusEmoji = {
        pending: '⬜',
        in_progress: '🔄',
        completed: '✅',
        failed: '❌',
        skipped: '⏭️'
      }[s.status];
      summary += `  ${statusEmoji} ${s.id}. ${s.action}: ${s.description}\n`;
    });

    return summary;
  }
}

// Singleton instance
let plannerInstance: Planner | null = null;

export function getPlanner(): Planner {
  if (!plannerInstance) {
    plannerInstance = new Planner();
  }
  return plannerInstance;
}
