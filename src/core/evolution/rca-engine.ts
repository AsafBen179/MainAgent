/**
 * Root Cause Analysis (RCA) Engine
 *
 * Analyzes task failures to:
 * 1. Identify root cause (environment, logic, context)
 * 2. Propose targeted fixes
 * 3. Generate fix code for mutable layers
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getKnowledgeBase } from '../memory/knowledge-base.js';
import { getConstitutionEnforcer } from './constitution-enforcer.js';

export type FailureCategory =
  | 'environment_change'      // Website UI update, API change
  | 'logic_error'            // Bug in tool code
  | 'insufficient_context'   // Missing information
  | 'timeout'                // Operation took too long
  | 'permission_denied'      // Access blocked
  | 'network_error'          // Connection issues
  | 'selector_outdated'      // Playwright selector no longer valid
  | 'dependency_issue'       // Package/module problem
  | 'unknown';

export interface FailureAnalysis {
  id: string;
  timestamp: string;
  category: FailureCategory;
  confidence: number;           // 0-1, how confident the analysis is

  // Context
  taskType: string;
  taskDescription: string;
  errorMessage: string;
  stderr?: string;
  affectedFile?: string;
  affectedFunction?: string;

  // Analysis
  rootCause: string;
  evidence: string[];
  similarPastFailures: Array<{
    lessonId: number;
    summary: string;
    solution?: string;
  }>;

  // Proposed fix
  proposedFix?: {
    description: string;
    targetFile: string;
    changeType: 'update_selector' | 'fix_logic' | 'add_error_handling' | 'update_config' | 'other';
    codeChanges?: Array<{
      search: string;
      replace: string;
    }>;
    newCode?: string;
    testCase?: string;
  };

  // Status
  status: 'analyzed' | 'fix_proposed' | 'fix_applied' | 'fix_verified' | 'fix_failed' | 'needs_human';
}

export class RCAEngine {
  private analysisHistory: Map<string, FailureAnalysis> = new Map();
  private enforcer = getConstitutionEnforcer();

  /**
   * Analyze a failure and identify root cause
   */
  async analyzeFailure(
    taskType: string,
    taskDescription: string,
    errorMessage: string,
    stderr?: string,
    context?: Record<string, unknown>
  ): Promise<FailureAnalysis> {
    const id = this.generateAnalysisId();
    const kb = getKnowledgeBase();

    // Step 1: Categorize the failure
    const category = this.categorizeFailure(errorMessage, stderr);

    // Step 2: Find similar past failures
    const similarFailures = kb.findLessonsForError(errorMessage, 5)
      .map(lesson => ({
        lessonId: lesson.id!,
        summary: lesson.lesson_summary,
        solution: lesson.solution
      }));

    // Step 3: Extract evidence
    const evidence = this.extractEvidence(errorMessage, stderr);

    // Step 4: Determine root cause
    const rootCause = this.determineRootCause(category, errorMessage, stderr, evidence);

    // Step 5: Calculate confidence
    const confidence = this.calculateConfidence(category, evidence, similarFailures);

    const analysis: FailureAnalysis = {
      id,
      timestamp: new Date().toISOString(),
      category,
      confidence,
      taskType,
      taskDescription,
      errorMessage,
      stderr,
      rootCause,
      evidence,
      similarPastFailures: similarFailures,
      status: 'analyzed'
    };

    // Step 6: If we have similar past successes, propose a fix
    if (similarFailures.some(f => f.solution) || confidence > 0.7) {
      analysis.proposedFix = await this.proposeFix(analysis);
      if (analysis.proposedFix) {
        analysis.status = 'fix_proposed';
      }
    }

    // Step 7: If confidence is low, mark for human review
    if (confidence < 0.5 && !analysis.proposedFix) {
      analysis.status = 'needs_human';
    }

    this.analysisHistory.set(id, analysis);

    // Save lesson about this analysis
    kb.saveLesson({
      task_type: 'rca_analysis',
      task_description: `RCA for: ${taskDescription}`,
      success: analysis.status === 'fix_proposed',
      lesson_summary: `${category}: ${rootCause}`,
      error_message: errorMessage,
      category: 'self_evolution'
    });

    return analysis;
  }

  /**
   * Categorize the failure based on error patterns
   */
  private categorizeFailure(errorMessage: string, stderr?: string): FailureCategory {
    const combined = `${errorMessage} ${stderr || ''}`.toLowerCase();

    // Selector/UI patterns
    if (
      combined.includes('selector') ||
      combined.includes('element not found') ||
      combined.includes('timeout waiting for') ||
      combined.includes('locator.click') ||
      combined.includes('no element matches')
    ) {
      return 'selector_outdated';
    }

    // Network patterns
    if (
      combined.includes('econnrefused') ||
      combined.includes('enotfound') ||
      combined.includes('network') ||
      combined.includes('socket hang up') ||
      combined.includes('fetch failed')
    ) {
      return 'network_error';
    }

    // Timeout patterns
    if (
      combined.includes('timeout') ||
      combined.includes('timed out') ||
      combined.includes('deadline exceeded')
    ) {
      return 'timeout';
    }

    // Permission patterns
    if (
      combined.includes('permission denied') ||
      combined.includes('access denied') ||
      combined.includes('eacces') ||
      combined.includes('forbidden') ||
      combined.includes('unauthorized')
    ) {
      return 'permission_denied';
    }

    // Dependency patterns
    if (
      combined.includes('cannot find module') ||
      combined.includes('module not found') ||
      combined.includes('package') ||
      combined.includes('dependency')
    ) {
      return 'dependency_issue';
    }

    // Logic error patterns
    if (
      combined.includes('typeerror') ||
      combined.includes('referenceerror') ||
      combined.includes('syntaxerror') ||
      combined.includes('undefined') ||
      combined.includes('null')
    ) {
      return 'logic_error';
    }

    // Environment change patterns
    if (
      combined.includes('api') ||
      combined.includes('endpoint') ||
      combined.includes('schema') ||
      combined.includes('deprecated')
    ) {
      return 'environment_change';
    }

    // Context patterns
    if (
      combined.includes('missing') ||
      combined.includes('required') ||
      combined.includes('expected') ||
      combined.includes('invalid')
    ) {
      return 'insufficient_context';
    }

    return 'unknown';
  }

  /**
   * Extract evidence from error messages
   */
  private extractEvidence(errorMessage: string, stderr?: string): string[] {
    const evidence: string[] = [];
    const combined = `${errorMessage} ${stderr || ''}`;

    // Extract file paths
    const pathMatches = combined.match(/[A-Z]:\\[^\s:]+|\/[^\s:]+\.(ts|js|json|py)/gi);
    if (pathMatches) {
      evidence.push(...pathMatches.map(p => `File: ${p}`));
    }

    // Extract line numbers
    const lineMatches = combined.match(/line\s*[:=]?\s*\d+|:\d+:\d+/gi);
    if (lineMatches) {
      evidence.push(...lineMatches.map(l => `Location: ${l}`));
    }

    // Extract selectors
    const selectorMatches = combined.match(/selector[:\s]+['""]?([^'""]+)['""]?/gi);
    if (selectorMatches) {
      evidence.push(...selectorMatches.map(s => `Selector: ${s}`));
    }

    // Extract URLs
    const urlMatches = combined.match(/https?:\/\/[^\s]+/gi);
    if (urlMatches) {
      evidence.push(...urlMatches.map(u => `URL: ${u}`));
    }

    // Extract error codes
    const codeMatches = combined.match(/error\s*code[:\s]+\w+|E[A-Z]+/gi);
    if (codeMatches) {
      evidence.push(...codeMatches.map(c => `Code: ${c}`));
    }

    return [...new Set(evidence)]; // Dedupe
  }

  /**
   * Determine the root cause based on category and evidence
   */
  private determineRootCause(
    category: FailureCategory,
    errorMessage: string,
    stderr?: string,
    evidence?: string[]
  ): string {
    const causes: Record<FailureCategory, string> = {
      selector_outdated: 'The target element selector no longer matches the page structure. The website UI may have been updated.',
      logic_error: 'There is a bug in the tool code causing a runtime error.',
      insufficient_context: 'The task requires information that was not provided or available.',
      timeout: 'The operation took longer than the allowed time limit.',
      permission_denied: 'Access to the resource was blocked by security controls.',
      network_error: 'Failed to establish network connection to the target.',
      environment_change: 'The external service or API has changed its interface.',
      dependency_issue: 'A required package or module is missing or incompatible.',
      unknown: 'Unable to determine the specific root cause.'
    };

    let cause = causes[category];

    // Add specific details from evidence
    if (evidence && evidence.length > 0) {
      const fileEvidence = evidence.find(e => e.startsWith('File:'));
      if (fileEvidence) {
        cause += ` Affected file: ${fileEvidence.replace('File: ', '')}`;
      }
    }

    return cause;
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(
    category: FailureCategory,
    evidence: string[],
    similarFailures: Array<{ solution?: string }>
  ): number {
    let confidence = 0.5; // Base confidence

    // More evidence increases confidence
    confidence += Math.min(evidence.length * 0.05, 0.2);

    // Known category increases confidence
    if (category !== 'unknown') {
      confidence += 0.15;
    }

    // Past solutions increase confidence
    const solutionsFound = similarFailures.filter(f => f.solution).length;
    confidence += Math.min(solutionsFound * 0.1, 0.2);

    return Math.min(confidence, 1.0);
  }

  /**
   * Propose a fix for the failure
   */
  private async proposeFix(analysis: FailureAnalysis): Promise<FailureAnalysis['proposedFix'] | undefined> {
    // Only propose fixes for categories we can handle
    const fixableCategories: FailureCategory[] = [
      'selector_outdated',
      'logic_error',
      'dependency_issue',
      'timeout'
    ];

    if (!fixableCategories.includes(analysis.category)) {
      return undefined;
    }

    // Check if we have a past solution
    const pastSolution = analysis.similarPastFailures.find(f => f.solution);

    switch (analysis.category) {
      case 'selector_outdated':
        return this.proposeelectorFix(analysis, pastSolution);

      case 'logic_error':
        return this.proposeLogicFix(analysis, pastSolution);

      case 'timeout':
        return this.proposeTimeoutFix(analysis);

      case 'dependency_issue':
        return this.proposeDependencyFix(analysis);

      default:
        return undefined;
    }
  }

  private proposeelectorFix(
    analysis: FailureAnalysis,
    pastSolution?: { solution?: string }
  ): FailureAnalysis['proposedFix'] {
    // Extract the failing selector from evidence
    const selectorEvidence = analysis.evidence.find(e => e.startsWith('Selector:'));

    return {
      description: pastSolution?.solution ||
        'Update the Playwright selector to match the current page structure',
      targetFile: analysis.affectedFile || 'src/skills/web-operator/web-operator.ts',
      changeType: 'update_selector',
      testCase: `
// Test the updated selector
const page = await browser.newPage();
await page.goto('TARGET_URL');
await page.waitForSelector('NEW_SELECTOR', { timeout: 5000 });
console.log('Selector test passed');
`.trim()
    };
  }

  private proposeLogicFix(
    analysis: FailureAnalysis,
    pastSolution?: { solution?: string }
  ): FailureAnalysis['proposedFix'] {
    return {
      description: pastSolution?.solution || 'Fix the logic error with proper error handling',
      targetFile: analysis.affectedFile || 'src/skills/',
      changeType: 'fix_logic',
      testCase: `
// Test the fixed logic
try {
  // Call the fixed function
  const result = await fixedFunction();
  console.assert(result !== undefined, 'Result should not be undefined');
  console.log('Logic fix test passed');
} catch (error) {
  console.error('Logic fix test failed:', error);
}
`.trim()
    };
  }

  private proposeTimeoutFix(analysis: FailureAnalysis): FailureAnalysis['proposedFix'] {
    return {
      description: 'Increase timeout or add retry logic',
      targetFile: analysis.affectedFile || 'src/skills/',
      changeType: 'add_error_handling',
      codeChanges: [
        {
          search: 'timeout: 10000',
          replace: 'timeout: 30000'
        },
        {
          search: 'timeout: 30000',
          replace: 'timeout: 60000'
        }
      ],
      testCase: `
// Test with extended timeout
const startTime = Date.now();
await operation({ timeout: 60000 });
console.log('Completed in', Date.now() - startTime, 'ms');
`.trim()
    };
  }

  private proposeDependencyFix(analysis: FailureAnalysis): FailureAnalysis['proposedFix'] {
    // Extract module name from error
    const moduleMatch = analysis.errorMessage.match(/Cannot find module ['"]([^'"]+)['"]/);
    const moduleName = moduleMatch?.[1] || 'unknown-module';

    return {
      description: `Install missing dependency: ${moduleName}`,
      targetFile: 'package.json',
      changeType: 'other',
      testCase: `
// Test dependency resolution
const module = await import('${moduleName}');
console.assert(module, 'Module should be importable');
console.log('Dependency test passed');
`.trim()
    };
  }

  /**
   * Apply a proposed fix
   */
  async applyFix(analysisId: string): Promise<{
    success: boolean;
    message: string;
    commitHash?: string;
  }> {
    const analysis = this.analysisHistory.get(analysisId);
    if (!analysis || !analysis.proposedFix) {
      return { success: false, message: 'No fix available' };
    }

    // Validate target file is in mutable layer
    const pathCheck = this.enforcer.checkPathAccess(analysis.proposedFix.targetFile, 'write');
    if (!pathCheck.allowed) {
      analysis.status = 'needs_human';
      return { success: false, message: pathCheck.reason };
    }

    // For now, return the proposed fix details
    // Actual code modification would require additional safety checks
    analysis.status = 'fix_applied';

    return {
      success: true,
      message: `Fix proposed for ${analysis.proposedFix.targetFile}: ${analysis.proposedFix.description}`
    };
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): FailureAnalysis | undefined {
    return this.analysisHistory.get(id);
  }

  /**
   * Get all analyses
   */
  getAllAnalyses(): FailureAnalysis[] {
    return Array.from(this.analysisHistory.values());
  }

  private generateAnalysisId(): string {
    return `RCA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
}

// Singleton instance
let rcaEngineInstance: RCAEngine | null = null;

export function getRCAEngine(): RCAEngine {
  if (!rcaEngineInstance) {
    rcaEngineInstance = new RCAEngine();
  }
  return rcaEngineInstance;
}
