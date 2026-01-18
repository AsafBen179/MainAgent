/**
 * Self-Correction Module for Skills Server
 *
 * Provides:
 * 1. RCA analysis for Playwright/web automation failures
 * 2. Memory-based solution lookup
 * 3. Code fix proposal generation
 * 4. Guard validation before applying fixes
 * 5. WhatsApp reporting
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { getKnowledgeBase } from '../../core/memory/knowledge-base.js';
import { getConstitutionEnforcer } from '../../core/evolution/constitution-enforcer.js';
import { getRCAEngine, FailureAnalysis, FailureCategory } from '../../core/evolution/rca-engine.js';
import { getPlaybookSystem } from '../../core/evolution/playbook-system.js';
import { WhatsAppClient } from '../../core/bridge/whatsapp-client.js';

export interface PlaywrightFailure {
  action: string;           // e.g., 'click', 'navigate', 'type', 'waitForSelector'
  selector?: string;        // CSS/XPath selector if applicable
  url?: string;             // URL being accessed
  errorMessage: string;     // Raw error message
  stackTrace?: string;      // Stack trace if available
  screenshot?: string;      // Path to failure screenshot
  pageContent?: string;     // Page HTML at time of failure
}

export interface SelfCorrectionResult {
  success: boolean;
  analysis: FailureAnalysis;
  memorySolution?: {
    lessonId: number;
    solution: string;
    confidence: number;
  };
  proposedFix?: {
    targetFile: string;
    description: string;
    codeChanges: Array<{
      search: string;
      replace: string;
    }>;
    guardValidation: {
      passed: boolean;
      violations: string[];
    };
  };
  applied: boolean;
  message: string;
}

export interface SelectorUpdate {
  oldSelector: string;
  newSelector: string;
  confidence: number;
  source: 'memory' | 'heuristic' | 'page_analysis';
}

export class SelfCorrector {
  private kb = getKnowledgeBase();
  private enforcer = getConstitutionEnforcer();
  private rcaEngine = getRCAEngine();
  private playbookSystem = getPlaybookSystem();
  private whatsappClient = new WhatsAppClient();
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Analyze a Playwright failure and attempt self-correction
   */
  async analyzeAndCorrect(failure: PlaywrightFailure): Promise<SelfCorrectionResult> {
    // Step 1: Run RCA analysis
    const analysis = await this.rcaEngine.analyzeFailure(
      'web_automation',
      `${failure.action} ${failure.selector || failure.url || ''}`,
      failure.errorMessage,
      failure.stackTrace
    );

    // Step 2: Query Memory for past solutions
    const memorySolution = await this.findMemorySolution(failure, analysis);

    // Step 3: If no memory solution, try to generate a fix
    let proposedFix: SelfCorrectionResult['proposedFix'];

    if (memorySolution) {
      // Use the memory solution to create a fix
      proposedFix = await this.createFixFromMemory(failure, analysis, memorySolution);
    } else if (analysis.category === 'selector_outdated' && failure.pageContent) {
      // Try to find alternative selector from page content
      proposedFix = await this.createSelectorFix(failure, analysis);
    } else if (analysis.proposedFix) {
      // Use RCA's proposed fix
      proposedFix = await this.createFixFromRCA(analysis);
    }

    // Step 4: Validate fix with Guard
    if (proposedFix) {
      const validation = await this.validateWithGuard(proposedFix);
      proposedFix.guardValidation = validation;

      if (validation.passed) {
        // Step 5: Apply the fix
        const applied = await this.applyFix(proposedFix);

        if (applied) {
          // Step 6: Report success
          await this.reportSelfCorrection(failure, analysis, proposedFix, true);

          return {
            success: true,
            analysis,
            memorySolution,
            proposedFix,
            applied: true,
            message: `Self-correction applied: ${proposedFix.description}`
          };
        }
      } else {
        await this.reportSelfCorrection(failure, analysis, proposedFix, false);
      }
    }

    // Return analysis even if no fix could be applied
    return {
      success: false,
      analysis,
      memorySolution,
      proposedFix,
      applied: false,
      message: proposedFix?.guardValidation?.passed === false
        ? `Fix blocked by Guard: ${proposedFix.guardValidation.violations.join(', ')}`
        : 'No automated fix available - requires human review'
    };
  }

  /**
   * Analyze a Playwright failure (RCA only, no auto-fix)
   */
  async analyzeFailure(failure: PlaywrightFailure): Promise<{
    analysis: FailureAnalysis;
    memorySolutions: Array<{
      lessonId: number;
      summary: string;
      solution?: string;
      similarity: number;
    }>;
    suggestedActions: string[];
  }> {
    // Run RCA
    const analysis = await this.rcaEngine.analyzeFailure(
      'web_automation',
      `${failure.action} ${failure.selector || failure.url || ''}`,
      failure.errorMessage,
      failure.stackTrace
    );

    // Find relevant lessons
    const lessons = this.kb.findLessonsForError(failure.errorMessage, 5);
    const memorySolutions = lessons.map(lesson => ({
      lessonId: lesson.id!,
      summary: lesson.lesson_summary,
      solution: lesson.solution,
      similarity: this.calculateSimilarity(failure.errorMessage, lesson.error_pattern || '')
    }));

    // Generate suggested actions based on category
    const suggestedActions = this.getSuggestedActions(analysis.category, failure);

    return {
      analysis,
      memorySolutions,
      suggestedActions
    };
  }

  /**
   * Find a solution from Memory
   */
  private async findMemorySolution(
    failure: PlaywrightFailure,
    analysis: FailureAnalysis
  ): Promise<SelfCorrectionResult['memorySolution'] | undefined> {
    // Search for similar failures
    const lessons = this.kb.findLessonsForError(failure.errorMessage, 5);

    // Find lessons with solutions
    for (const lesson of lessons) {
      if (lesson.solution && lesson.success) {
        const similarity = this.calculateSimilarity(
          failure.errorMessage,
          lesson.error_pattern || ''
        );

        if (similarity > 0.5) {
          return {
            lessonId: lesson.id!,
            solution: lesson.solution,
            confidence: similarity
          };
        }
      }
    }

    // Also check playbooks for similar failures
    const playbook = this.playbookSystem.findPlaybook(
      'web_automation',
      `${failure.action} ${failure.selector || ''}`,
      'browser'
    );

    if (playbook && this.playbookSystem.getPlaybookAccuracy(playbook) > 0.8) {
      // Extract relevant step
      const step = playbook.steps.find(s =>
        s.action.toLowerCase().includes(failure.action.toLowerCase())
      );

      if (step) {
        return {
          lessonId: -1, // Playbook, not a lesson
          solution: `Use playbook step: ${JSON.stringify(step.args)}`,
          confidence: this.playbookSystem.getPlaybookAccuracy(playbook)
        };
      }
    }

    return undefined;
  }

  /**
   * Create a fix based on memory solution
   */
  private async createFixFromMemory(
    failure: PlaywrightFailure,
    analysis: FailureAnalysis,
    memorySolution: NonNullable<SelfCorrectionResult['memorySolution']>
  ): Promise<SelfCorrectionResult['proposedFix']> {
    // Determine target file
    const targetFile = this.findTargetFile(failure.action);

    // Parse the solution to extract code changes
    const codeChanges = this.parseSolutionToCodeChanges(memorySolution.solution, failure);

    return {
      targetFile,
      description: `Apply memory solution: ${memorySolution.solution.substring(0, 100)}`,
      codeChanges,
      guardValidation: { passed: false, violations: [] }
    };
  }

  /**
   * Create a selector fix by analyzing page content
   */
  private async createSelectorFix(
    failure: PlaywrightFailure,
    analysis: FailureAnalysis
  ): Promise<SelfCorrectionResult['proposedFix'] | undefined> {
    if (!failure.selector || !failure.pageContent) {
      return undefined;
    }

    // Try to find alternative selectors
    const alternatives = this.findAlternativeSelectors(failure.selector, failure.pageContent);

    if (alternatives.length === 0) {
      return undefined;
    }

    const bestAlternative = alternatives[0];
    const targetFile = this.findTargetFile(failure.action);

    // Read the target file to find the selector usage
    try {
      const fileContent = readFileSync(join(this.projectRoot, targetFile), 'utf-8');

      if (!fileContent.includes(failure.selector)) {
        return undefined;
      }

      return {
        targetFile,
        description: `Update selector from "${failure.selector}" to "${bestAlternative.newSelector}" (${bestAlternative.source})`,
        codeChanges: [{
          search: failure.selector,
          replace: bestAlternative.newSelector
        }],
        guardValidation: { passed: false, violations: [] }
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Create a fix from RCA analysis
   */
  private async createFixFromRCA(
    analysis: FailureAnalysis
  ): Promise<SelfCorrectionResult['proposedFix'] | undefined> {
    if (!analysis.proposedFix) {
      return undefined;
    }

    return {
      targetFile: analysis.proposedFix.targetFile,
      description: analysis.proposedFix.description,
      codeChanges: analysis.proposedFix.codeChanges || [],
      guardValidation: { passed: false, violations: [] }
    };
  }

  /**
   * Validate a proposed fix with the Guard
   */
  private async validateWithGuard(
    fix: NonNullable<SelfCorrectionResult['proposedFix']>
  ): Promise<{ passed: boolean; violations: string[] }> {
    // Check path access
    const pathCheck = this.enforcer.checkPathAccess(fix.targetFile, 'write');

    if (!pathCheck.allowed) {
      return {
        passed: false,
        violations: [`Path access denied: ${pathCheck.reason}`]
      };
    }

    // Check if target is in mutable layer
    if (pathCheck.isImmutable) {
      return {
        passed: false,
        violations: ['Target file is in immutable core - cannot modify']
      };
    }

    // Validate any new code for forbidden patterns
    const violations: string[] = [];

    for (const change of fix.codeChanges) {
      const validation = this.enforcer.validateCode(change.replace);

      if (!validation.valid) {
        violations.push(...validation.violations.map(v =>
          `Forbidden pattern "${v.pattern}": ${v.reason}`
        ));
      }
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Apply a validated fix
   */
  private async applyFix(
    fix: NonNullable<SelfCorrectionResult['proposedFix']>
  ): Promise<boolean> {
    const filePath = join(this.projectRoot, fix.targetFile);

    try {
      if (!existsSync(filePath)) {
        return false;
      }

      let content = readFileSync(filePath, 'utf-8');
      let modified = false;

      for (const change of fix.codeChanges) {
        if (content.includes(change.search)) {
          content = content.replace(change.search, change.replace);
          modified = true;
        }
      }

      if (modified) {
        writeFileSync(filePath, content);

        // Save lesson about the fix
        this.kb.saveLesson({
          task_type: 'self_correction',
          task_description: fix.description,
          success: true,
          solution: `Applied code changes to ${fix.targetFile}`,
          lesson_summary: `Self-correction: ${fix.description}`,
          category: 'self_evolution'
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to apply fix:', error);
      return false;
    }
  }

  /**
   * Report self-correction to Memory and WhatsApp
   */
  private async reportSelfCorrection(
    failure: PlaywrightFailure,
    analysis: FailureAnalysis,
    fix: NonNullable<SelfCorrectionResult['proposedFix']>,
    success: boolean
  ): Promise<void> {
    // Save to Memory
    this.kb.saveLesson({
      task_type: 'self_correction',
      task_description: `${failure.action}: ${failure.errorMessage.substring(0, 100)}`,
      success,
      solution: success ? fix.description : undefined,
      lesson_summary: success
        ? `Self-corrected ${failure.action} failure in ${fix.targetFile}`
        : `Failed to self-correct: ${fix.guardValidation.violations.join(', ')}`,
      error_pattern: failure.errorMessage.substring(0, 200),
      category: 'self_evolution'
    });

    // Report to WhatsApp
    const status = success ? 'SUCCESS' : 'BLOCKED';
    const color = success ? 'GREEN' : 'YELLOW';

    const message = success
      ? `Self-Correction Applied\n\n` +
        `Action: ${failure.action}\n` +
        `Error: ${failure.errorMessage.substring(0, 100)}\n` +
        `Fix: ${fix.description}\n` +
        `File: ${fix.targetFile}\n` +
        `Category: ${analysis.category}`
      : `Self-Correction Blocked\n\n` +
        `Action: ${failure.action}\n` +
        `Error: ${failure.errorMessage.substring(0, 100)}\n` +
        `Reason: ${fix.guardValidation.violations.join(', ')}\n` +
        `Requires: Human review`;

    try {
      await this.whatsappClient.logCommand(`Self-Correction ${status}`, color, message);
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
    }
  }

  /**
   * Find the target file for a given action type
   */
  private findTargetFile(action: string): string {
    // Map action types to likely source files
    const actionFileMap: Record<string, string> = {
      'click': 'src/skills/web-operator/web-operator.ts',
      'navigate': 'src/skills/web-operator/web-operator.ts',
      'type': 'src/skills/web-operator/web-operator.ts',
      'waitForSelector': 'src/skills/web-operator/web-operator.ts',
      'screenshot': 'src/skills/web-operator/web-operator.ts',
      'scrape': 'src/skills/scrapers/',
      'extract': 'src/skills/scrapers/'
    };

    return actionFileMap[action.toLowerCase()] || 'src/skills/';
  }

  /**
   * Parse a solution string into code changes
   */
  private parseSolutionToCodeChanges(
    solution: string,
    failure: PlaywrightFailure
  ): Array<{ search: string; replace: string }> {
    const changes: Array<{ search: string; replace: string }> = [];

    // Try to extract selector changes from solution
    const selectorMatch = solution.match(/selector[:\s]+['"]([^'"]+)['"]\s*(?:->|to|=>)\s*['"]([^'"]+)['"]/i);
    if (selectorMatch && failure.selector) {
      changes.push({
        search: failure.selector,
        replace: selectorMatch[2]
      });
    }

    // Try to extract timeout changes
    const timeoutMatch = solution.match(/timeout[:\s]+(\d+)/i);
    if (timeoutMatch) {
      changes.push({
        search: 'timeout: 10000',
        replace: `timeout: ${timeoutMatch[1]}`
      });
    }

    return changes;
  }

  /**
   * Find alternative selectors in page content
   */
  private findAlternativeSelectors(
    oldSelector: string,
    pageContent: string
  ): SelectorUpdate[] {
    const alternatives: SelectorUpdate[] = [];

    // Extract element info from old selector
    const idMatch = oldSelector.match(/#([a-zA-Z0-9_-]+)/);
    const classMatch = oldSelector.match(/\.([a-zA-Z0-9_-]+)/);
    const tagMatch = oldSelector.match(/^([a-zA-Z]+)/);

    // Look for similar elements in page content
    if (idMatch) {
      // Look for similar IDs
      const idPattern = new RegExp(`id=["']([^"']*${idMatch[1].substring(0, 5)}[^"']*)["']`, 'gi');
      const matches = pageContent.matchAll(idPattern);

      for (const match of matches) {
        if (match[1] !== idMatch[1]) {
          alternatives.push({
            oldSelector,
            newSelector: `#${match[1]}`,
            confidence: 0.7,
            source: 'page_analysis'
          });
        }
      }
    }

    if (classMatch) {
      // Look for similar classes
      const classPattern = new RegExp(`class=["'][^"']*([a-zA-Z0-9_-]*${classMatch[1].substring(0, 5)}[a-zA-Z0-9_-]*)[^"']*["']`, 'gi');
      const matches = pageContent.matchAll(classPattern);

      for (const match of matches) {
        if (match[1] !== classMatch[1]) {
          alternatives.push({
            oldSelector,
            newSelector: `.${match[1]}`,
            confidence: 0.6,
            source: 'page_analysis'
          });
        }
      }
    }

    // Look for data-testid attributes (common in modern apps)
    const testIdPattern = /data-testid=["']([^"']+)["']/gi;
    const testIdMatches = pageContent.matchAll(testIdPattern);

    for (const match of testIdMatches) {
      alternatives.push({
        oldSelector,
        newSelector: `[data-testid="${match[1]}"]`,
        confidence: 0.8,
        source: 'page_analysis'
      });
    }

    // Sort by confidence
    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Simple word overlap similarity
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    let overlap = 0;
    for (const word of words1) {
      if (words2.has(word)) overlap++;
    }

    return overlap / Math.max(words1.size, words2.size);
  }

  /**
   * Get suggested actions based on failure category
   */
  private getSuggestedActions(category: FailureCategory, failure: PlaywrightFailure): string[] {
    const actions: Record<FailureCategory, string[]> = {
      selector_outdated: [
        'Inspect the page to find the new selector',
        'Use browser DevTools to get the updated element path',
        'Try using data-testid or aria-label selectors',
        `Look for elements similar to: ${failure.selector}`
      ],
      timeout: [
        'Increase the timeout value',
        'Add explicit wait conditions',
        'Check if the page is loading slowly',
        'Verify network conditions'
      ],
      network_error: [
        'Check if the target URL is accessible',
        'Verify network connectivity',
        'Check for firewall/proxy issues',
        'Retry with exponential backoff'
      ],
      permission_denied: [
        'Check if login is required',
        'Verify credentials or cookies',
        'Check for rate limiting',
        'Review security headers'
      ],
      logic_error: [
        'Review the code logic',
        'Add null/undefined checks',
        'Verify input parameters',
        'Check for race conditions'
      ],
      environment_change: [
        'Update API endpoints',
        'Review changelog for breaking changes',
        'Update request headers/format',
        'Check API documentation'
      ],
      dependency_issue: [
        'Run npm install',
        'Check package versions',
        'Clear node_modules and reinstall',
        'Check for platform-specific issues'
      ],
      insufficient_context: [
        'Gather more information about the task',
        'Review error details',
        'Check logs for more context',
        'Ask for clarification'
      ],
      unknown: [
        'Review error details carefully',
        'Search for similar issues online',
        'Check logs for additional context',
        'Consider manual investigation'
      ]
    };

    return actions[category] || actions.unknown;
  }

  /**
   * Propose a code fix without applying it
   */
  async proposeFix(failure: PlaywrightFailure): Promise<{
    proposal: SelfCorrectionResult['proposedFix'] | null;
    validation: { passed: boolean; violations: string[] };
    canApply: boolean;
  }> {
    const result = await this.analyzeAndCorrect(failure);

    return {
      proposal: result.proposedFix || null,
      validation: result.proposedFix?.guardValidation || { passed: false, violations: ['No fix proposed'] },
      canApply: result.proposedFix?.guardValidation.passed || false
    };
  }
}

// Singleton instance
let selfCorrectorInstance: SelfCorrector | null = null;

export function getSelfCorrector(): SelfCorrector {
  if (!selfCorrectorInstance) {
    selfCorrectorInstance = new SelfCorrector();
  }
  return selfCorrectorInstance;
}
