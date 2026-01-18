/**
 * Browser Guard - URL Safety for Web Operator
 *
 * Extends the Execution Guard to handle browser navigation safety.
 * Blocks dangerous, financial, and sensitive sites unless authorized.
 */

export type UrlRiskLevel = 'SAFE' | 'CAUTION' | 'RESTRICTED' | 'BLOCKED';

export interface UrlClassification {
  url: string;
  level: UrlRiskLevel;
  reason: string;
  requiresApproval: boolean;
  category: string;
}

// Blocked domains - NEVER navigate
const BLOCKED_DOMAINS = [
  // Malware and phishing indicators
  'bit.ly',       // URL shorteners often used for phishing
  'tinyurl.com',
  'goo.gl',
  // Known malicious patterns
  'download-',
  'free-',
  '-crack',
  '-keygen',
  // Sensitive system URLs
  'localhost:',
  '127.0.0.1',
  '0.0.0.0',
  '192.168.',
  '10.0.',
  '172.16.',
];

// Restricted domains - require approval
const RESTRICTED_DOMAINS = [
  // Financial
  'paypal.com',
  'stripe.com',
  'bank',
  'chase.com',
  'wellsfargo.com',
  'bankofamerica.com',
  'citibank.com',
  'hsbc.com',
  'credit',
  'loan',
  'invest',
  'trading',
  'crypto',
  'bitcoin',
  'ethereum',
  'binance.com',
  'coinbase.com',

  // Authentication & Credentials
  'login.',
  'signin.',
  'auth.',
  'oauth',
  'accounts.google.com',
  'login.microsoft.com',
  'github.com/login',
  'gitlab.com/users/sign_in',

  // Social Media (potential for unintended posts)
  'twitter.com/compose',
  'facebook.com/posts',
  'linkedin.com/feed',
  'instagram.com',

  // Admin panels
  'admin.',
  'dashboard.',
  'console.',
  'portal.',
  'cpanel.',
  'plesk.',

  // Cloud providers (production access)
  'console.aws.amazon.com',
  'portal.azure.com',
  'console.cloud.google.com',

  // Government & Legal
  '.gov',
  '.mil',

  // Adult content
  'xxx',
  'porn',
  'adult',
];

// Caution domains - execute but log
const CAUTION_DOMAINS = [
  // E-commerce (potential for accidental purchases)
  'amazon.com',
  'ebay.com',
  'alibaba.com',
  'walmart.com',
  'checkout',
  'cart',
  'payment',

  // Form submissions
  'forms.google.com',
  'typeform.com',
  'surveymonkey.com',

  // File downloads
  'download',
  '.exe',
  '.msi',
  '.zip',
  '.rar',

  // Communication (potential for unintended messages)
  'mail.google.com',
  'outlook.com',
  'slack.com',
  'discord.com',
  'teams.microsoft.com',
];

// Safe domains - auto-navigate
const SAFE_DOMAINS = [
  // Search engines
  'google.com/search',
  'bing.com/search',
  'duckduckgo.com',

  // Documentation
  'docs.',
  'documentation.',
  'developer.',
  'devdocs.io',
  'mdn.io',
  'stackoverflow.com',
  'github.com',
  'gitlab.com',
  'npmjs.com',
  'pypi.org',

  // Reference
  'wikipedia.org',
  'wikimedia.org',

  // News & Learning
  'medium.com',
  'dev.to',
  'hackernews',
  'reddit.com',

  // Development tools
  'codepen.io',
  'jsfiddle.net',
  'replit.com',
  'codesandbox.io',
];

export class BrowserGuard {
  private customAllowList: string[] = [];
  private customBlockList: string[] = [];

  /**
   * Classify a URL for navigation safety
   */
  classifyUrl(url: string): UrlClassification {
    const lowerUrl = url.toLowerCase();

    // Parse URL to get domain
    let domain = '';
    try {
      const parsed = new URL(url);
      domain = parsed.hostname.toLowerCase();
    } catch {
      // Invalid URL
      return {
        url,
        level: 'BLOCKED',
        reason: 'Invalid URL format',
        requiresApproval: false,
        category: 'invalid'
      };
    }

    // Check custom block list first
    if (this.customBlockList.some(d => domain.includes(d) || lowerUrl.includes(d))) {
      return {
        url,
        level: 'BLOCKED',
        reason: 'URL is in custom block list',
        requiresApproval: false,
        category: 'custom_blocked'
      };
    }

    // Check custom allow list
    if (this.customAllowList.some(d => domain.includes(d) || lowerUrl.includes(d))) {
      return {
        url,
        level: 'SAFE',
        reason: 'URL is in custom allow list',
        requiresApproval: false,
        category: 'custom_allowed'
      };
    }

    // Check blocked domains
    for (const blocked of BLOCKED_DOMAINS) {
      if (domain.includes(blocked) || lowerUrl.includes(blocked)) {
        return {
          url,
          level: 'BLOCKED',
          reason: `Blocked pattern: ${blocked}`,
          requiresApproval: false,
          category: 'security'
        };
      }
    }

    // Check restricted domains
    for (const restricted of RESTRICTED_DOMAINS) {
      if (domain.includes(restricted) || lowerUrl.includes(restricted)) {
        return {
          url,
          level: 'RESTRICTED',
          reason: `Restricted pattern: ${restricted}`,
          requiresApproval: true,
          category: this.categorizeRestricted(restricted)
        };
      }
    }

    // Check caution domains
    for (const caution of CAUTION_DOMAINS) {
      if (domain.includes(caution) || lowerUrl.includes(caution)) {
        return {
          url,
          level: 'CAUTION',
          reason: `Caution pattern: ${caution}`,
          requiresApproval: false,
          category: this.categorizeCaution(caution)
        };
      }
    }

    // Check safe domains
    for (const safe of SAFE_DOMAINS) {
      if (domain.includes(safe) || lowerUrl.includes(safe)) {
        return {
          url,
          level: 'SAFE',
          reason: `Known safe domain: ${safe}`,
          requiresApproval: false,
          category: 'safe'
        };
      }
    }

    // Default: CAUTION for unknown URLs
    return {
      url,
      level: 'CAUTION',
      reason: 'Unknown domain - proceeding with caution',
      requiresApproval: false,
      category: 'unknown'
    };
  }

  /**
   * Check if navigation is allowed
   */
  isNavigationAllowed(url: string): { allowed: boolean; reason: string; requiresApproval: boolean } {
    const classification = this.classifyUrl(url);

    if (classification.level === 'BLOCKED') {
      return {
        allowed: false,
        reason: classification.reason,
        requiresApproval: false
      };
    }

    if (classification.level === 'RESTRICTED') {
      return {
        allowed: false,
        reason: classification.reason,
        requiresApproval: true
      };
    }

    return {
      allowed: true,
      reason: classification.reason,
      requiresApproval: false
    };
  }

  /**
   * Add a domain to the allow list
   */
  addToAllowList(domain: string): void {
    if (!this.customAllowList.includes(domain.toLowerCase())) {
      this.customAllowList.push(domain.toLowerCase());
    }
  }

  /**
   * Add a domain to the block list
   */
  addToBlockList(domain: string): void {
    if (!this.customBlockList.includes(domain.toLowerCase())) {
      this.customBlockList.push(domain.toLowerCase());
    }
  }

  /**
   * Temporarily allow a restricted domain (after approval)
   */
  temporarilyAllow(domain: string): void {
    this.addToAllowList(domain);
    // Remove from allow list after 30 minutes
    setTimeout(() => {
      this.customAllowList = this.customAllowList.filter(d => d !== domain.toLowerCase());
    }, 30 * 60 * 1000);
  }

  private categorizeRestricted(pattern: string): string {
    if (['paypal', 'stripe', 'bank', 'credit', 'invest', 'crypto', 'bitcoin'].some(p => pattern.includes(p))) {
      return 'financial';
    }
    if (['login', 'signin', 'auth', 'accounts'].some(p => pattern.includes(p))) {
      return 'authentication';
    }
    if (['admin', 'dashboard', 'console', 'portal'].some(p => pattern.includes(p))) {
      return 'admin';
    }
    if (['aws', 'azure', 'cloud.google'].some(p => pattern.includes(p))) {
      return 'cloud_provider';
    }
    if (['.gov', '.mil'].some(p => pattern.includes(p))) {
      return 'government';
    }
    return 'restricted';
  }

  private categorizeCaution(pattern: string): string {
    if (['amazon', 'ebay', 'alibaba', 'checkout', 'cart', 'payment'].some(p => pattern.includes(p))) {
      return 'ecommerce';
    }
    if (['mail', 'outlook', 'slack', 'discord', 'teams'].some(p => pattern.includes(p))) {
      return 'communication';
    }
    if (['download', '.exe', '.msi', '.zip'].some(p => pattern.includes(p))) {
      return 'download';
    }
    return 'caution';
  }
}

// Singleton instance
let browserGuardInstance: BrowserGuard | null = null;

export function getBrowserGuard(): BrowserGuard {
  if (!browserGuardInstance) {
    browserGuardInstance = new BrowserGuard();
  }
  return browserGuardInstance;
}
