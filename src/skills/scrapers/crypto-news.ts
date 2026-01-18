/**
 * Crypto News Scraper
 *
 * Web-Operator Playground demonstrating:
 * 1. Live site scraping (CoinDesk/Decrypt)
 * 2. Sentiment analysis of headlines
 * 3. Self-evolution for selector updates
 * 4. Memory integration for learned patterns
 */

import { getWebOperator } from '../web-operator/web-operator.js';
import { getSelfCorrector, PlaywrightFailure } from '../self-correction/self-corrector.js';
import { getKnowledgeBase } from '../../core/memory/knowledge-base.js';
import { getPlaybookSystem } from '../../core/evolution/playbook-system.js';
import { WhatsAppClient } from '../../core/bridge/whatsapp-client.js';

export interface NewsArticle {
  title: string;
  url?: string;
  timestamp?: string;
  sentiment: {
    score: number;      // -1 to 1 (negative to positive)
    label: 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
    keywords: string[];
  };
}

export interface ScraperResult {
  success: boolean;
  source: string;
  articles: NewsArticle[];
  screenshot?: string;
  selfEvolved: boolean;
  evolutionDetails?: string;
  error?: string;
}

// Selector configurations for different news sites
// These can be updated through self-evolution
export const SCRAPER_CONFIGS = {
  coindesk: {
    url: 'https://www.coindesk.com',
    name: 'CoinDesk',
    selectors: {
      // Main article containers - multiple fallback options
      articleContainers: [

      // Refined selectors (auto-updated by Self-Evolution)
      'tr:nth-child(3) td:nth-child(4) span',
      'td:nth-child(4) span',
        'article[class*="article"]',
        '[class*="story-card"]',
        '[class*="headline"]',
        'a[href*="/article/"]',
        '[data-testid*="article"]',
        '.post-card',
        'article'
      ],
      // Title selectors within containers
      titleSelectors: [
        'h2',
        'h3',
        '[class*="title"]',
        '[class*="headline"]',
        'a[class*="title"]'
      ],
      // Link selectors
      linkSelectors: [
        'a[href*="/article/"]',
        'a[href*="/news/"]',
        'a[href*="/markets/"]'
      ]
    },
    waitTime: 5000
  },
  decrypt: {
    url: 'https://decrypt.co',
    name: 'Decrypt',
    selectors: {
      articleContainers: [
        'article',
        '[class*="post"]',
        '[class*="article"]',
        '[class*="story"]',
        'a[href*="/news/"]'
      ],
      titleSelectors: [
        'h2',
        'h3',
        '[class*="title"]',
        '[class*="headline"]'
      ],
      linkSelectors: [
        'a[href*="/news/"]',
        'a[href*="/article/"]'
      ]
    },
    waitTime: 5000
  }
};

// Sentiment analysis keywords
const SENTIMENT_KEYWORDS = {
  positive: [
    'surge', 'soar', 'rally', 'gain', 'rise', 'bullish', 'breakout', 'adoption',
    'growth', 'milestone', 'record', 'high', 'profit', 'win', 'success', 'boost',
    'partnership', 'launch', 'upgrade', 'innovation', 'approval', 'breakthrough'
  ],
  negative: [
    'crash', 'plunge', 'drop', 'fall', 'bearish', 'decline', 'loss', 'hack',
    'scam', 'fraud', 'lawsuit', 'ban', 'warning', 'risk', 'concern', 'fear',
    'collapse', 'bankruptcy', 'investigation', 'regulation', 'sell-off', 'dump'
  ],
  neutral: [
    'update', 'report', 'says', 'according', 'announces', 'plans', 'looks',
    'considers', 'discusses', 'reveals', 'explains'
  ]
};

export class CryptoNewsScraper {
  private webOperator = getWebOperator(true); // Headless for scraping
  private selfCorrector = getSelfCorrector();
  private kb = getKnowledgeBase();
  private playbookSystem = getPlaybookSystem();
  private whatsappClient = new WhatsAppClient();
  private sessionId: string | null = null;

  /**
   * Scrape top crypto news articles
   */
  async scrapeTopNews(
    source: 'coindesk' | 'decrypt' = 'coindesk',
    count: number = 3
  ): Promise<ScraperResult> {
    const config = SCRAPER_CONFIGS[source];
    let selfEvolved = false;
    let evolutionDetails: string | undefined;

    // Check for existing playbook
    const existingPlaybook = this.playbookSystem.findPlaybook(
      'web_scraping',
      `Scrape ${config.name} news`,
      'crypto'
    );

    if (existingPlaybook) {
      console.log(`Using existing playbook: ${existingPlaybook.id}`);
    }

    try {
      // Launch browser
      const launchResult = await this.webOperator.launchBrowser();
      if (!launchResult.success) {
        throw new Error(`Failed to launch browser: ${launchResult.message}`);
      }
      this.sessionId = launchResult.sessionId!;

      // Navigate to news site
      const navResult = await this.webOperator.navigate(this.sessionId, config.url, {
        waitForLoad: true
      });

      if (!navResult.success) {
        throw new Error(`Failed to navigate: ${navResult.error}`);
      }

      // Wait for page to load
      await this.sleep(config.waitTime);

      // Take initial screenshot
      const screenshotResult = await this.webOperator.takeScreenshot(this.sessionId, {
        name: `${source}-initial`,
        fullPage: false
      });

      // Try to extract articles using multiple selector strategies
      let articles: NewsArticle[] = [];
      let usedSelector: string = '';

      for (const containerSelector of config.selectors.articleContainers) {
        try {
          articles = await this.extractArticles(containerSelector, config.selectors.titleSelectors, count);

          if (articles.length > 0) {
            usedSelector = containerSelector;
            console.log(`Successfully extracted ${articles.length} articles using selector: ${containerSelector}`);
            break;
          }
        } catch (error) {
          console.log(`Selector "${containerSelector}" failed, trying next...`);
        }
      }

      // If all selectors failed, attempt self-evolution
      if (articles.length === 0) {
        console.log('All predefined selectors failed. Attempting self-evolution...');

        const pageContent = await this.webOperator.getPageContent(this.sessionId, 'html');

        const failure: PlaywrightFailure = {
          action: 'scrape',
          selector: config.selectors.articleContainers[0],
          url: config.url,
          errorMessage: 'No articles found using predefined selectors',
          pageContent: pageContent.content
        };

        const correctionResult = await this.selfCorrector.analyzeAndCorrect(failure);

        if (correctionResult.success && correctionResult.proposedFix) {
          selfEvolved = true;
          evolutionDetails = correctionResult.message;

          // Try the evolved selector
          if (correctionResult.proposedFix.codeChanges.length > 0) {
            const newSelector = correctionResult.proposedFix.codeChanges[0].replace;
            articles = await this.extractArticles(newSelector, config.selectors.titleSelectors, count);
          }
        }

        // If still no articles, try heuristic extraction
        if (articles.length === 0) {
          articles = await this.heuristicExtraction(pageContent.content || '', count);

          if (articles.length > 0) {
            selfEvolved = true;
            evolutionDetails = 'Used heuristic extraction from page content';
          }
        }
      }

      // Add sentiment analysis to articles
      for (const article of articles) {
        article.sentiment = this.analyzeSentiment(article.title);
      }

      // Take final screenshot
      const finalScreenshot = await this.webOperator.takeScreenshot(this.sessionId, {
        name: `${source}-final`,
        fullPage: false
      });

      // Save successful scrape as playbook if not using one
      if (!existingPlaybook && articles.length > 0) {
        this.createScraperPlaybook(source, config, usedSelector);
      }

      // Record execution
      if (existingPlaybook) {
        await this.playbookSystem.recordExecution({
          playbookId: existingPlaybook.id,
          success: articles.length > 0,
          stepsCompleted: articles.length > 0 ? 3 : 2,
          totalSteps: 3,
          duration: Date.now(),
          failedStep: articles.length === 0 ? 2 : undefined,
          error: articles.length === 0 ? 'No articles extracted' : undefined
        });
      }

      // Save lesson
      this.kb.saveLesson({
        task_type: 'web_scraping',
        task_description: `Scraped ${config.name} for crypto news`,
        success: articles.length > 0,
        solution: usedSelector ? `Working selector: ${usedSelector}` : undefined,
        lesson_summary: `Extracted ${articles.length} articles from ${config.name}` +
          (selfEvolved ? ' (with self-evolution)' : ''),
        category: 'crypto_news'
      });

      // Report to WhatsApp
      await this.reportResults(source, articles, selfEvolved, evolutionDetails);

      return {
        success: articles.length > 0,
        source: config.name,
        articles,
        screenshot: finalScreenshot.path,
        selfEvolved,
        evolutionDetails
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log failure
      this.kb.saveLesson({
        task_type: 'web_scraping',
        task_description: `Failed to scrape ${config.name}`,
        success: false,
        error_message: errorMessage,
        lesson_summary: `Scraping failed: ${errorMessage.substring(0, 100)}`,
        category: 'crypto_news'
      });

      return {
        success: false,
        source: config.name,
        articles: [],
        selfEvolved: false,
        error: errorMessage
      };

    } finally {
      // Cleanup
      if (this.sessionId) {
        await this.webOperator.closeBrowser(this.sessionId);
        this.sessionId = null;
      }
    }
  }

  /**
   * Extract articles using given selectors
   */
  private async extractArticles(
    containerSelector: string,
    titleSelectors: string[],
    count: number
  ): Promise<NewsArticle[]> {
    if (!this.sessionId) {
      throw new Error('No active browser session');
    }

    const page = (this.webOperator as unknown as { getPage(id: string): unknown }).getPage?.(this.sessionId);

    if (!page) {
      // Fallback to page content extraction
      const content = await this.webOperator.getPageContent(this.sessionId, 'html');
      return this.heuristicExtraction(content.content || '', count);
    }

    const articles: NewsArticle[] = [];

    try {
      // Use evaluate to extract articles in browser context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractedData = await (page as any).evaluate(() => {
        const results: Array<{ title: string; url?: string }> = [];

        // Try multiple strategies
        // Strategy 1: Look for article/heading elements
        // @ts-ignore - document is available in browser context
        const headings = (window as any).document.querySelectorAll('h2, h3, [class*="title"], [class*="headline"]');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        headings.forEach((heading: any) => {
          const text = heading.textContent?.trim();
          if (text && text.length > 20 && text.length < 200) {
            const link = heading.closest?.('a') || heading.querySelector?.('a');
            results.push({
              title: text,
              url: link?.getAttribute?.('href') || undefined
            });
          }
        });

        return results.slice(0, 10);
      });

      const data = extractedData as Array<{ title: string; url?: string }>;

      for (let i = 0; i < Math.min(count, data.length); i++) {
        if (data[i].title) {
          articles.push({
            title: data[i].title,
            url: data[i].url,
            sentiment: { score: 0, label: 'NEUTRAL', keywords: [] }
          });
        }
      }
    } catch (error) {
      console.error('Article extraction error:', error);
    }

    return articles;
  }

  /**
   * Heuristic extraction from raw HTML
   */
  private heuristicExtraction(html: string, count: number): NewsArticle[] {
    const articles: NewsArticle[] = [];

    // Extract text from h2/h3 tags
    const headingPattern = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
    const matches = html.matchAll(headingPattern);

    for (const match of matches) {
      const title = this.cleanText(match[1]);

      // Filter out navigation/UI elements
      if (
        title.length > 20 &&
        title.length < 200 &&
        !this.isNavigationText(title)
      ) {
        articles.push({
          title,
          sentiment: { score: 0, label: 'NEUTRAL', keywords: [] }
        });

        if (articles.length >= count) break;
      }
    }

    // If not enough from headings, try links with long text
    if (articles.length < count) {
      const linkPattern = /<a[^>]+href="([^"]*)"[^>]*>([^<]{30,150})<\/a>/gi;
      const linkMatches = html.matchAll(linkPattern);

      for (const match of linkMatches) {
        const title = this.cleanText(match[2]);
        const url = match[1];

        if (
          title.length > 20 &&
          !this.isNavigationText(title) &&
          !articles.some(a => a.title === title)
        ) {
          articles.push({
            title,
            url,
            sentiment: { score: 0, label: 'NEUTRAL', keywords: [] }
          });

          if (articles.length >= count) break;
        }
      }
    }

    return articles;
  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if text is likely navigation/UI element
   */
  private isNavigationText(text: string): boolean {
    const navKeywords = [
      'menu', 'navigation', 'search', 'login', 'sign up', 'subscribe',
      'newsletter', 'contact', 'about', 'privacy', 'terms', 'cookie',
      'more stories', 'read more', 'see all', 'load more'
    ];

    const lower = text.toLowerCase();
    return navKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Analyze sentiment of a news title
   */
  analyzeSentiment(title: string): NewsArticle['sentiment'] {
    const lower = title.toLowerCase();
    const foundKeywords: string[] = [];

    let positiveCount = 0;
    let negativeCount = 0;

    // Count positive keywords
    for (const keyword of SENTIMENT_KEYWORDS.positive) {
      if (lower.includes(keyword)) {
        positiveCount++;
        foundKeywords.push(keyword);
      }
    }

    // Count negative keywords
    for (const keyword of SENTIMENT_KEYWORDS.negative) {
      if (lower.includes(keyword)) {
        negativeCount++;
        foundKeywords.push(keyword);
      }
    }

    // Calculate score
    const total = positiveCount + negativeCount;
    let score = 0;

    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
    }

    // Determine label
    let label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    if (score > 0.2) {
      label = 'POSITIVE';
    } else if (score < -0.2) {
      label = 'NEGATIVE';
    } else {
      label = 'NEUTRAL';
    }

    return {
      score: Math.round(score * 100) / 100,
      label,
      keywords: foundKeywords
    };
  }

  /**
   * Create a playbook for successful scraping
   */
  private createScraperPlaybook(
    source: string,
    config: typeof SCRAPER_CONFIGS.coindesk,
    workingSelector: string
  ): void {
    this.playbookSystem.createPlaybook(
      `Scrape ${config.name} News`,
      `Extract top news articles from ${config.name}`,
      ['web_scraping', 'crypto_news'],
      ['crypto', 'news', 'bitcoin', 'ethereum', source],
      [
        {
          action: 'launch_browser',
          tool: 'web_operator',
          args: { headless: true },
          expectedOutcome: 'Browser launched',
          onFailure: 'abort'
        },
        {
          action: 'navigate',
          tool: 'web_operator',
          args: { url: config.url, wait_for_load: true },
          expectedOutcome: 'Page loaded',
          onFailure: 'retry',
          maxRetries: 2
        },
        {
          action: 'extract_articles',
          tool: 'crypto_scraper',
          args: {
            selector: workingSelector,
            count: 3
          },
          expectedOutcome: 'Articles extracted',
          onFailure: 'human_review'
        }
      ],
      'crypto'
    );
  }

  /**
   * Report results to WhatsApp
   */
  private async reportResults(
    source: string,
    articles: NewsArticle[],
    selfEvolved: boolean,
    evolutionDetails?: string
  ): Promise<void> {
    if (articles.length === 0) return;

    let message = `Crypto News Update (${source})\n\n`;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const sentimentEmoji = {
        POSITIVE: '+',
        NEGATIVE: '-',
        NEUTRAL: '~'
      }[article.sentiment.label];

      message += `${i + 1}. [${sentimentEmoji}] ${article.title}\n`;
      if (article.sentiment.keywords.length > 0) {
        message += `   Keywords: ${article.sentiment.keywords.join(', ')}\n`;
      }
    }

    if (selfEvolved) {
      message += `\nSelf-Evolution: ${evolutionDetails}`;
    }

    try {
      await this.whatsappClient.logCommand(
        `Crypto News (${source})`,
        'GREEN',
        message
      );
    } catch (error) {
      console.error('Failed to send WhatsApp report:', error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let cryptoScraperInstance: CryptoNewsScraper | null = null;

export function getCryptoNewsScraper(): CryptoNewsScraper {
  if (!cryptoScraperInstance) {
    cryptoScraperInstance = new CryptoNewsScraper();
  }
  return cryptoScraperInstance;
}
