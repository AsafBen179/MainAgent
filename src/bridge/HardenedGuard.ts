/**
 * Hardened Execution Guard
 *
 * Enhanced version of CommandClassifier that:
 * 1. Checks persona-specific policy BEFORE global policy
 * 2. Persona policy always prevails over global policy
 * 3. Even if a command is GREEN globally, persona policy can block it
 */

import fs from 'fs';
import path from 'path';
import appLogger from '../utils/logger';
import { GroupPersonaMapper } from './GroupPersonaMapper';

const logger = appLogger.child({ component: 'HardenedGuard' });

export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED' | 'BLACKLISTED';

export interface ClassificationResult {
  level: RiskLevel;
  command: string;
  reason: string;
  matchedPattern?: string;
  requiresApproval: boolean;
  autoExecute: boolean;
  logToWhatsApp: boolean;
  persona?: string;
  policyUsed: string;
}

interface GuardPolicy {
  policyName?: string;
  description?: string;
  blacklist: {
    patterns: string[];
    executables: string[];
  };
  classification: {
    green: {
      patterns: string[];
      allowedPaths: string[];
    };
    yellow: {
      patterns: string[];
    };
    red: {
      patterns: string[];
      requiresApproval: boolean;
      approvalTimeout: number;
    };
  };
}

interface CompiledPolicy {
  name: string;
  blacklistPatterns: RegExp[];
  blacklistExecutables: string[];
  greenPatterns: RegExp[];
  yellowPatterns: RegExp[];
  redPatterns: RegExp[];
  approvalTimeout: number;
}

export class HardenedGuard {
  private globalPolicy: CompiledPolicy;
  private personaPolicies: Map<string, CompiledPolicy> = new Map();
  private personaMapper: GroupPersonaMapper;
  private configDir: string;

  constructor(personaMapper: GroupPersonaMapper, configDir?: string) {
    this.personaMapper = personaMapper;
    this.configDir = configDir || path.join(process.cwd(), 'config');

    // Load global policy
    this.globalPolicy = this.loadAndCompilePolicy('guard_policy.json', 'default');

    // Load persona-specific policies
    this.loadPersonaPolicies();

    logger.info('HardenedGuard initialized', {
      globalPolicy: this.globalPolicy.name,
      personaPolicies: Array.from(this.personaPolicies.keys())
    });
  }

  /**
   * Load and compile a policy from JSON file
   */
  private loadAndCompilePolicy(filename: string, policyName: string): CompiledPolicy {
    const policyPath = path.join(this.configDir, filename);

    if (!fs.existsSync(policyPath)) {
      logger.warn(`Policy file not found: ${filename}, using empty policy`);
      return this.createEmptyPolicy(policyName);
    }

    try {
      const content = fs.readFileSync(policyPath, 'utf-8');
      const policy: GuardPolicy = JSON.parse(content);

      return {
        name: policy.policyName || policyName,
        blacklistPatterns: policy.blacklist.patterns.map(p => new RegExp(p, 'i')),
        blacklistExecutables: policy.blacklist.executables,
        greenPatterns: policy.classification.green.patterns.map(p => new RegExp(p, 'i')),
        yellowPatterns: policy.classification.yellow.patterns.map(p => new RegExp(p, 'i')),
        redPatterns: policy.classification.red.patterns.map(p => new RegExp(p, 'i')),
        approvalTimeout: policy.classification.red.approvalTimeout || 300
      };
    } catch (error) {
      logger.error(`Failed to load policy: ${filename}`, { error: (error as Error).message });
      return this.createEmptyPolicy(policyName);
    }
  }

  /**
   * Create an empty/default policy
   */
  private createEmptyPolicy(name: string): CompiledPolicy {
    return {
      name,
      blacklistPatterns: [],
      blacklistExecutables: [],
      greenPatterns: [],
      yellowPatterns: [],
      redPatterns: [],
      approvalTimeout: 300
    };
  }

  /**
   * Load all persona-specific policies
   */
  private loadPersonaPolicies(): void {
    const personas = this.personaMapper.getAllPersonas();

    for (const [personaId, config] of personas) {
      const policyName = config.guardPolicy;

      // Skip if it's the default policy (use global)
      if (policyName === 'default') {
        continue;
      }

      const filename = `guard_policy_${policyName}.json`;
      const compiledPolicy = this.loadAndCompilePolicy(filename, policyName);
      this.personaPolicies.set(personaId, compiledPolicy);

      logger.debug(`Loaded persona policy: ${personaId} -> ${policyName}`);
    }
  }

  /**
   * Classify a command with persona-specific policy
   * IMPORTANT: Persona policy ALWAYS prevails over global policy
   */
  classifyWithPersona(command: string, persona: string): ClassificationResult {
    const normalizedCommand = command.trim();

    // Get persona-specific policy (if exists)
    const personaPolicy = this.personaPolicies.get(persona);

    // STEP 1: Check persona blacklist FIRST (if persona has specific policy)
    if (personaPolicy) {
      const personaBlacklistResult = this.checkBlacklist(normalizedCommand, personaPolicy);
      if (personaBlacklistResult) {
        logger.warn('Command blocked by persona policy', {
          command: normalizedCommand.substring(0, 50),
          persona,
          policy: personaPolicy.name,
          pattern: personaBlacklistResult
        });

        return {
          level: 'BLACKLISTED',
          command: normalizedCommand,
          reason: `Blocked by ${persona} persona policy: ${personaBlacklistResult}`,
          matchedPattern: personaBlacklistResult,
          requiresApproval: false,
          autoExecute: false,
          logToWhatsApp: true,
          persona,
          policyUsed: personaPolicy.name
        };
      }
    }

    // STEP 2: Check global blacklist
    const globalBlacklistResult = this.checkBlacklist(normalizedCommand, this.globalPolicy);
    if (globalBlacklistResult) {
      return {
        level: 'BLACKLISTED',
        command: normalizedCommand,
        reason: `Command matches global blacklist: ${globalBlacklistResult}`,
        matchedPattern: globalBlacklistResult,
        requiresApproval: false,
        autoExecute: false,
        logToWhatsApp: true,
        persona,
        policyUsed: 'global'
      };
    }

    // STEP 3: Classify using persona policy first (more restrictive)
    if (personaPolicy) {
      const personaClassification = this.classifyWithPolicy(normalizedCommand, personaPolicy, persona);

      // If persona policy says RED or BLACKLISTED, that's final
      if (personaClassification.level === 'RED' || personaClassification.level === 'BLACKLISTED') {
        return personaClassification;
      }

      // If persona policy says YELLOW, that's also respected
      if (personaClassification.level === 'YELLOW') {
        return personaClassification;
      }

      // Only GREEN in persona policy continues to global check
      // But persona GREEN doesn't automatically mean global GREEN
    }

    // STEP 4: Use global policy classification
    const globalClassification = this.classifyWithPolicy(normalizedCommand, this.globalPolicy, persona);

    // STEP 5: If persona has a policy and global says GREEN, recheck with persona
    // This ensures persona restrictions are respected even for globally safe commands
    if (personaPolicy && globalClassification.level === 'GREEN') {
      const personaCheck = this.classifyWithPolicy(normalizedCommand, personaPolicy, persona);

      // If persona doesn't have a pattern for this (returns default YELLOW), use that
      if (personaCheck.policyUsed !== 'global') {
        return personaCheck;
      }
    }

    return globalClassification;
  }

  /**
   * Check if command matches any blacklist pattern
   */
  private checkBlacklist(command: string, policy: CompiledPolicy): string | null {
    const lowerCommand = command.toLowerCase();

    // Check pattern blacklist
    for (const pattern of policy.blacklistPatterns) {
      if (pattern.test(command)) {
        return pattern.source;
      }
    }

    // Check executable blacklist
    for (const exe of policy.blacklistExecutables) {
      if (lowerCommand.includes(exe.toLowerCase())) {
        return exe;
      }
    }

    return null;
  }

  /**
   * Classify command using a specific policy
   */
  private classifyWithPolicy(
    command: string,
    policy: CompiledPolicy,
    persona: string
  ): ClassificationResult {
    // Check RED patterns
    const redMatch = this.matchPatterns(command, policy.redPatterns);
    if (redMatch) {
      return {
        level: 'RED',
        command,
        reason: `Critical operation in ${policy.name} policy - requires approval`,
        matchedPattern: redMatch.source,
        requiresApproval: true,
        autoExecute: false,
        logToWhatsApp: true,
        persona,
        policyUsed: policy.name
      };
    }

    // Check YELLOW patterns
    const yellowMatch = this.matchPatterns(command, policy.yellowPatterns);
    if (yellowMatch) {
      return {
        level: 'YELLOW',
        command,
        reason: `Sensitive operation in ${policy.name} policy - will be logged`,
        matchedPattern: yellowMatch.source,
        requiresApproval: false,
        autoExecute: true,
        logToWhatsApp: true,
        persona,
        policyUsed: policy.name
      };
    }

    // Check GREEN patterns
    const greenMatch = this.matchPatterns(command, policy.greenPatterns);
    if (greenMatch) {
      return {
        level: 'GREEN',
        command,
        reason: `Safe operation in ${policy.name} policy`,
        matchedPattern: greenMatch.source,
        requiresApproval: false,
        autoExecute: true,
        logToWhatsApp: false,
        persona,
        policyUsed: policy.name
      };
    }

    // Default: YELLOW (cautious approach)
    return {
      level: 'YELLOW',
      command,
      reason: `Unknown command in ${policy.name} policy - treating as sensitive`,
      requiresApproval: false,
      autoExecute: true,
      logToWhatsApp: true,
      persona,
      policyUsed: policy.name
    };
  }

  /**
   * Match command against patterns
   */
  private matchPatterns(command: string, patterns: RegExp[]): RegExp | null {
    for (const pattern of patterns) {
      if (pattern.test(command)) {
        return pattern;
      }
    }
    return null;
  }

  /**
   * Get approval timeout for a persona
   */
  getApprovalTimeout(persona: string): number {
    const personaPolicy = this.personaPolicies.get(persona);
    return personaPolicy?.approvalTimeout || this.globalPolicy.approvalTimeout;
  }

  /**
   * Basic classify (uses global policy only) - for backward compatibility
   */
  classify(command: string): ClassificationResult {
    return this.classifyWithPersona(command, 'General');
  }
}

export default HardenedGuard;
