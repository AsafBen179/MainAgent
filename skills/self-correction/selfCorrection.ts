/**
 * Self-Correction Skill - Autonomous DOM Failure Analysis and Selector Updates
 *
 * @description This skill provides autonomous self-correction capabilities for web automation failures.
 * When a webOperator task fails due to an outdated CSS selector, this skill can:
 * - Analyze the DOM to understand why the selector failed
 * - Search the page content for alternative selectors
 * - Propose updated selectors based on page structure
 * - Learn from past failures to prevent future issues
 *
 * Use this skill internally when a web automation task fails due to:
 * - Element not found errors
 * - Selector timeout errors
 * - Stale element references
 * - DOM structure changes
 *
 * @example
 * // Analyze a failed selector and get alternatives
 * const result = await selfCorrection({
 *   action: 'analyzeFailure',
 *   failedSelector: '.old-price-class',
 *   errorMessage: 'Element not found',
 *   pageContent: htmlContent
 * });
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// In-memory storage for learned selectors
const selectorMemory: Map<string, {
  domain: string;
  oldSelector: string;
  newSelector: string;
  confidence: number;
  learnedAt: Date;
  successCount: number;
}> = new Map();

// Failure pattern recognition
const failurePatterns: Map<string, {
  pattern: string;
  category: FailureCategory;
  solution: string;
}> = new Map([
  ['timeout.*selector', { pattern: 'timeout.*selector', category: 'selector_timeout', solution: 'Increase timeout or update selector' }],
  ['element.*not.*found', { pattern: 'element.*not.*found', category: 'selector_outdated', solution: 'Find alternative selector in page' }],
  ['stale.*element', { pattern: 'stale.*element', category: 'dynamic_content', solution: 'Re-query element before interaction' }],
  ['navigation.*failed', { pattern: 'navigation.*failed', category: 'network_error', solution: 'Retry with longer timeout' }],
  ['target.*closed', { pattern: 'target.*closed', category: 'browser_crashed', solution: 'Restart browser session' }]
]);

type FailureCategory = 'selector_outdated' | 'selector_timeout' | 'dynamic_content' | 'network_error' | 'browser_crashed' | 'permission_denied' | 'unknown';

interface SelectorAlternative {
  selector: string;
  type: 'id' | 'class' | 'data-attribute' | 'aria' | 'xpath' | 'text';
  confidence: number;
  reason: string;
}

interface FailureAnalysis {
  category: FailureCategory;
  rootCause: string;
  suggestedActions: string[];
  alternatives: SelectorAlternative[];
  canAutoFix: boolean;
}

/**
 * Self-Correction - Analyzes DOM failures and proposes selector fixes
 *
 * @description Autonomous error analysis and self-healing for web automation.
 * When a selector fails, this skill analyzes the page DOM to find working alternatives.
 * It learns from corrections to improve future reliability.
 *
 * @param {Object} params - The operation parameters
 * @param {string} params.action - The action: 'analyzeFailure' | 'findAlternatives' | 'learnCorrection' | 'getMemory' | 'applyFix'
 * @param {string} [params.failedSelector] - The CSS selector that failed
 * @param {string} [params.errorMessage] - The error message from the failure
 * @param {string} [params.pageContent] - The HTML content of the page (for analysis)
 * @param {string} [params.pageUrl] - The URL where the failure occurred
 * @param {string} [params.targetFile] - File path to apply fix to (for 'applyFix' action)
 * @param {string} [params.newSelector] - The corrected selector (for 'learnCorrection' action)
 * @param {string} [params.elementDescription] - Description of what element we're looking for
 *
 * @returns {Promise<Object>} Analysis result with alternatives and recommendations
 *
 * @example
 * // Analyze a failure and get alternatives
 * const analysis = await selfCorrection({
 *   action: 'analyzeFailure',
 *   failedSelector: '#price-value',
 *   errorMessage: 'Element not found within timeout',
 *   pageContent: document.documentElement.outerHTML
 * });
 *
 * @example
 * // Learn from a successful correction
 * await selfCorrection({
 *   action: 'learnCorrection',
 *   failedSelector: '.old-btn',
 *   newSelector: '[data-testid="submit-btn"]',
 *   pageUrl: 'https://example.com/form'
 * });
 */
export default async function selfCorrection(params: {
  action: 'analyzeFailure' | 'findAlternatives' | 'learnCorrection' | 'getMemory' | 'applyFix' | 'categorizeError';
  failedSelector?: string;
  errorMessage?: string;
  pageContent?: string;
  pageUrl?: string;
  targetFile?: string;
  newSelector?: string;
  elementDescription?: string;
}): Promise<{
  success: boolean;
  message: string;
  analysis?: FailureAnalysis;
  alternatives?: SelectorAlternative[];
  appliedFix?: boolean;
  memory?: Array<{
    oldSelector: string;
    newSelector: string;
    domain: string;
    confidence: number;
  }>;
}> {
  const { action } = params;

  try {
    switch (action) {
      case 'analyzeFailure': {
        if (!params.errorMessage) {
          return { success: false, message: 'Error message is required for analysis' };
        }

        // Categorize the failure
        const category = categorizeError(params.errorMessage);

        // Build root cause analysis
        const rootCause = determineRootCause(category, params.errorMessage, params.failedSelector);

        // Find alternative selectors if we have page content
        let alternatives: SelectorAlternative[] = [];
        if (params.pageContent && params.failedSelector) {
          alternatives = findAlternativeSelectors(params.failedSelector, params.pageContent, params.elementDescription);
        }

        // Check memory for past solutions
        if (params.failedSelector && params.pageUrl) {
          const memorized = checkMemory(params.failedSelector, params.pageUrl);
          if (memorized) {
            alternatives.unshift({
              selector: memorized.newSelector,
              type: 'data-attribute',
              confidence: memorized.confidence,
              reason: `Previously learned correction (used ${memorized.successCount} times)`
            });
          }
        }

        // Generate suggested actions
        const suggestedActions = getSuggestedActions(category, params.failedSelector, alternatives);

        const analysis: FailureAnalysis = {
          category,
          rootCause,
          suggestedActions,
          alternatives,
          canAutoFix: alternatives.length > 0 && alternatives[0].confidence > 0.7
        };

        return {
          success: true,
          message: `Analyzed failure: ${category}`,
          analysis,
          alternatives
        };
      }

      case 'findAlternatives': {
        if (!params.failedSelector || !params.pageContent) {
          return { success: false, message: 'Failed selector and page content are required' };
        }

        const alternatives = findAlternativeSelectors(
          params.failedSelector,
          params.pageContent,
          params.elementDescription
        );

        return {
          success: true,
          message: `Found ${alternatives.length} alternative selectors`,
          alternatives
        };
      }

      case 'learnCorrection': {
        if (!params.failedSelector || !params.newSelector) {
          return { success: false, message: 'Both old and new selectors are required' };
        }

        const domain = params.pageUrl ? new URL(params.pageUrl).hostname : 'unknown';
        const key = `${domain}:${params.failedSelector}`;

        const existing = selectorMemory.get(key);
        if (existing) {
          existing.successCount++;
          existing.confidence = Math.min(0.99, existing.confidence + 0.05);
        } else {
          selectorMemory.set(key, {
            domain,
            oldSelector: params.failedSelector,
            newSelector: params.newSelector,
            confidence: 0.8,
            learnedAt: new Date(),
            successCount: 1
          });
        }

        return {
          success: true,
          message: `Learned correction: "${params.failedSelector}" -> "${params.newSelector}" for ${domain}`
        };
      }

      case 'getMemory': {
        const memory = Array.from(selectorMemory.values()).map(m => ({
          oldSelector: m.oldSelector,
          newSelector: m.newSelector,
          domain: m.domain,
          confidence: m.confidence
        }));

        return {
          success: true,
          message: `Retrieved ${memory.length} learned corrections`,
          memory
        };
      }

      case 'applyFix': {
        if (!params.targetFile || !params.failedSelector || !params.newSelector) {
          return { success: false, message: 'Target file, old selector, and new selector are required' };
        }

        const filePath = join(process.cwd(), params.targetFile);
        if (!existsSync(filePath)) {
          return { success: false, message: `File not found: ${params.targetFile}` };
        }

        let content = readFileSync(filePath, 'utf-8');

        // Escape special regex characters in selector
        const escapedSelector = params.failedSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Replace all occurrences
        const regex = new RegExp(escapedSelector, 'g');
        const matchCount = (content.match(regex) || []).length;

        if (matchCount === 0) {
          return { success: false, message: `Selector not found in file: ${params.failedSelector}` };
        }

        content = content.replace(regex, params.newSelector);
        writeFileSync(filePath, content);

        return {
          success: true,
          message: `Applied fix: replaced ${matchCount} occurrence(s) of "${params.failedSelector}" with "${params.newSelector}" in ${params.targetFile}`,
          appliedFix: true
        };
      }

      case 'categorizeError': {
        if (!params.errorMessage) {
          return { success: false, message: 'Error message is required' };
        }

        const category = categorizeError(params.errorMessage);
        const rootCause = determineRootCause(category, params.errorMessage, params.failedSelector);

        return {
          success: true,
          message: `Error categorized as: ${category}`,
          analysis: {
            category,
            rootCause,
            suggestedActions: getSuggestedActions(category, params.failedSelector, []),
            alternatives: [],
            canAutoFix: false
          }
        };
      }

      default:
        return {
          success: false,
          message: `Unknown action: ${action}. Valid actions: analyzeFailure, findAlternatives, learnCorrection, getMemory, applyFix, categorizeError`
        };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Self-correction error: ${errorMsg}`
    };
  }
}

/**
 * Categorize error based on message patterns
 */
function categorizeError(errorMessage: string): FailureCategory {
  const lowerError = errorMessage.toLowerCase();

  for (const pattern of Array.from(failurePatterns.values())) {
    if (new RegExp(pattern.pattern, 'i').test(lowerError)) {
      return pattern.category;
    }
  }

  if (lowerError.includes('timeout')) return 'selector_timeout';
  if (lowerError.includes('not found') || lowerError.includes('no element')) return 'selector_outdated';
  if (lowerError.includes('stale')) return 'dynamic_content';
  if (lowerError.includes('network') || lowerError.includes('failed to fetch')) return 'network_error';
  if (lowerError.includes('permission') || lowerError.includes('denied')) return 'permission_denied';

  return 'unknown';
}

/**
 * Determine root cause based on category
 */
function determineRootCause(category: FailureCategory, errorMessage: string, selector?: string): string {
  const causes: Record<FailureCategory, string> = {
    selector_outdated: `The selector "${selector || 'unknown'}" no longer matches any element. The page structure may have changed.`,
    selector_timeout: `The element "${selector || 'unknown'}" did not appear within the timeout period. Page may be loading slowly or element is conditionally rendered.`,
    dynamic_content: `The element was found but became stale before interaction. The page has dynamic content that updates frequently.`,
    network_error: `Network request failed. The server may be unreachable or the connection was interrupted.`,
    browser_crashed: `The browser context was closed unexpectedly. May need to restart the browser session.`,
    permission_denied: `Access was denied. May require authentication or the action is blocked by the site.`,
    unknown: `Unable to determine the exact cause. Error: ${errorMessage.substring(0, 100)}`
  };

  return causes[category];
}

/**
 * Find alternative selectors in page content
 */
function findAlternativeSelectors(
  failedSelector: string,
  pageContent: string,
  elementDescription?: string
): SelectorAlternative[] {
  const alternatives: SelectorAlternative[] = [];

  // Extract hints from the failed selector
  const idMatch = failedSelector.match(/#([a-zA-Z0-9_-]+)/);
  const classMatch = failedSelector.match(/\.([a-zA-Z0-9_-]+)/);
  const tagMatch = failedSelector.match(/^([a-z]+)/i);

  // Look for data-testid attributes (most reliable)
  const testIdRegex = /data-testid=["']([^"']+)["']/gi;
  let match;
  while ((match = testIdRegex.exec(pageContent)) !== null) {
    alternatives.push({
      selector: `[data-testid="${match[1]}"]`,
      type: 'data-attribute',
      confidence: 0.9,
      reason: 'data-testid attributes are stable test identifiers'
    });
  }

  // Look for aria-label attributes
  const ariaRegex = /aria-label=["']([^"']+)["']/gi;
  while ((match = ariaRegex.exec(pageContent)) !== null) {
    if (elementDescription && match[1].toLowerCase().includes(elementDescription.toLowerCase())) {
      alternatives.push({
        selector: `[aria-label="${match[1]}"]`,
        type: 'aria',
        confidence: 0.85,
        reason: `aria-label matches description: "${elementDescription}"`
      });
    }
  }

  // Look for similar IDs
  if (idMatch) {
    const idBase = idMatch[1].replace(/[-_]\d+$/, ''); // Remove trailing numbers
    const similarIdRegex = new RegExp(`id=["']([^"']*${idBase}[^"']*)["']`, 'gi');
    while ((match = similarIdRegex.exec(pageContent)) !== null) {
      if (match[1] !== idMatch[1]) {
        alternatives.push({
          selector: `#${match[1]}`,
          type: 'id',
          confidence: 0.75,
          reason: `Similar ID pattern to original: #${idMatch[1]}`
        });
      }
    }
  }

  // Look for similar classes
  if (classMatch) {
    const classBase = classMatch[1].substring(0, Math.min(5, classMatch[1].length));
    const similarClassRegex = new RegExp(`class=["'][^"']*\\b(${classBase}[a-zA-Z0-9_-]*)\\b[^"']*["']`, 'gi');
    while ((match = similarClassRegex.exec(pageContent)) !== null) {
      if (match[1] !== classMatch[1]) {
        alternatives.push({
          selector: `.${match[1]}`,
          type: 'class',
          confidence: 0.6,
          reason: `Similar class pattern to original: .${classMatch[1]}`
        });
      }
    }
  }

  // Look for role attributes
  const roleRegex = /role=["']([^"']+)["']/gi;
  while ((match = roleRegex.exec(pageContent)) !== null) {
    alternatives.push({
      selector: `[role="${match[1]}"]`,
      type: 'aria',
      confidence: 0.5,
      reason: `Role attribute: ${match[1]}`
    });
  }

  // Sort by confidence and deduplicate
  const seen = new Set<string>();
  return alternatives
    .filter(alt => {
      if (seen.has(alt.selector)) return false;
      seen.add(alt.selector);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

/**
 * Check memory for past corrections
 */
function checkMemory(selector: string, pageUrl: string): {
  newSelector: string;
  confidence: number;
  successCount: number;
} | null {
  try {
    const domain = new URL(pageUrl).hostname;
    const key = `${domain}:${selector}`;
    const memorized = selectorMemory.get(key);

    if (memorized) {
      return {
        newSelector: memorized.newSelector,
        confidence: memorized.confidence,
        successCount: memorized.successCount
      };
    }
  } catch { /* ignore URL parse errors */ }

  return null;
}

/**
 * Get suggested actions based on failure category
 */
function getSuggestedActions(
  category: FailureCategory,
  failedSelector?: string,
  alternatives?: SelectorAlternative[]
): string[] {
  const baseActions: Record<FailureCategory, string[]> = {
    selector_outdated: [
      'Inspect the page to find the updated selector',
      'Try using data-testid or aria-label selectors',
      'Check if the element is inside an iframe'
    ],
    selector_timeout: [
      'Increase the timeout value',
      'Add explicit wait for page load',
      'Check if element is conditionally rendered'
    ],
    dynamic_content: [
      'Re-query the element immediately before interaction',
      'Add a small delay before interaction',
      'Use waitForSelector before each action'
    ],
    network_error: [
      'Check network connectivity',
      'Retry the request with exponential backoff',
      'Verify the URL is correct and accessible'
    ],
    browser_crashed: [
      'Restart the browser session',
      'Check for memory issues',
      'Reduce concurrent operations'
    ],
    permission_denied: [
      'Check if authentication is required',
      'Verify cookies/session state',
      'Check for rate limiting'
    ],
    unknown: [
      'Review the full error stack trace',
      'Check browser console for additional errors',
      'Try running the action in isolation'
    ]
  };

  const actions = [...baseActions[category]];

  // Add alternative selector suggestions
  if (alternatives && alternatives.length > 0) {
    const topAlt = alternatives[0];
    actions.unshift(`Try alternative selector: ${topAlt.selector} (${Math.round(topAlt.confidence * 100)}% confidence)`);
  }

  return actions;
}
