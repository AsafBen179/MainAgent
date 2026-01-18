/**
 * Human-Like Behavior Module for Web Operator
 *
 * Implements realistic browser interactions to avoid bot detection:
 * - Random delays between actions
 * - Smooth scrolling with variable speed
 * - Natural mouse movements with curves
 * - Realistic typing with variable speed and occasional "mistakes"
 * - Random viewport interactions
 */

import type { Page, Mouse } from 'playwright';

export interface HumanBehaviorConfig {
  // Delay settings (ms)
  minDelay: number;
  maxDelay: number;
  typingSpeed: number;        // Characters per second (average)
  typingVariation: number;    // Variation in typing speed (0-1)

  // Mouse settings
  mouseMoveSteps: number;     // Steps in mouse movement path
  mouseSpeed: number;         // Base mouse speed

  // Scroll settings
  scrollSpeed: number;        // Pixels per step
  scrollSteps: number;        // Number of steps for smooth scroll

  // Behavior flags
  simulateMistakes: boolean;  // Occasional typos
  randomViewportMovement: boolean;
  addMicroPauses: boolean;
}

const DEFAULT_CONFIG: HumanBehaviorConfig = {
  minDelay: 100,
  maxDelay: 500,
  typingSpeed: 8,
  typingVariation: 0.3,
  mouseMoveSteps: 25,
  mouseSpeed: 1,
  scrollSpeed: 100,
  scrollSteps: 10,
  simulateMistakes: false,  // Disabled by default for reliability
  randomViewportMovement: true,
  addMicroPauses: true
};

export class HumanBehavior {
  private config: HumanBehaviorConfig;

  constructor(config: Partial<HumanBehaviorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Random delay between actions
   */
  async randomDelay(min?: number, max?: number): Promise<void> {
    const minMs = min ?? this.config.minDelay;
    const maxMs = max ?? this.config.maxDelay;
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await this.sleep(delay);
  }

  /**
   * Type text with human-like timing
   */
  async humanType(page: Page, selector: string, text: string): Promise<void> {
    // Focus the element first
    await page.click(selector);
    await this.randomDelay(50, 150);

    // Clear existing content
    await page.fill(selector, '');
    await this.randomDelay(100, 200);

    // Type character by character with variable delays
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Calculate delay based on typing speed with variation
      const baseDelay = 1000 / this.config.typingSpeed;
      const variation = baseDelay * this.config.typingVariation;
      const charDelay = baseDelay + (Math.random() * variation * 2 - variation);

      await page.keyboard.type(char, { delay: charDelay });

      // Occasional micro-pause (like thinking)
      if (this.config.addMicroPauses && Math.random() < 0.05) {
        await this.randomDelay(200, 500);
      }
    }
  }

  /**
   * Move mouse with natural curved path
   */
  async humanMouseMove(
    page: Page,
    targetX: number,
    targetY: number
  ): Promise<void> {
    const mouse = page.mouse;

    // Get current position (approximate center if unknown)
    const viewport = page.viewportSize();
    const startX = viewport ? viewport.width / 2 : 500;
    const startY = viewport ? viewport.height / 2 : 300;

    // Generate bezier curve control points for natural movement
    const controlX1 = startX + (targetX - startX) * 0.3 + (Math.random() - 0.5) * 100;
    const controlY1 = startY + (targetY - startY) * 0.1 + (Math.random() - 0.5) * 50;
    const controlX2 = startX + (targetX - startX) * 0.7 + (Math.random() - 0.5) * 100;
    const controlY2 = startY + (targetY - startY) * 0.9 + (Math.random() - 0.5) * 50;

    // Move along the bezier curve
    for (let t = 0; t <= 1; t += 1 / this.config.mouseMoveSteps) {
      const x = this.bezierPoint(t, startX, controlX1, controlX2, targetX);
      const y = this.bezierPoint(t, startY, controlY1, controlY2, targetY);

      await mouse.move(x, y);

      // Variable speed - slow down near target
      const speedFactor = t < 0.8 ? 1 : 2;
      await this.sleep(10 * speedFactor / this.config.mouseSpeed);
    }

    // Final position
    await mouse.move(targetX, targetY);
  }

  /**
   * Click with human-like behavior
   */
  async humanClick(page: Page, selector: string): Promise<void> {
    // Get element position
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const box = await element.boundingBox();
    if (!box) {
      throw new Error(`Element has no bounding box: ${selector}`);
    }

    // Calculate click position with slight randomness within element
    const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

    // Move mouse naturally to target
    await this.humanMouseMove(page, targetX, targetY);
    await this.randomDelay(50, 150);

    // Click with slight delay
    await page.mouse.down();
    await this.sleep(50 + Math.random() * 50);
    await page.mouse.up();

    await this.randomDelay(100, 300);
  }

  /**
   * Smooth scroll to element or position
   */
  async smoothScroll(
    page: Page,
    options: { selector?: string; y?: number; direction?: 'up' | 'down' }
  ): Promise<void> {
    if (options.selector) {
      // Scroll element into view smoothly
      await page.evaluate(async (sel: string) => {
        /* eslint-disable no-undef */
        const element = (globalThis as any).document.querySelector(sel);
        if (element) {
          const rect = element.getBoundingClientRect();
          const win = globalThis as any;
          const targetY = win.scrollY + rect.top - win.innerHeight / 3;

          // Smooth scroll animation
          const startY = win.scrollY;
          const distance = targetY - startY;
          const duration = Math.min(Math.abs(distance) * 2, 1000);
          const startTime = performance.now();

          const easeInOutQuad = (t: number) =>
            t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

          const animateScroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutQuad(progress);

            win.scrollTo(0, startY + distance * easedProgress);

            if (progress < 1) {
              win.requestAnimationFrame(animateScroll);
            }
          };

          win.requestAnimationFrame(animateScroll);

          // Wait for animation to complete
          await new Promise(resolve => setTimeout(resolve, duration + 100));
        }
        /* eslint-enable no-undef */
      }, options.selector);
    } else if (options.y !== undefined) {
      // Scroll to specific Y position
      const steps = this.config.scrollSteps;
      const currentY = await page.evaluate(() => (globalThis as any).scrollY);
      const distance = options.y - currentY;
      const stepSize = distance / steps;

      for (let i = 0; i < steps; i++) {
        await page.evaluate((scrollAmount: number) => {
          (globalThis as any).scrollBy(0, scrollAmount);
        }, stepSize);
        await this.sleep(30 + Math.random() * 20);
      }
    } else if (options.direction) {
      // Scroll up or down by viewport height
      const viewport = page.viewportSize();
      const scrollAmount = (viewport?.height || 600) * 0.7;
      const direction = options.direction === 'down' ? 1 : -1;

      await this.smoothScroll(page, {
        y: await page.evaluate(() => (globalThis as any).scrollY) + scrollAmount * direction
      });
    }

    await this.randomDelay(200, 400);
  }

  /**
   * Simulate reading time based on content
   */
  async simulateReading(page: Page, selector?: string): Promise<void> {
    let textLength = 500; // Default assumption

    if (selector) {
      textLength = await page.evaluate((sel: string) => {
        const element = (globalThis as any).document.querySelector(sel);
        return element?.textContent?.length || 500;
      }, selector);
    }

    // Average reading speed: ~250 words per minute = ~1250 chars per minute
    // Add some randomness
    const readingTime = (textLength / 1250) * 60 * 1000; // Convert to ms
    const actualTime = readingTime * (0.5 + Math.random() * 0.5); // 50-100% of calculated time

    await this.sleep(Math.min(actualTime, 5000)); // Cap at 5 seconds
  }

  /**
   * Random viewport movement (simulates user looking around)
   */
  async randomViewportMovement(page: Page): Promise<void> {
    if (!this.config.randomViewportMovement) return;

    const viewport = page.viewportSize();
    if (!viewport) return;

    // Random position within viewport
    const x = Math.random() * viewport.width;
    const y = Math.random() * viewport.height;

    await this.humanMouseMove(page, x, y);
    await this.randomDelay(100, 300);
  }

  /**
   * Wait for page to be "ready" with human-like timing
   */
  async waitForPageReady(page: Page): Promise<void> {
    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });

    // Small delay to "process" the page
    await this.randomDelay(500, 1500);

    // Optional random movement
    if (this.config.randomViewportMovement && Math.random() < 0.3) {
      await this.randomViewportMovement(page);
    }
  }

  /**
   * Helper: Bezier curve point calculation
   */
  private bezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const u = 1 - t;
    return u * u * u * p0 +
      3 * u * u * t * p1 +
      3 * u * t * t * p2 +
      t * t * t * p3;
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HumanBehaviorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): HumanBehaviorConfig {
    return { ...this.config };
  }
}

// Singleton instance
let humanBehaviorInstance: HumanBehavior | null = null;

export function getHumanBehavior(): HumanBehavior {
  if (!humanBehaviorInstance) {
    humanBehaviorInstance = new HumanBehavior();
  }
  return humanBehaviorInstance;
}
