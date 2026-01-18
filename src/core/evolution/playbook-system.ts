/**
 * Playbook System
 *
 * Saves and loads successful task workflows for reuse.
 * - Dynamic playbooks from successful executions
 * - Cross-channel verification steps
 * - Accuracy tracking per playbook
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getKnowledgeBase } from '../memory/knowledge-base.js';
import { WhatsAppClient } from '../bridge/whatsapp-client.js';

export interface PlaybookStep {
  id: number;
  action: string;
  tool: string;
  args: Record<string, unknown>;
  expectedOutcome: string;
  verificationMethod?: {
    type: 'file_exists' | 'command_output' | 'browser_element' | 'api_response';
    check: string;
  };
  onFailure?: 'abort' | 'retry' | 'skip' | 'human_review';
  maxRetries?: number;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  version: number;
  created_at: string;
  updated_at: string;

  // Matching criteria
  taskTypes: string[];
  keywords: string[];
  category?: string;

  // The workflow
  steps: PlaybookStep[];

  // Accuracy tracking
  metrics: {
    timesUsed: number;
    successes: number;
    failures: number;
    lastUsed?: string;
    averageDuration?: number;
  };

  // Cross-channel verification
  verification: {
    required: boolean;
    method?: string;
    threshold?: number;
  };

  // Status
  status: 'active' | 'paused' | 'deprecated' | 'under_review';
  pauseReason?: string;
}

export interface PlaybookExecutionResult {
  playbookId: string;
  success: boolean;
  stepsCompleted: number;
  totalSteps: number;
  duration: number;
  failedStep?: number;
  error?: string;
  verificationPassed?: boolean;
}

export class PlaybookSystem {
  private playbooksDir: string;
  private playbooks: Map<string, Playbook> = new Map();
  private whatsappClient: WhatsAppClient;
  private accuracyThreshold: number;

  constructor(playbooksDir?: string, accuracyThreshold: number = 0.10) {
    this.playbooksDir = playbooksDir || join(process.cwd(), 'playbooks');
    this.accuracyThreshold = accuracyThreshold;
    this.whatsappClient = new WhatsAppClient();

    if (!existsSync(this.playbooksDir)) {
      mkdirSync(this.playbooksDir, { recursive: true });
    }

    this.loadPlaybooks();
  }

  /**
   * Load all playbooks from disk
   */
  private loadPlaybooks(): void {
    const files = readdirSync(this.playbooksDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = readFileSync(join(this.playbooksDir, file), 'utf-8');
        const playbook = JSON.parse(content) as Playbook;
        this.playbooks.set(playbook.id, playbook);
      } catch (error) {
        console.error(`Failed to load playbook ${file}:`, error);
      }
    }
  }

  /**
   * Find a matching playbook for a task
   */
  findPlaybook(
    taskType: string,
    taskDescription: string,
    category?: string
  ): Playbook | null {
    let bestMatch: Playbook | null = null;
    let bestScore = 0;

    for (const playbook of this.playbooks.values()) {
      // Skip paused or deprecated playbooks
      if (playbook.status !== 'active') continue;

      let score = 0;

      // Task type match
      if (playbook.taskTypes.includes(taskType)) {
        score += 3;
      }

      // Category match
      if (category && playbook.category === category) {
        score += 2;
      }

      // Keyword match
      const descLower = taskDescription.toLowerCase();
      for (const keyword of playbook.keywords) {
        if (descLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      // Prefer playbooks with better accuracy
      const accuracy = this.getPlaybookAccuracy(playbook);
      if (accuracy > 0.9) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = playbook;
      }
    }

    return bestScore >= 3 ? bestMatch : null;
  }

  /**
   * Create a new playbook from a successful task execution
   */
  createPlaybook(
    name: string,
    description: string,
    taskTypes: string[],
    keywords: string[],
    steps: Omit<PlaybookStep, 'id'>[],
    category?: string
  ): Playbook {
    const id = this.generatePlaybookId();

    const playbook: Playbook = {
      id,
      name,
      description,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      taskTypes,
      keywords,
      category,
      steps: steps.map((s, i) => ({ ...s, id: i + 1 })),
      metrics: {
        timesUsed: 0,
        successes: 0,
        failures: 0
      },
      verification: {
        required: true
      },
      status: 'active'
    };

    this.playbooks.set(id, playbook);
    this.savePlaybook(playbook);

    // Log to memory
    const kb = getKnowledgeBase();
    kb.saveLesson({
      task_type: 'playbook_created',
      task_description: `Created playbook: ${name}`,
      success: true,
      lesson_summary: `New playbook "${name}" with ${steps.length} steps for ${taskTypes.join(', ')}`,
      category: 'playbook'
    });

    return playbook;
  }

  /**
   * Record playbook execution result
   */
  async recordExecution(result: PlaybookExecutionResult): Promise<void> {
    const playbook = this.playbooks.get(result.playbookId);
    if (!playbook) return;

    // Update metrics
    playbook.metrics.timesUsed++;
    if (result.success) {
      playbook.metrics.successes++;
    } else {
      playbook.metrics.failures++;
    }
    playbook.metrics.lastUsed = new Date().toISOString();

    // Update average duration
    if (playbook.metrics.averageDuration) {
      playbook.metrics.averageDuration =
        (playbook.metrics.averageDuration + result.duration) / 2;
    } else {
      playbook.metrics.averageDuration = result.duration;
    }

    playbook.updated_at = new Date().toISOString();

    // Check accuracy threshold
    const accuracy = this.getPlaybookAccuracy(playbook);
    const failureRate = 1 - accuracy;

    if (failureRate > this.accuracyThreshold && playbook.metrics.timesUsed >= 5) {
      // Pause the playbook and alert
      playbook.status = 'under_review';
      playbook.pauseReason = `Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${(this.accuracyThreshold * 100).toFixed(1)}%`;

      await this.sendAccuracyAlert(playbook, failureRate);
    }

    this.savePlaybook(playbook);

    // Log to memory
    const kb = getKnowledgeBase();
    kb.logTaskExecution({
      task_type: 'playbook_execution',
      command: `playbook: ${playbook.name}`,
      status: result.success ? 'completed' : 'failed',
      output: result.success
        ? `Completed ${result.stepsCompleted}/${result.totalSteps} steps`
        : `Failed at step ${result.failedStep}: ${result.error}`,
      duration_ms: result.duration
    });
  }

  /**
   * Get playbook accuracy (success rate)
   */
  getPlaybookAccuracy(playbook: Playbook): number {
    if (playbook.metrics.timesUsed === 0) return 1.0;
    return playbook.metrics.successes / playbook.metrics.timesUsed;
  }

  /**
   * Send accuracy threshold alert via WhatsApp
   */
  private async sendAccuracyAlert(playbook: Playbook, failureRate: number): Promise<void> {
    const message = `📉 ACCURACY THRESHOLD VIOLATION\n\n` +
      `Playbook: ${playbook.name}\n` +
      `ID: ${playbook.id}\n` +
      `Failure Rate: ${(failureRate * 100).toFixed(1)}%\n` +
      `Threshold: ${(this.accuracyThreshold * 100).toFixed(1)}%\n` +
      `Uses: ${playbook.metrics.timesUsed}\n` +
      `Failures: ${playbook.metrics.failures}\n\n` +
      `Status: PAUSED - Awaiting human review\n` +
      `Reply with:\n` +
      `!playbook resume ${playbook.id} - to resume\n` +
      `!playbook deprecate ${playbook.id} - to deprecate`;

    try {
      await this.whatsappClient.logCommand(
        `Playbook ${playbook.name}`,
        'RED',
        message
      );
    } catch (error) {
      console.error('Failed to send accuracy alert:', error);
    }
  }

  /**
   * Resume a paused playbook
   */
  resumePlaybook(playbookId: string): boolean {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) return false;

    playbook.status = 'active';
    playbook.pauseReason = undefined;
    // Reset failure count but keep success count
    playbook.metrics.failures = 0;
    playbook.updated_at = new Date().toISOString();

    this.savePlaybook(playbook);
    return true;
  }

  /**
   * Deprecate a playbook
   */
  deprecatePlaybook(playbookId: string, reason: string): boolean {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) return false;

    playbook.status = 'deprecated';
    playbook.pauseReason = reason;
    playbook.updated_at = new Date().toISOString();

    this.savePlaybook(playbook);
    return true;
  }

  /**
   * Update a playbook step
   */
  updateStep(
    playbookId: string,
    stepId: number,
    updates: Partial<PlaybookStep>
  ): boolean {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) return false;

    const step = playbook.steps.find(s => s.id === stepId);
    if (!step) return false;

    Object.assign(step, updates);
    playbook.version++;
    playbook.updated_at = new Date().toISOString();

    this.savePlaybook(playbook);
    return true;
  }

  /**
   * Get all playbooks
   */
  getAllPlaybooks(): Playbook[] {
    return Array.from(this.playbooks.values());
  }

  /**
   * Get active playbooks
   */
  getActivePlaybooks(): Playbook[] {
    return this.getAllPlaybooks().filter(p => p.status === 'active');
  }

  /**
   * Get playbook by ID
   */
  getPlaybook(id: string): Playbook | undefined {
    return this.playbooks.get(id);
  }

  /**
   * Get playbooks needing review
   */
  getPlaybooksNeedingReview(): Playbook[] {
    return this.getAllPlaybooks().filter(p => p.status === 'under_review');
  }

  /**
   * Generate cross-channel verification step
   */
  generateVerificationStep(
    action: string,
    expectedOutcome: string
  ): PlaybookStep['verificationMethod'] {
    // Determine verification type based on action
    if (action.includes('file') || action.includes('write') || action.includes('create')) {
      return {
        type: 'file_exists',
        check: 'Verify file exists using file system tool'
      };
    }

    if (action.includes('browser') || action.includes('navigate') || action.includes('click')) {
      return {
        type: 'browser_element',
        check: 'Take screenshot and verify expected element visible'
      };
    }

    if (action.includes('api') || action.includes('request') || action.includes('fetch')) {
      return {
        type: 'api_response',
        check: 'Verify API response status and content'
      };
    }

    return {
      type: 'command_output',
      check: 'Verify command output matches expected pattern'
    };
  }

  /**
   * Save playbook to disk
   */
  private savePlaybook(playbook: Playbook): void {
    const filepath = join(this.playbooksDir, `${playbook.id}.json`);
    writeFileSync(filepath, JSON.stringify(playbook, null, 2));
  }

  private generatePlaybookId(): string {
    return `PB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  /**
   * Get system stats
   */
  getStats(): {
    total: number;
    active: number;
    paused: number;
    deprecated: number;
    underReview: number;
    averageAccuracy: number;
  } {
    const all = this.getAllPlaybooks();
    const accuracies = all
      .filter(p => p.metrics.timesUsed > 0)
      .map(p => this.getPlaybookAccuracy(p));

    return {
      total: all.length,
      active: all.filter(p => p.status === 'active').length,
      paused: all.filter(p => p.status === 'paused').length,
      deprecated: all.filter(p => p.status === 'deprecated').length,
      underReview: all.filter(p => p.status === 'under_review').length,
      averageAccuracy: accuracies.length > 0
        ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
        : 1.0
    };
  }
}

// Singleton instance
let playbookSystemInstance: PlaybookSystem | null = null;

export function getPlaybookSystem(): PlaybookSystem {
  if (!playbookSystemInstance) {
    playbookSystemInstance = new PlaybookSystem();
  }
  return playbookSystemInstance;
}
