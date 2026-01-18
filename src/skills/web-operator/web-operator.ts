/**
 * Web Operator Skill
 *
 * Playwright-based browser automation with safety guards.
 * Allows the agent to browse the web, take screenshots, and interact with pages.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getBrowserGuard, UrlClassification } from './browser-guard.js';
import { WhatsAppClient } from '../../core/bridge/whatsapp-client.js';
import { getKnowledgeBase } from '../../core/memory/knowledge-base.js';

export interface BrowserSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  startedAt: Date;
  currentUrl: string;
  screenshotCount: number;
}

export interface NavigationResult {
  success: boolean;
  url: string;
  title?: string;
  classification: UrlClassification;
  screenshot?: string;
  error?: string;
}

export interface ScreenshotResult {
  success: boolean;
  path: string;
  url: string;
  timestamp: string;
}

export class WebOperator {
  private sessions: Map<string, BrowserSession> = new Map();
  private screenshotsDir: string;
  private browserGuard = getBrowserGuard();
  private whatsappClient: WhatsAppClient;
  private headless: boolean;

  constructor(screenshotsDir?: string, headless: boolean = true) {
    this.screenshotsDir = screenshotsDir || join(process.cwd(), 'screenshots');
    this.headless = headless;
    this.whatsappClient = new WhatsAppClient();

    if (!existsSync(this.screenshotsDir)) {
      mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  /**
   * Launch a new browser session
   */
  async launchBrowser(sessionId?: string): Promise<{ sessionId: string; success: boolean; message: string }> {
    const id = sessionId || this.generateSessionId();

    if (this.sessions.has(id)) {
      return {
        sessionId: id,
        success: false,
        message: 'Session already exists'
      };
    }

    try {
      const browser = await chromium.launch({
        headless: this.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox'
        ]
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();

      const session: BrowserSession = {
        id,
        browser,
        context,
        page,
        startedAt: new Date(),
        currentUrl: 'about:blank',
        screenshotCount: 0
      };

      this.sessions.set(id, session);

      // Log to memory
      const kb = getKnowledgeBase();
      kb.logTaskExecution({
        task_type: 'browser_launch',
        command: `launch_browser(${id})`,
        status: 'completed',
        output: 'Browser session started'
      });

      return {
        sessionId: id,
        success: true,
        message: `Browser launched (session: ${id})`
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        sessionId: id,
        success: false,
        message: `Failed to launch browser: ${errorMsg}`
      };
    }
  }

  /**
   * Navigate to a URL with safety checks
   */
  async navigate(
    sessionId: string,
    url: string,
    options?: { waitForLoad?: boolean; timeout?: number }
  ): Promise<NavigationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        url,
        classification: this.browserGuard.classifyUrl(url),
        error: 'Session not found'
      };
    }

    // Check URL safety
    const classification = this.browserGuard.classifyUrl(url);
    const navCheck = this.browserGuard.isNavigationAllowed(url);

    // BLOCKED - Never navigate
    if (classification.level === 'BLOCKED') {
      await this.whatsappClient.notifyBlocked(
        `Browser navigation: ${url}`,
        `Blocked navigation to ${classification.category}: ${classification.reason}`
      );

      return {
        success: false,
        url,
        classification,
        error: `Navigation blocked: ${classification.reason}`
      };
    }

    // RESTRICTED - Requires approval
    if (classification.level === 'RESTRICTED') {
      const approvalId = await this.whatsappClient.requestApproval(
        `Navigate to: ${url}`,
        `Restricted site (${classification.category}): ${classification.reason}`,
        300
      );

      const approved = await this.whatsappClient.waitForApproval(approvalId, 300);

      if (approved !== 'approved') {
        return {
          success: false,
          url,
          classification,
          error: 'Navigation not approved'
        };
      }

      // Temporarily allow this domain
      try {
        const parsed = new URL(url);
        this.browserGuard.temporarilyAllow(parsed.hostname);
      } catch { /* ignore */ }
    }

    // CAUTION - Log but proceed
    if (classification.level === 'CAUTION') {
      await this.whatsappClient.logCommand(
        `Browser navigate: ${url}`,
        'YELLOW',
        `Caution: ${classification.reason}`
      );
    }

    // Navigate
    try {
      await session.page.goto(url, {
        waitUntil: options?.waitForLoad ? 'networkidle' : 'domcontentloaded',
        timeout: options?.timeout || 30000
      });

      session.currentUrl = url;
      const title = await session.page.title();

      // Log successful navigation
      const kb = getKnowledgeBase();
      kb.logTaskExecution({
        task_type: 'browser_navigate',
        command: `navigate(${url})`,
        status: 'completed',
        output: `Navigated to: ${title}`
      });

      return {
        success: true,
        url,
        title,
        classification
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Save lesson about navigation failure
      const kb = getKnowledgeBase();
      kb.saveLesson({
        task_type: 'browser_navigate',
        task_description: `Navigate to ${url}`,
        success: false,
        error_message: errorMsg,
        lesson_summary: `Navigation to ${url} failed: ${errorMsg.substring(0, 100)}`,
        category: 'web_automation'
      });

      return {
        success: false,
        url,
        classification,
        error: errorMsg
      };
    }
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(
    sessionId: string,
    options?: { fullPage?: boolean; name?: string }
  ): Promise<ScreenshotResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        path: '',
        url: '',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const name = options?.name || `screenshot-${timestamp}`;
      const filename = `${name}.png`;
      const filepath = join(this.screenshotsDir, filename);

      await session.page.screenshot({
        path: filepath,
        fullPage: options?.fullPage || false
      });

      session.screenshotCount++;

      // Log to WhatsApp for verification
      await this.whatsappClient.logCommand(
        `Screenshot: ${session.currentUrl}`,
        'GREEN',
        `Saved: ${filename}`
      );

      return {
        success: true,
        path: filepath,
        url: session.currentUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        path: '',
        url: session.currentUrl,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get the page content (HTML or text)
   */
  async getPageContent(
    sessionId: string,
    type: 'html' | 'text' = 'text'
  ): Promise<{ success: boolean; content: string; url: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, content: '', url: '' };
    }

    try {
      const content = type === 'html'
        ? await session.page.content()
        : await session.page.innerText('body');

      return {
        success: true,
        content: content.substring(0, 50000), // Limit content size
        url: session.currentUrl
      };
    } catch (error) {
      return { success: false, content: '', url: session.currentUrl };
    }
  }

  /**
   * Click an element on the page
   */
  async click(
    sessionId: string,
    selector: string
  ): Promise<{ success: boolean; message: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    try {
      await session.page.click(selector, { timeout: 10000 });

      // Log the interaction
      await this.whatsappClient.logCommand(
        `Click: ${selector}`,
        'YELLOW',
        `On page: ${session.currentUrl}`
      );

      return { success: true, message: `Clicked: ${selector}` };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Type text into an input field
   */
  async type(
    sessionId: string,
    selector: string,
    text: string
  ): Promise<{ success: boolean; message: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    // Check if typing sensitive data
    const sensitivePatterns = ['password', 'secret', 'api_key', 'token', 'credential'];
    const isSensitive = sensitivePatterns.some(p =>
      text.toLowerCase().includes(p) || selector.toLowerCase().includes(p)
    );

    if (isSensitive) {
      await this.whatsappClient.logCommand(
        `Type sensitive data: ${selector}`,
        'RED',
        'Sensitive input detected'
      );
    }

    try {
      await session.page.fill(selector, text);

      return { success: true, message: `Typed into: ${selector}` };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Wait for an element to appear
   */
  async waitForElement(
    sessionId: string,
    selector: string,
    timeout: number = 10000
  ): Promise<{ success: boolean; found: boolean }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, found: false };
    }

    try {
      await session.page.waitForSelector(selector, { timeout });
      return { success: true, found: true };
    } catch {
      return { success: true, found: false };
    }
  }

  /**
   * Execute JavaScript on the page
   */
  async evaluate(
    sessionId: string,
    script: string
  ): Promise<{ success: boolean; result: unknown }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, result: null };
    }

    // Log JavaScript execution (this is YELLOW level)
    await this.whatsappClient.logCommand(
      `Execute JS: ${script.substring(0, 100)}...`,
      'YELLOW',
      `On: ${session.currentUrl}`
    );

    try {
      const result = await session.page.evaluate(script);
      return { success: true, result };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, result: errorMsg };
    }
  }

  /**
   * Get browser session info
   */
  getSessionInfo(sessionId: string): {
    exists: boolean;
    url?: string;
    startedAt?: Date;
    screenshotCount?: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { exists: false };
    }

    return {
      exists: true,
      url: session.currentUrl,
      startedAt: session.startedAt,
      screenshotCount: session.screenshotCount
    };
  }

  /**
   * List all active sessions
   */
  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Close a browser session
   */
  async closeBrowser(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }

    try {
      await session.browser.close();
      this.sessions.delete(sessionId);

      // Log closure
      const kb = getKnowledgeBase();
      kb.logTaskExecution({
        task_type: 'browser_close',
        command: `close_browser(${sessionId})`,
        status: 'completed',
        output: `Session closed. Screenshots taken: ${session.screenshotCount}`
      });

      return { success: true, message: 'Browser closed' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Close all browser sessions
   */
  async closeAll(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.closeBrowser(sessionId);
    }
  }

  private generateSessionId(): string {
    return `WEB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
}

// Singleton instance
let webOperatorInstance: WebOperator | null = null;

export function getWebOperator(headless: boolean = true): WebOperator {
  if (!webOperatorInstance) {
    webOperatorInstance = new WebOperator(undefined, headless);
  }
  return webOperatorInstance;
}
