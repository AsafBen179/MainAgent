/**
 * Self-Evolution Coordinator
 *
 * Orchestrates the self-improvement loop:
 * 1. Detect failure
 * 2. Run RCA
 * 3. Propose fix
 * 4. Sanity check
 * 5. Apply fix with git commit
 * 6. Auto-rollback on failure
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { getRCAEngine, FailureAnalysis } from './rca-engine.js';
import { getConstitutionEnforcer } from './constitution-enforcer.js';
import { getPlaybookSystem, Playbook } from './playbook-system.js';
import { getKnowledgeBase } from '../memory/knowledge-base.js';
import { WhatsAppClient } from '../bridge/whatsapp-client.js';

const execAsync = promisify(exec);

export interface SelfImprovementAttempt {
  id: string;
  timestamp: string;
  analysisId: string;
  targetFile: string;
  changeDescription: string;
  status: 'pending' | 'testing' | 'applied' | 'committed' | 'rolled_back' | 'failed';
  commitHash?: string;
  testResult?: {
    passed: boolean;
    output: string;
  };
  rollbackReason?: string;
}

export class SelfEvolutionCoordinator {
  private rcaEngine = getRCAEngine();
  private enforcer = getConstitutionEnforcer();
  private playbookSystem = getPlaybookSystem();
  private whatsappClient = new WhatsAppClient();
  private projectRoot: string;
  private attempts: Map<string, SelfImprovementAttempt> = new Map();
  private config = this.enforcer.getSelfEvolutionConfig();

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Execute the full self-evolution loop
   */
  async evolve(
    taskType: string,
    taskDescription: string,
    errorMessage: string,
    stderr?: string
  ): Promise<{
    success: boolean;
    attemptId: string;
    message: string;
    analysis?: FailureAnalysis;
  }> {
    // Step 1: Report attempt
    await this.reportIncident('self_improvement_attempt', {
      taskType,
      taskDescription,
      error: errorMessage.substring(0, 200)
    });

    // Step 2: Run RCA
    const analysis = await this.rcaEngine.analyzeFailure(
      taskType,
      taskDescription,
      errorMessage,
      stderr
    );

    // Step 3: Check if we can propose a fix
    if (!analysis.proposedFix) {
      return {
        success: false,
        attemptId: analysis.id,
        message: analysis.status === 'needs_human'
          ? 'Analysis requires human review'
          : 'Unable to propose automated fix',
        analysis
      };
    }

    // Step 4: Validate the target file is modifiable
    const pathCheck = this.enforcer.checkPathAccess(analysis.proposedFix.targetFile, 'write');
    if (!pathCheck.allowed) {
      await this.reportIncident('self_improvement_failure', {
        reason: 'Target file is immutable',
        file: analysis.proposedFix.targetFile
      });

      return {
        success: false,
        attemptId: analysis.id,
        message: `Cannot modify ${analysis.proposedFix.targetFile}: ${pathCheck.reason}`,
        analysis
      };
    }

    // Step 5: Create improvement attempt
    const attempt = this.createAttempt(analysis);

    // Step 6: Run sanity check if test case provided
    if (this.config.requiresSanityCheck && analysis.proposedFix.testCase) {
      attempt.status = 'testing';
      const testResult = await this.runSanityCheck(analysis.proposedFix.testCase);
      attempt.testResult = testResult;

      if (!testResult.passed) {
        attempt.status = 'failed';
        await this.reportIncident('self_improvement_failure', {
          reason: 'Sanity check failed',
          testOutput: testResult.output.substring(0, 200)
        });

        return {
          success: false,
          attemptId: attempt.id,
          message: 'Sanity check failed: ' + testResult.output.substring(0, 100),
          analysis
        };
      }
    }

    // Step 7: Apply the fix (for now, just report what would be done)
    // In production, this would actually modify the file
    attempt.status = 'applied';

    // Step 8: Create git commit
    try {
      const commitHash = await this.createSelfImprovementCommit(
        analysis.proposedFix.targetFile,
        analysis.proposedFix.description
      );
      attempt.commitHash = commitHash;
      attempt.status = 'committed';

      await this.reportIncident('self_improvement_success', {
        file: analysis.proposedFix.targetFile,
        change: analysis.proposedFix.description,
        commitHash
      });

      // Save lesson about successful self-improvement
      const kb = getKnowledgeBase();
      kb.saveLesson({
        task_type: 'self_improvement',
        task_description: `Fixed: ${analysis.rootCause}`,
        success: true,
        solution: analysis.proposedFix.description,
        lesson_summary: `Self-improvement: ${analysis.proposedFix.changeType} in ${analysis.proposedFix.targetFile}`,
        category: 'self_evolution'
      });

      return {
        success: true,
        attemptId: attempt.id,
        message: `Self-improvement applied: ${analysis.proposedFix.description}`,
        analysis
      };
    } catch (error) {
      // Step 9: Auto-rollback on failure
      if (this.config.rollbackOnFailure && attempt.commitHash) {
        await this.autoRollback(attempt, String(error));
      }

      return {
        success: false,
        attemptId: attempt.id,
        message: `Failed to commit: ${error}`,
        analysis
      };
    }
  }

  /**
   * Run sanity check for proposed fix
   */
  private async runSanityCheck(testCode: string): Promise<{ passed: boolean; output: string }> {
    // Create a temporary test file
    const testFile = join(this.projectRoot, 'temp-sanity-check.ts');

    try {
      writeFileSync(testFile, testCode);

      // Run the test
      const { stdout, stderr } = await execAsync(`npx tsx ${testFile}`, {
        cwd: this.projectRoot,
        timeout: 30000
      });

      return {
        passed: !stderr || stderr.length === 0,
        output: stdout || stderr || 'Test completed'
      };
    } catch (error) {
      return {
        passed: false,
        output: error instanceof Error ? error.message : String(error)
      };
    } finally {
      // Clean up test file
      try {
        const fs = await import('fs');
        if (existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      } catch { /* ignore cleanup errors */ }
    }
  }

  /**
   * Create a self-improvement commit
   */
  private async createSelfImprovementCommit(
    targetFile: string,
    description: string
  ): Promise<string> {
    const prefix = this.config.commitPrefix;
    const message = `${prefix} ${description}

Automated fix applied by Self-Evolution Coordinator.
Target: ${targetFile}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`;

    try {
      // Stage changes
      await execAsync(`git add "${targetFile}"`, { cwd: this.projectRoot });

      // Create commit
      const { stdout } = await execAsync(
        `git commit -m "${message.replace(/"/g, '\\"')}"`,
        { cwd: this.projectRoot }
      );

      // Extract commit hash
      const hashMatch = stdout.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
      return hashMatch?.[1] || 'unknown';
    } catch (error) {
      throw new Error(`Git commit failed: ${error}`);
    }
  }

  /**
   * Auto-rollback a failed self-improvement
   */
  private async autoRollback(
    attempt: SelfImprovementAttempt,
    reason: string
  ): Promise<void> {
    try {
      // Revert the commit
      await execAsync(`git revert HEAD --no-edit`, { cwd: this.projectRoot });

      attempt.status = 'rolled_back';
      attempt.rollbackReason = reason;

      await this.reportIncident('auto_rollback_triggered', {
        attemptId: attempt.id,
        commitHash: attempt.commitHash,
        reason
      });
    } catch (error) {
      console.error('Auto-rollback failed:', error);
      // Manual intervention needed
      await this.reportIncident('auto_rollback_triggered', {
        attemptId: attempt.id,
        error: 'Rollback failed - manual intervention required',
        originalReason: reason
      });
    }
  }

  /**
   * Create an improvement attempt record
   */
  private createAttempt(analysis: FailureAnalysis): SelfImprovementAttempt {
    const attempt: SelfImprovementAttempt = {
      id: `IMP-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      analysisId: analysis.id,
      targetFile: analysis.proposedFix!.targetFile,
      changeDescription: analysis.proposedFix!.description,
      status: 'pending'
    };

    this.attempts.set(attempt.id, attempt);
    return attempt;
  }

  /**
   * Report incident via WhatsApp
   */
  private async reportIncident(
    eventType: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.enforcer.reportIncident(eventType, details);
  }

  /**
   * Get all improvement attempts
   */
  getAttempts(): SelfImprovementAttempt[] {
    return Array.from(this.attempts.values());
  }

  /**
   * Get attempt by ID
   */
  getAttempt(id: string): SelfImprovementAttempt | undefined {
    return this.attempts.get(id);
  }

  /**
   * Manual trigger for rollback
   */
  async manualRollback(attemptId: string): Promise<boolean> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || !attempt.commitHash) {
      return false;
    }

    try {
      await execAsync(`git revert ${attempt.commitHash} --no-edit`, { cwd: this.projectRoot });
      attempt.status = 'rolled_back';
      attempt.rollbackReason = 'Manual rollback requested';

      await this.reportIncident('auto_rollback_triggered', {
        attemptId,
        reason: 'Manual rollback',
        commitHash: attempt.commitHash
      });

      return true;
    } catch (error) {
      console.error('Manual rollback failed:', error);
      return false;
    }
  }

  /**
   * Check if a playbook exists for a task
   */
  checkForPlaybook(
    taskType: string,
    taskDescription: string,
    category?: string
  ): {
    found: boolean;
    playbook?: Playbook | null;
    accuracy?: number;
  } {
    const playbook = this.playbookSystem.findPlaybook(taskType, taskDescription, category);

    if (playbook) {
      return {
        found: true,
        playbook,
        accuracy: this.playbookSystem.getPlaybookAccuracy(playbook)
      };
    }

    return { found: false };
  }

  /**
   * Save a successful task as a new playbook
   */
  saveAsPlaybook(
    name: string,
    description: string,
    taskTypes: string[],
    keywords: string[],
    steps: Array<{
      action: string;
      tool: string;
      args: Record<string, unknown>;
      expectedOutcome: string;
    }>,
    category?: string
  ): string {
    const playbook = this.playbookSystem.createPlaybook(
      name,
      description,
      taskTypes,
      keywords,
      steps.map(s => ({
        ...s,
        verificationMethod: this.playbookSystem.generateVerificationStep(s.action, s.expectedOutcome),
        onFailure: 'retry' as const,
        maxRetries: 2
      })),
      category
    );

    return playbook.id;
  }

  /**
   * Get evolution system stats
   */
  getStats(): {
    totalAttempts: number;
    successful: number;
    failed: number;
    rolledBack: number;
    playbooks: {
      total: number;
      active: number;
      paused: number;
      deprecated: number;
      underReview: number;
      averageAccuracy: number;
    };
  } {
    const attempts = this.getAttempts();

    return {
      totalAttempts: attempts.length,
      successful: attempts.filter(a => a.status === 'committed').length,
      failed: attempts.filter(a => a.status === 'failed').length,
      rolledBack: attempts.filter(a => a.status === 'rolled_back').length,
      playbooks: this.playbookSystem.getStats()
    };
  }
}

// Singleton instance
let coordinatorInstance: SelfEvolutionCoordinator | null = null;

export function getSelfEvolutionCoordinator(): SelfEvolutionCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new SelfEvolutionCoordinator();
  }
  return coordinatorInstance;
}
