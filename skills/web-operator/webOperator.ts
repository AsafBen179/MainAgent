/**
 * Web Operator Skill - Stealth Browser Automation
 *
 * @description This skill provides stealth Playwright browser automation for accessing
 * external websites without being detected as a bot. Use this skill whenever you need to:
 * - Browse crypto exchanges (Binance, Coinbase, etc.)
 * - Access trading platforms (TradingView)
 * - Scrape news sites or data sources
 * - Interact with web forms or dashboards
 *
 * The browser runs in HEADED mode (visible on desktop) by default so actions can be monitored.
 * Includes anti-detection measures: disabled automation flags, realistic user agent, human-like delays.
 *
 * @example
 * // Navigate to a trading site and extract data
 * await webOperator({
 *   action: 'navigate',
 *   url: 'https://tradingview.com/symbols/ETHBTC',
 *   waitForSelector: '.tv-symbol-price-quote__value'
 * });
 */

// @ts-ignore - playwright types may not be available at compile time
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Session storage for browser instances
const sessions: Map<string, {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  startedAt: Date;
  currentUrl: string;
}> = new Map();

// Screenshots directory
const screenshotsDir = join(process.cwd(), 'screenshots');
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Web Operator - Stealth browser automation for accessing external websites
 *
 * @description Launches and controls a stealth Playwright browser with anti-detection measures.
 * Use this for any web browsing task: trading sites, news, data extraction, form filling.
 * Browser runs in VISIBLE mode (headless: false) so you can see what's happening.
 *
 * @param {Object} params - The operation parameters
 * @param {string} params.action - The action to perform: 'launch' | 'navigate' | 'click' | 'type' | 'screenshot' | 'getContent' | 'waitFor' | 'close'
 * @param {string} [params.sessionId] - Session ID for browser reuse (auto-generated if not provided)
 * @param {string} [params.url] - URL to navigate to (for 'navigate' action)
 * @param {string} [params.selector] - CSS selector for element interactions
 * @param {string} [params.text] - Text to type (for 'type' action)
 * @param {string} [params.waitForSelector] - Wait for this selector after navigation
 * @param {number} [params.timeout=30000] - Timeout in milliseconds
 * @param {boolean} [params.fullPage=false] - Take full page screenshot
 * @param {'html'|'text'} [params.contentType='text'] - Content extraction type
 *
 * @returns {Promise<Object>} Result object with success status and relevant data
 *
 * @example
 * // Launch browser and navigate
 * const result = await webOperator({
 *   action: 'navigate',
 *   url: 'https://www.coingecko.com/en/coins/bitcoin'
 * });
 *
 * @example
 * // Take a screenshot
 * const screenshot = await webOperator({
 *   action: 'screenshot',
 *   sessionId: result.sessionId,
 *   fullPage: true
 * });
 *
 * @example
 * // Extract page content
 * const content = await webOperator({
 *   action: 'getContent',
 *   sessionId: result.sessionId,
 *   contentType: 'text'
 * });
 */
export default async function webOperator(params: {
  action: 'launch' | 'navigate' | 'click' | 'type' | 'screenshot' | 'getContent' | 'waitFor' | 'close' | 'evaluate';
  sessionId?: string;
  url?: string;
  selector?: string;
  text?: string;
  waitForSelector?: string;
  timeout?: number;
  fullPage?: boolean;
  contentType?: 'html' | 'text';
  script?: string;
}): Promise<{
  success: boolean;
  sessionId?: string;
  message: string;
  data?: unknown;
  screenshot?: string;
  url?: string;
  title?: string;
}> {
  const { action, timeout = 30000 } = params;
  let { sessionId } = params;

  try {
    switch (action) {
      case 'launch': {
        // Generate session ID if not provided
        sessionId = sessionId || `WEB-${Date.now().toString(36).toUpperCase()}`;

        if (sessions.has(sessionId)) {
          return {
            success: true,
            sessionId,
            message: 'Session already exists'
          };
        }

        // Launch browser with stealth settings
        // IMPORTANT: headless: false - browser is VISIBLE on desktop
        const browser = await chromium.launch({
          headless: false, // VISIBLE browser for monitoring
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ]
        });

        // Create context with realistic settings
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          locale: 'en-US',
          timezoneId: 'America/New_York',
          permissions: ['geolocation'],
          geolocation: { latitude: 40.7128, longitude: -74.0060 },
          colorScheme: 'light'
        });

        // Add stealth scripts to avoid detection
        await context.addInitScript(() => {
          // Override webdriver property
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

          // Override plugins
          Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
          });

          // Override languages
          Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
          });
        });

        const page = await context.newPage();

        sessions.set(sessionId, {
          browser,
          context,
          page,
          startedAt: new Date(),
          currentUrl: 'about:blank'
        });

        return {
          success: true,
          sessionId,
          message: `Browser launched (visible on desktop) - Session: ${sessionId}`
        };
      }

      case 'navigate': {
        if (!params.url) {
          return { success: false, message: 'URL is required for navigate action' };
        }

        // Auto-launch if no session
        if (!sessionId || !sessions.has(sessionId)) {
          const launchResult = await webOperator({ action: 'launch', sessionId });
          if (!launchResult.success) return launchResult;
          sessionId = launchResult.sessionId;
        }

        const session = sessions.get(sessionId!);
        if (!session) {
          return { success: false, message: 'Session not found' };
        }

        // Navigate with human-like delay
        await randomDelay(500, 1500);

        await session.page.goto(params.url, {
          waitUntil: 'domcontentloaded',
          timeout
        });

        session.currentUrl = params.url;

        // Wait for specific selector if provided
        if (params.waitForSelector) {
          await session.page.waitForSelector(params.waitForSelector, { timeout });
        }

        // Additional delay to let dynamic content load
        await randomDelay(1000, 2000);

        const title = await session.page.title();

        return {
          success: true,
          sessionId,
          message: `Navigated to: ${title}`,
          url: params.url,
          title
        };
      }

      case 'click': {
        if (!params.selector) {
          return { success: false, message: 'Selector is required for click action' };
        }

        const session = sessions.get(sessionId!);
        if (!session) {
          return { success: false, message: 'Session not found - launch browser first' };
        }

        // Human-like click with delay
        await randomDelay(200, 500);
        await session.page.click(params.selector, { timeout });
        await randomDelay(300, 700);

        return {
          success: true,
          sessionId,
          message: `Clicked: ${params.selector}`
        };
      }

      case 'type': {
        if (!params.selector || !params.text) {
          return { success: false, message: 'Selector and text are required for type action' };
        }

        const session = sessions.get(sessionId!);
        if (!session) {
          return { success: false, message: 'Session not found - launch browser first' };
        }

        // Human-like typing
        await session.page.click(params.selector);
        await randomDelay(100, 300);

        // Type with random delays between characters
        for (const char of params.text) {
          await session.page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
        }

        return {
          success: true,
          sessionId,
          message: `Typed into: ${params.selector}`
        };
      }

      case 'screenshot': {
        const session = sessions.get(sessionId!);
        if (!session) {
          return { success: false, message: 'Session not found - launch browser first' };
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.png`;
        const filepath = join(screenshotsDir, filename);

        await session.page.screenshot({
          path: filepath,
          fullPage: params.fullPage || false
        });

        return {
          success: true,
          sessionId,
          message: `Screenshot saved: ${filename}`,
          screenshot: filepath,
          url: session.currentUrl
        };
      }

      case 'getContent': {
        const session = sessions.get(sessionId!);
        if (!session) {
          return { success: false, message: 'Session not found - launch browser first' };
        }

        const contentType = params.contentType || 'text';
        let content: string;

        if (contentType === 'html') {
          content = await session.page.content();
        } else {
          content = await session.page.innerText('body');
        }

        // Limit content size
        const maxSize = 50000;
        if (content.length > maxSize) {
          content = content.substring(0, maxSize) + '\n... (truncated)';
        }

        return {
          success: true,
          sessionId,
          message: `Extracted ${contentType} content (${content.length} chars)`,
          data: content,
          url: session.currentUrl
        };
      }

      case 'waitFor': {
        if (!params.selector) {
          return { success: false, message: 'Selector is required for waitFor action' };
        }

        const session = sessions.get(sessionId!);
        if (!session) {
          return { success: false, message: 'Session not found - launch browser first' };
        }

        try {
          await session.page.waitForSelector(params.selector, { timeout });
          return {
            success: true,
            sessionId,
            message: `Element found: ${params.selector}`
          };
        } catch {
          return {
            success: false,
            sessionId,
            message: `Element not found within timeout: ${params.selector}`
          };
        }
      }

      case 'evaluate': {
        if (!params.script) {
          return { success: false, message: 'Script is required for evaluate action' };
        }

        const session = sessions.get(sessionId!);
        if (!session) {
          return { success: false, message: 'Session not found - launch browser first' };
        }

        const result = await session.page.evaluate(params.script);

        return {
          success: true,
          sessionId,
          message: 'Script executed',
          data: result
        };
      }

      case 'close': {
        const session = sessions.get(sessionId!);
        if (!session) {
          return { success: false, message: 'Session not found' };
        }

        await session.browser.close();
        sessions.delete(sessionId!);

        return {
          success: true,
          message: `Browser session ${sessionId} closed`
        };
      }

      default:
        return {
          success: false,
          message: `Unknown action: ${action}. Valid actions: launch, navigate, click, type, screenshot, getContent, waitFor, evaluate, close`
        };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      sessionId,
      message: `WebOperator error: ${errorMsg}`
    };
  }
}

/**
 * Helper: Random delay for human-like behavior
 */
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Cleanup: Close all browser sessions
 */
export async function closeAllSessions(): Promise<void> {
  const sessionIds = Array.from(sessions.keys());
  for (const sessionId of sessionIds) {
    const session = sessions.get(sessionId);
    if (session) {
      try {
        await session.browser.close();
      } catch { /* ignore */ }
      sessions.delete(sessionId);
    }
  }
}
