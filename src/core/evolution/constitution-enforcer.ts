/**
 * Constitution Enforcer
 *
 * Enforces the SEASP Security Constitution:
 * - Protects immutable core (guard, config)
 * - Validates code against forbidden patterns
 * - Ensures network whitelist compliance
 */

import { readFileSync, existsSync } from 'fs';
import { join, normalize, relative } from 'path';
import { WhatsAppClient } from '../bridge/whatsapp-client.js';

interface ForbiddenPattern {
  name: string;
  regex: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

interface SecurityConstitution {
  immutableCore: {
    paths: string[];
    operations: Record<string, boolean>;
  };
  mutableLayers: {
    paths: string[];
    operations: Record<string, boolean>;
    constraints: Record<string, boolean>;
  };
  forbiddenPatterns: {
    patterns: ForbiddenPattern[];
  };
  networkWhitelist: {
    allowed: string[];
    requiresApproval: string[];
  };
  selfEvolution: {
    commitPrefix: string;
    requiresSanityCheck: boolean;
    rollbackOnFailure: boolean;
    maxAutoRetries: number;
    accuracyThreshold: number;
    cooldownPeriod: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  violations: Array<{
    pattern: string;
    severity: string;
    reason: string;
    line?: number;
    match?: string;
  }>;
}

export interface PathAccessResult {
  allowed: boolean;
  reason: string;
  isImmutable: boolean;
  requiresValidation: boolean;
}

export class ConstitutionEnforcer {
  private constitution: SecurityConstitution;
  private projectRoot: string;
  private whatsappClient: WhatsAppClient;
  private compiledPatterns: Map<string, RegExp> = new Map();

  constructor(constitutionPath?: string) {
    this.projectRoot = process.cwd();
    const configPath = constitutionPath || join(this.projectRoot, 'config', 'security-constitution.json');

    if (!existsSync(configPath)) {
      throw new Error('Security Constitution not found. Agent cannot operate without security rules.');
    }

    const content = readFileSync(configPath, 'utf-8');
    this.constitution = JSON.parse(content);
    this.whatsappClient = new WhatsAppClient();

    // Pre-compile regex patterns for performance
    this.compilePatterns();
  }

  private compilePatterns(): void {
    for (const pattern of this.constitution.forbiddenPatterns.patterns) {
      try {
        this.compiledPatterns.set(pattern.name, new RegExp(pattern.regex, 'gi'));
      } catch (e) {
        console.error(`Failed to compile pattern ${pattern.name}: ${e}`);
      }
    }
  }

  /**
   * Check if a path operation is allowed
   */
  checkPathAccess(
    targetPath: string,
    operation: 'read' | 'write' | 'delete' | 'execute'
  ): PathAccessResult {
    const normalizedPath = normalize(targetPath);
    const relativePath = relative(this.projectRoot, normalizedPath);

    // Check if path is in immutable core
    for (const immutablePattern of this.constitution.immutableCore.paths) {
      if (this.pathMatchesPattern(relativePath, immutablePattern)) {
        const allowed = this.constitution.immutableCore.operations[operation] || false;

        if (!allowed) {
          // Report attempt to modify immutable core
          this.reportIncident('immutable_access_attempt', {
            path: relativePath,
            operation,
            pattern: immutablePattern
          });
        }

        return {
          allowed,
          reason: allowed
            ? 'Operation allowed on immutable core'
            : `BLOCKED: ${operation} on immutable core is forbidden (${immutablePattern})`,
          isImmutable: true,
          requiresValidation: false
        };
      }
    }

    // Check if path is in mutable layers
    for (const mutablePattern of this.constitution.mutableLayers.paths) {
      if (this.pathMatchesPattern(relativePath, mutablePattern)) {
        return {
          allowed: true,
          reason: 'Operation allowed on mutable layer',
          isImmutable: false,
          requiresValidation: this.constitution.mutableLayers.constraints.requiresValidation
        };
      }
    }

    // Path not in any defined layer - default to restrictive
    return {
      allowed: false,
      reason: 'Path not in authorized layers',
      isImmutable: false,
      requiresValidation: true
    };
  }

  /**
   * Validate code for forbidden patterns
   */
  validateCode(code: string, filename?: string): ValidationResult {
    const violations: ValidationResult['violations'] = [];
    const lines = code.split('\n');

    for (const pattern of this.constitution.forbiddenPatterns.patterns) {
      const regex = this.compiledPatterns.get(pattern.name);
      if (!regex) continue;

      // Check each line for violations
      lines.forEach((line, lineIndex) => {
        regex.lastIndex = 0; // Reset regex state
        const match = regex.exec(line);

        if (match) {
          violations.push({
            pattern: pattern.name,
            severity: pattern.severity,
            reason: pattern.reason,
            line: lineIndex + 1,
            match: match[0].substring(0, 50)
          });
        }
      });
    }

    // Report if critical violations found
    if (violations.some(v => v.severity === 'critical')) {
      this.reportIncident('forbidden_pattern_detected', {
        filename,
        violations: violations.filter(v => v.severity === 'critical')
      });
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Check if a URL is in the network whitelist
   */
  checkNetworkAccess(url: string): {
    allowed: boolean;
    requiresApproval: boolean;
    reason: string;
  } {
    let hostname: string;
    try {
      hostname = new URL(url).hostname.toLowerCase();
    } catch {
      return {
        allowed: false,
        requiresApproval: false,
        reason: 'Invalid URL'
      };
    }

    // Check allowed list
    for (const allowed of this.constitution.networkWhitelist.allowed) {
      if (hostname === allowed.toLowerCase() || hostname.endsWith('.' + allowed.toLowerCase())) {
        return {
          allowed: true,
          requiresApproval: false,
          reason: `Domain ${hostname} is whitelisted`
        };
      }
    }

    // Check requires approval list
    for (const pattern of this.constitution.networkWhitelist.requiresApproval) {
      const regexPattern = pattern.replace('*.', '.*\\.');
      if (new RegExp(regexPattern, 'i').test(hostname)) {
        return {
          allowed: false,
          requiresApproval: true,
          reason: `Domain ${hostname} requires approval`
        };
      }
    }

    // Default: not allowed
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Domain ${hostname} is not in whitelist`
    };
  }

  /**
   * Get self-evolution configuration
   */
  getSelfEvolutionConfig(): SecurityConstitution['selfEvolution'] {
    return { ...this.constitution.selfEvolution };
  }

  /**
   * Get the commit prefix for self-improvement commits
   */
  getCommitPrefix(): string {
    return this.constitution.selfEvolution.commitPrefix;
  }

  /**
   * Get accuracy threshold (failure rate that triggers review)
   */
  getAccuracyThreshold(): number {
    return this.constitution.selfEvolution.accuracyThreshold;
  }

  /**
   * Report a security incident via WhatsApp
   */
  async reportIncident(
    eventType: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const message = this.formatIncidentMessage(eventType, details);

    try {
      await this.whatsappClient.logCommand(
        `Security Event: ${eventType}`,
        eventType.includes('critical') || eventType.includes('forbidden') ? 'RED' : 'YELLOW',
        message
      );
    } catch (error) {
      console.error('Failed to report incident:', error);
    }
  }

  private formatIncidentMessage(eventType: string, details: Record<string, unknown>): string {
    const emoji = {
      self_improvement_attempt: '🔧',
      self_improvement_success: '✅',
      self_improvement_failure: '❌',
      accuracy_threshold_violation: '📉',
      forbidden_pattern_detected: '🚫',
      immutable_access_attempt: '🔒',
      auto_rollback_triggered: '⏪'
    }[eventType] || '⚠️';

    return `${emoji} ${eventType.replace(/_/g, ' ').toUpperCase()}\n\n` +
      JSON.stringify(details, null, 2).substring(0, 500);
  }

  private pathMatchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\\/g, '/')
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLE_STAR___/g, '.*');

    const normalizedPath = path.replace(/\\/g, '/');
    return new RegExp(`^${regexPattern}$`).test(normalizedPath);
  }

  /**
   * Validate a file before it's written
   * Returns true if the write should proceed
   */
  async validateFileWrite(
    targetPath: string,
    content: string
  ): Promise<{ allowed: boolean; reason: string }> {
    // Check path access
    const pathAccess = this.checkPathAccess(targetPath, 'write');
    if (!pathAccess.allowed) {
      return { allowed: false, reason: pathAccess.reason };
    }

    // If validation required and it's a code file, validate content
    if (pathAccess.requiresValidation && this.isCodeFile(targetPath)) {
      const validation = this.validateCode(content, targetPath);

      if (!validation.valid) {
        const criticalViolations = validation.violations.filter(v => v.severity === 'critical');

        if (criticalViolations.length > 0) {
          return {
            allowed: false,
            reason: `Forbidden patterns detected: ${criticalViolations.map(v => v.pattern).join(', ')}`
          };
        }

        // Non-critical violations: warn but allow
        console.warn('Code validation warnings:', validation.violations);
      }
    }

    return { allowed: true, reason: 'Validation passed' };
  }

  private isCodeFile(path: string): boolean {
    const codeExtensions = ['.ts', '.js', '.mjs', '.cjs', '.tsx', '.jsx', '.py', '.sh', '.ps1', '.bat', '.cmd'];
    return codeExtensions.some(ext => path.toLowerCase().endsWith(ext));
  }
}

// Singleton instance
let enforcerInstance: ConstitutionEnforcer | null = null;

export function getConstitutionEnforcer(): ConstitutionEnforcer {
  if (!enforcerInstance) {
    enforcerInstance = new ConstitutionEnforcer();
  }
  return enforcerInstance;
}
