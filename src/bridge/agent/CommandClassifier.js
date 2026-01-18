/**
 * Command Risk Classifier (JavaScript port)
 * Classifies commands into GREEN, YELLOW, RED, or BLACKLISTED categories
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class CommandClassifier {
  constructor(policyPath) {
    this.policy = null;
    this.blacklistRegex = [];
    this.greenRegex = [];
    this.yellowRegex = [];
    this.redRegex = [];

    const configPath = policyPath || path.join(process.cwd(), 'config', 'guard_policy.json');
    this.loadPolicy(configPath);
  }

  loadPolicy(configPath) {
    try {
      const policyContent = fs.readFileSync(configPath, 'utf-8');
      this.policy = JSON.parse(policyContent);

      // Compile regex patterns for performance
      this.blacklistRegex = (this.policy.blacklist?.patterns || []).map(p => new RegExp(p, 'i'));
      this.greenRegex = (this.policy.classification?.green?.patterns || []).map(p => new RegExp(p, 'i'));
      this.yellowRegex = (this.policy.classification?.yellow?.patterns || []).map(p => new RegExp(p, 'i'));
      this.redRegex = (this.policy.classification?.red?.patterns || []).map(p => new RegExp(p, 'i'));

      logger.info('Guard policy loaded', { path: configPath });
    } catch (error) {
      logger.error('Failed to load guard policy', { error: error.message, path: configPath });
      // Use minimal default policy
      this.policy = {
        blacklist: { patterns: [], executables: [] },
        classification: {
          green: { patterns: [], allowedPaths: [] },
          yellow: { patterns: [] },
          red: { patterns: [], requiresApproval: true, approvalTimeout: 300 }
        }
      };
    }
  }

  /**
   * Classify a command and determine its risk level
   */
  classify(command) {
    const normalizedCommand = command.trim();

    // Check blacklist first - these are NEVER allowed
    const blacklistMatch = this.checkBlacklist(normalizedCommand);
    if (blacklistMatch) {
      return {
        level: 'BLACKLISTED',
        command: normalizedCommand,
        reason: `Command matches blacklisted pattern: ${blacklistMatch}`,
        matchedPattern: blacklistMatch,
        requiresApproval: false,
        autoExecute: false,
        logToWhatsApp: true
      };
    }

    // Check for blacklisted executables
    const execMatch = this.checkBlacklistedExecutable(normalizedCommand);
    if (execMatch) {
      return {
        level: 'BLACKLISTED',
        command: normalizedCommand,
        reason: `Command attempts to run blacklisted executable: ${execMatch}`,
        matchedPattern: execMatch,
        requiresApproval: false,
        autoExecute: false,
        logToWhatsApp: true
      };
    }

    // Check RED (critical) - requires approval
    const redMatch = this.matchPatterns(normalizedCommand, this.redRegex);
    if (redMatch) {
      return {
        level: 'RED',
        command: normalizedCommand,
        reason: 'Critical operation - requires approval',
        matchedPattern: redMatch.source,
        requiresApproval: true,
        autoExecute: false,
        logToWhatsApp: true
      };
    }

    // Check YELLOW (sensitive) - execute but log
    const yellowMatch = this.matchPatterns(normalizedCommand, this.yellowRegex);
    if (yellowMatch) {
      return {
        level: 'YELLOW',
        command: normalizedCommand,
        reason: 'Sensitive operation - will be logged',
        matchedPattern: yellowMatch.source,
        requiresApproval: false,
        autoExecute: true,
        logToWhatsApp: true
      };
    }

    // Check GREEN (safe) - auto-execute
    const greenMatch = this.matchPatterns(normalizedCommand, this.greenRegex);
    if (greenMatch) {
      return {
        level: 'GREEN',
        command: normalizedCommand,
        reason: 'Safe operation - auto-executing',
        matchedPattern: greenMatch.source,
        requiresApproval: false,
        autoExecute: true,
        logToWhatsApp: false
      };
    }

    // Default: treat unknown commands as YELLOW (cautious approach)
    return {
      level: 'YELLOW',
      command: normalizedCommand,
      reason: 'Unknown command type - treating as sensitive',
      requiresApproval: false,
      autoExecute: true,
      logToWhatsApp: true
    };
  }

  checkBlacklist(command) {
    if (!this.policy.blacklist?.patterns) return null;

    for (const pattern of this.policy.blacklist.patterns) {
      if (command.toLowerCase().includes(pattern.toLowerCase().replace(/\\\\/g, '\\'))) {
        return pattern;
      }
    }
    return null;
  }

  checkBlacklistedExecutable(command) {
    if (!this.policy.blacklist?.executables) return null;

    const lowerCommand = command.toLowerCase();
    for (const exe of this.policy.blacklist.executables) {
      if (lowerCommand.includes(exe.toLowerCase())) {
        return exe;
      }
    }
    return null;
  }

  matchPatterns(command, patterns) {
    for (const pattern of patterns) {
      if (pattern.test(command)) {
        return pattern;
      }
    }
    return null;
  }

  /**
   * Check if a path is within allowed directories
   */
  isPathAllowed(targetPath) {
    if (!this.policy.classification?.green?.allowedPaths) return false;

    const normalizedPath = targetPath.replace(/\//g, '\\\\');
    for (const allowedPattern of this.policy.classification.green.allowedPaths) {
      const regex = new RegExp(allowedPattern.replace(/\\\\\*\*/g, '.*'), 'i');
      if (regex.test(normalizedPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the approval timeout for RED commands
   */
  getApprovalTimeout() {
    return this.policy.classification?.red?.approvalTimeout || 300;
  }
}

module.exports = { CommandClassifier };
