/**
 * Visual Verification Module
 *
 * Provides verification capabilities for the Web Operator:
 * 1. Screenshot capture and analysis
 * 2. Element visibility checks
 * 3. Text content verification
 * 4. URL matching
 * 5. Page state comparison
 */

import type { Page } from 'playwright';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getKnowledgeBase } from '../../core/memory/knowledge-base.js';
import { getSelfCorrector } from '../self-correction/self-corrector.js';

export interface VerificationResult {
  success: boolean;
  verificationType: string;
  expected: string;
  actual: string;
  confidence: number;    // 0-1, how confident we are in the result
  screenshot?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface PageState {
  url: string;
  title: string;
  visibleText: string;
  screenshotPath?: string;
  timestamp: string;
  metadata?: {
    elementCount?: number;
    hasForm?: boolean;
    hasError?: boolean;
    loadTime?: number;
  };
}

export class VisualVerification {
  private screenshotsDir: string;
  private kb = getKnowledgeBase();
  private selfCorrector = getSelfCorrector();

  constructor(screenshotsDir?: string) {
    this.screenshotsDir = screenshotsDir || join(process.cwd(), 'screenshots', 'verification');
    if (!existsSync(this.screenshotsDir)) {
      mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  /**
   * Capture current page state for verification
   */
  async capturePageState(page: Page, name?: string): Promise<PageState> {
    const startTime = Date.now();

    // Get basic page info
    const url = page.url();
    const title = await page.title();

    // Get visible text content (truncated)
    const visibleText = await page.evaluate(() => {
      const body = (globalThis as any).document.body;
      return body ? body.innerText.substring(0, 5000) : '';
    });

    // Take screenshot
    const screenshotName = name || `state_${Date.now()}`;
    const screenshotPath = join(this.screenshotsDir, `${screenshotName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Get metadata
    const metadata = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      return {
        elementCount: doc.querySelectorAll('*').length,
        hasForm: doc.querySelectorAll('form').length > 0,
        hasError: !!(
          doc.querySelector('[class*="error"]') ||
          doc.querySelector('[class*="Error"]') ||
          doc.querySelector('[role="alert"]')
        )
      };
    });

    return {
      url,
      title,
      visibleText,
      screenshotPath,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        loadTime: Date.now() - startTime
      }
    };
  }

  /**
   * Verify URL matches expected pattern
   */
  async verifyUrl(page: Page, expected: string | RegExp): Promise<VerificationResult> {
    const actual = page.url();
    let success: boolean;
    let expectedStr: string;

    if (expected instanceof RegExp) {
      success = expected.test(actual);
      expectedStr = expected.toString();
    } else {
      // Support partial URL matching
      success = actual.includes(expected) || actual === expected;
      expectedStr = expected;
    }

    return {
      success,
      verificationType: 'url_match',
      expected: expectedStr,
      actual,
      confidence: 1.0,  // URL matching is deterministic
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verify element is visible on page
   */
  async verifyElementVisible(
    page: Page,
    selector: string,
    options: { timeout?: number; screenshot?: boolean } = {}
  ): Promise<VerificationResult> {
    const timeout = options.timeout || 5000;
    let screenshotPath: string | undefined;

    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });

      // Take screenshot if requested
      if (options.screenshot) {
        const name = `element_${selector.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        screenshotPath = join(this.screenshotsDir, `${name}.png`);
        await page.screenshot({ path: screenshotPath });
      }

      return {
        success: true,
        verificationType: 'element_visible',
        expected: `Element "${selector}" is visible`,
        actual: 'Element found and visible',
        confidence: 1.0,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Take failure screenshot
      const name = `failed_element_${Date.now()}`;
      screenshotPath = join(this.screenshotsDir, `${name}.png`);
      await page.screenshot({ path: screenshotPath }).catch(() => { });

      return {
        success: false,
        verificationType: 'element_visible',
        expected: `Element "${selector}" is visible`,
        actual: `Element not found or not visible: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 1.0,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verify text is present on page
   */
  async verifyTextPresent(
    page: Page,
    expectedText: string,
    options: { caseSensitive?: boolean; selector?: string; screenshot?: boolean } = {}
  ): Promise<VerificationResult> {
    let screenshotPath: string | undefined;

    try {
      let actualText: string;

      if (options.selector) {
        // Look within specific element
        const element = await page.$(options.selector);
        if (!element) {
          throw new Error(`Container element not found: ${options.selector}`);
        }
        actualText = await element.textContent() || '';
      } else {
        // Search entire page
        actualText = await page.evaluate(() => (globalThis as any).document.body.innerText);
      }

      const searchText = options.caseSensitive ? expectedText : expectedText.toLowerCase();
      const contentText = options.caseSensitive ? actualText : actualText.toLowerCase();
      const found = contentText.includes(searchText);

      // Take screenshot
      if (options.screenshot) {
        const name = `text_verify_${Date.now()}`;
        screenshotPath = join(this.screenshotsDir, `${name}.png`);
        await page.screenshot({ path: screenshotPath });
      }

      // Calculate confidence based on fuzzy match
      let confidence = found ? 1.0 : 0;
      if (!found) {
        // Check for partial matches
        const words = searchText.split(/\s+/);
        const matchedWords = words.filter(w => contentText.includes(w));
        confidence = matchedWords.length / words.length;
      }

      return {
        success: found,
        verificationType: 'text_present',
        expected: `Text "${expectedText.substring(0, 100)}" present`,
        actual: found ? 'Text found' : `Text not found. Partial match: ${(confidence * 100).toFixed(0)}%`,
        confidence,
        screenshot: screenshotPath,
        details: {
          matchedText: found ? expectedText : undefined,
          pageTextLength: actualText.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        verificationType: 'text_present',
        expected: `Text "${expectedText.substring(0, 100)}" present`,
        actual: `Error: ${error instanceof Error ? error.message : String(error)}`,
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verify page title matches
   */
  async verifyTitle(page: Page, expected: string | RegExp): Promise<VerificationResult> {
    const actual = await page.title();
    let success: boolean;
    let expectedStr: string;

    if (expected instanceof RegExp) {
      success = expected.test(actual);
      expectedStr = expected.toString();
    } else {
      success = actual.toLowerCase().includes(expected.toLowerCase());
      expectedStr = expected;
    }

    return {
      success,
      verificationType: 'title_match',
      expected: expectedStr,
      actual,
      confidence: 1.0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract specific data from page
   */
  async extractData(
    page: Page,
    selector: string,
    attribute?: string
  ): Promise<{ success: boolean; data: string | null; screenshot?: string }> {
    try {
      const element = await page.$(selector);
      if (!element) {
        return { success: false, data: null };
      }

      let data: string | null;
      if (attribute) {
        data = await element.getAttribute(attribute);
      } else {
        data = await element.textContent();
      }

      // Take screenshot of the element
      const screenshotPath = join(this.screenshotsDir, `extract_${Date.now()}.png`);
      await element.screenshot({ path: screenshotPath }).catch(() => { });

      return {
        success: data !== null,
        data: data?.trim() || null,
        screenshot: screenshotPath
      };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  /**
   * Compare current page state with expected state
   */
  async compareStates(
    currentState: PageState,
    expectedConditions: {
      urlContains?: string;
      titleContains?: string;
      textContains?: string[];
      noErrorIndicators?: boolean;
    }
  ): Promise<VerificationResult> {
    const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

    if (expectedConditions.urlContains) {
      const passed = currentState.url.includes(expectedConditions.urlContains);
      checks.push({
        name: 'URL',
        passed,
        detail: passed ? 'URL matches' : `URL "${currentState.url}" doesn't contain "${expectedConditions.urlContains}"`
      });
    }

    if (expectedConditions.titleContains) {
      const passed = currentState.title.toLowerCase().includes(expectedConditions.titleContains.toLowerCase());
      checks.push({
        name: 'Title',
        passed,
        detail: passed ? 'Title matches' : `Title "${currentState.title}" doesn't contain "${expectedConditions.titleContains}"`
      });
    }

    if (expectedConditions.textContains) {
      for (const text of expectedConditions.textContains) {
        const passed = currentState.visibleText.toLowerCase().includes(text.toLowerCase());
        checks.push({
          name: `Text: ${text.substring(0, 30)}`,
          passed,
          detail: passed ? 'Text found' : 'Text not found'
        });
      }
    }

    if (expectedConditions.noErrorIndicators && currentState.metadata?.hasError) {
      checks.push({
        name: 'No errors',
        passed: false,
        detail: 'Error indicator detected on page'
      });
    }

    const passedCount = checks.filter(c => c.passed).length;
    const totalCount = checks.length;
    const success = passedCount === totalCount;

    return {
      success,
      verificationType: 'state_comparison',
      expected: `All ${totalCount} conditions met`,
      actual: `${passedCount}/${totalCount} conditions passed`,
      confidence: totalCount > 0 ? passedCount / totalCount : 1,
      screenshot: currentState.screenshotPath,
      details: { checks },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Verify step and trigger self-evolution on failure
   */
  async verifyWithSelfEvolution(
    page: Page,
    verificationType: 'url' | 'element' | 'text' | 'title',
    expected: string,
    action: string,
    selector?: string
  ): Promise<VerificationResult & { selfEvolutionTriggered?: boolean }> {
    let result: VerificationResult;

    switch (verificationType) {
      case 'url':
        result = await this.verifyUrl(page, expected);
        break;
      case 'element':
        result = await this.verifyElementVisible(page, expected, { screenshot: true });
        break;
      case 'text':
        result = await this.verifyTextPresent(page, expected, { screenshot: true });
        break;
      case 'title':
        result = await this.verifyTitle(page, expected);
        break;
    }

    // If verification failed, trigger self-evolution
    if (!result.success) {
      const pageContent = await page.content();

      const correctionResult = await this.selfCorrector.analyzeAndCorrect({
        action,
        selector,
        url: page.url(),
        errorMessage: `Verification failed: ${result.actual}`,
        pageContent
      });

      // Save failure lesson
      this.kb.saveLesson({
        task_type: 'verification_failure',
        task_description: `${action}: expected ${expected}`,
        success: false,
        error_message: result.actual,
        lesson_summary: `Verification failed for ${verificationType}: ${expected.substring(0, 50)}`,
        category: 'visual_verification'
      });

      return {
        ...result,
        selfEvolutionTriggered: true,
        details: {
          ...result.details,
          selfEvolution: {
            analyzed: true,
            category: correctionResult.analysis.category,
            fixApplied: correctionResult.applied
          }
        }
      };
    }

    return result;
  }

  /**
   * Wait for verification condition to be true
   */
  async waitForVerification(
    page: Page,
    verificationType: 'url' | 'element' | 'text' | 'title',
    expected: string,
    options: { timeout?: number; pollInterval?: number } = {}
  ): Promise<VerificationResult> {
    const timeout = options.timeout || 30000;
    const pollInterval = options.pollInterval || 500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      let result: VerificationResult;

      switch (verificationType) {
        case 'url':
          result = await this.verifyUrl(page, expected);
          break;
        case 'element':
          result = await this.verifyElementVisible(page, expected, { timeout: pollInterval });
          break;
        case 'text':
          result = await this.verifyTextPresent(page, expected);
          break;
        case 'title':
          result = await this.verifyTitle(page, expected);
          break;
      }

      if (result.success) {
        return result;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Final attempt with screenshot
    const screenshotPath = join(this.screenshotsDir, `timeout_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });

    return {
      success: false,
      verificationType: `${verificationType}_wait`,
      expected,
      actual: `Timeout after ${timeout}ms`,
      confidence: 0,
      screenshot: screenshotPath,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let visualVerificationInstance: VisualVerification | null = null;

export function getVisualVerification(): VisualVerification {
  if (!visualVerificationInstance) {
    visualVerificationInstance = new VisualVerification();
  }
  return visualVerificationInstance;
}
