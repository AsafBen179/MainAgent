/**
 * Persona Router - Context-Aware Persona Selection
 *
 * Routes messages to appropriate personas based on:
 * 1. Direct group ID overrides (highest priority)
 * 2. Group name pattern matching
 * 3. Default fallback
 *
 * Each persona has:
 * - System prompt injection
 * - Allowed skills whitelist
 * - Guard policy selection
 * - Memory scope isolation
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PersonaRouter {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(process.cwd(), 'config');
    this.groupMappings = null;
    this.personas = null;
    this.initialized = false;
  }

  /**
   * Initialize the router by loading configs
   */
  initialize() {
    try {
      // Load group mappings
      const mappingsPath = path.join(this.configPath, 'group-mappings.json');
      if (fs.existsSync(mappingsPath)) {
        this.groupMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
        logger.info('Group mappings loaded', {
          mappingCount: this.groupMappings.mappings?.length,
          overrideCount: Object.keys(this.groupMappings.groupIdOverrides || {}).length - 1 // -1 for _comment
        });
      } else {
        logger.warn('Group mappings not found, using defaults');
        this.groupMappings = {
          mappings: [{ groupNamePattern: '.*', persona: 'General', priority: 99 }],
          defaultPersona: 'General',
          privateMessagePersona: 'General'
        };
      }

      // Load personas
      const personasPath = path.join(this.configPath, 'personas.json');
      if (fs.existsSync(personasPath)) {
        this.personas = JSON.parse(fs.readFileSync(personasPath, 'utf-8'));
        logger.info('Personas loaded', {
          personaCount: Object.keys(this.personas).length,
          personas: Object.keys(this.personas)
        });
      } else {
        logger.warn('Personas config not found, using defaults');
        this.personas = {
          General: {
            systemPrompt: 'You are a helpful assistant.',
            allowedSkills: ['web-operator'],
            guardPolicy: 'default',
            memoryScope: 'general'
          }
        };
      }

      // Sort mappings by priority
      if (this.groupMappings.mappings) {
        this.groupMappings.mappings.sort((a, b) => (a.priority || 99) - (b.priority || 99));
      }

      this.initialized = true;
      return this;
    } catch (error) {
      logger.error('Failed to initialize PersonaRouter', { error: error.message });
      throw error;
    }
  }

  /**
   * Route a message to the appropriate persona
   *
   * @param {Object} messageContext - The message context
   * @param {string} messageContext.groupId - The group ID (if group message)
   * @param {string} messageContext.groupName - The group name (if group message)
   * @param {boolean} messageContext.isGroupMessage - Whether this is a group message
   * @returns {Object} Routing result with persona config
   */
  route(messageContext) {
    const { groupId, groupName, isGroupMessage } = messageContext;

    // For private messages, use privateMessagePersona
    if (!isGroupMessage) {
      const personaName = this.groupMappings.privateMessagePersona || 'General';
      return this._buildRoutingResult(personaName, 'private_message', messageContext);
    }

    // Check direct group ID override first (highest priority)
    if (groupId && this.groupMappings.groupIdOverrides) {
      const override = this.groupMappings.groupIdOverrides[groupId];
      if (override && override !== '_comment') {
        return this._buildRoutingResult(override, 'group_id_override', messageContext);
      }
    }

    // Match by group name pattern
    if (groupName && this.groupMappings.mappings) {
      for (const mapping of this.groupMappings.mappings) {
        try {
          const regex = new RegExp(mapping.groupNamePattern, 'i');
          if (regex.test(groupName)) {
            return this._buildRoutingResult(mapping.persona, 'pattern_match', messageContext, mapping);
          }
        } catch (regexError) {
          logger.warn('Invalid regex in group mapping', {
            pattern: mapping.groupNamePattern,
            error: regexError.message
          });
        }
      }
    }

    // Fallback to default
    const defaultPersona = this.groupMappings.defaultPersona || 'General';
    return this._buildRoutingResult(defaultPersona, 'default_fallback', messageContext);
  }

  /**
   * Build the routing result with full persona config
   */
  _buildRoutingResult(personaName, matchType, messageContext, matchedMapping = null) {
    const persona = this.personas[personaName] || this.personas['General'];

    const result = {
      personaName,
      matchType,
      persona: {
        ...persona,
        name: personaName
      },
      context: {
        groupId: messageContext.groupId,
        groupName: messageContext.groupName,
        isGroupMessage: messageContext.isGroupMessage
      }
    };

    if (matchedMapping) {
      result.matchedPattern = matchedMapping.groupNamePattern;
      result.matchDescription = matchedMapping.description;
    }

    // Log routing decision if enabled
    if (this.groupMappings.enablePersonaLogging) {
      logger.info('Persona routed', {
        personaName,
        matchType,
        groupName: messageContext.groupName,
        groupId: messageContext.groupId?.substring(0, 20)
      });
    }

    return result;
  }

  /**
   * Get persona by name
   */
  getPersona(personaName) {
    return this.personas[personaName] || null;
  }

  /**
   * Check if a skill is allowed for a persona
   */
  isSkillAllowed(personaName, skillName) {
    const persona = this.personas[personaName];
    if (!persona) return false;

    if (persona.allowedSkills.includes('all')) return true;
    return persona.allowedSkills.includes(skillName);
  }

  /**
   * Get priority skill for a persona (if any)
   */
  getPrioritySkill(personaName) {
    const persona = this.personas[personaName];
    return persona?.prioritySkill || null;
  }

  /**
   * Build enhanced prompt with persona context
   */
  buildPersonaPrompt(personaName, originalCommand) {
    const persona = this.personas[personaName];
    if (!persona || !persona.systemPrompt) {
      return originalCommand;
    }

    // Check for priority skill
    const prioritySkill = persona.prioritySkill;
    let skillHint = '';
    if (prioritySkill) {
      skillHint = `\n\nPRIORITY: Use the "${prioritySkill}" skill for this task when applicable.`;
    }

    return `[PERSONA: ${personaName}]\n${persona.systemPrompt}${skillHint}\n\n[USER REQUEST]\n${originalCommand}`;
  }

  /**
   * Get all available personas
   */
  getAllPersonas() {
    return Object.entries(this.personas).map(([name, config]) => ({
      name,
      description: config.description,
      allowedSkills: config.allowedSkills,
      guardPolicy: config.guardPolicy
    }));
  }

  /**
   * Add or update a group ID override at runtime
   */
  addGroupOverride(groupId, personaName) {
    if (!this.groupMappings.groupIdOverrides) {
      this.groupMappings.groupIdOverrides = {};
    }
    this.groupMappings.groupIdOverrides[groupId] = personaName;
    logger.info('Group override added', { groupId: groupId.substring(0, 20), personaName });
  }

  /**
   * Reload configs from disk
   */
  reload() {
    this.initialized = false;
    return this.initialize();
  }
}

// Singleton instance
let instance = null;

function getPersonaRouter() {
  if (!instance) {
    instance = new PersonaRouter();
    instance.initialize();
  }
  return instance;
}

function initializePersonaRouter(configPath = null) {
  instance = new PersonaRouter(configPath);
  instance.initialize();
  return instance;
}

module.exports = {
  PersonaRouter,
  getPersonaRouter,
  initializePersonaRouter
};
