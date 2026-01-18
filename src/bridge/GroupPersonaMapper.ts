/**
 * Group-Persona Mapper
 *
 * Maps WhatsApp group names to agent personas based on configurable patterns.
 * Supports Trading, Dev, and General personas with different capabilities.
 */

import fs from 'fs';
import path from 'path';
import appLogger from '../utils/logger';

const logger = appLogger.child({ component: 'GroupPersonaMapper' });

export interface PersonaConfig {
  systemPrompt: string;
  allowedSkills: string[];
  guardPolicy: string;
  memoryScope: string;
  description: string;
}

export interface GroupMapping {
  groupNamePattern: string;
  persona: string;
  description?: string;
}

export interface GroupMappingsConfig {
  mappings: GroupMapping[];
  privateMessagePersona: string;
  defaultPersona: string;
}

export interface PersonasConfig {
  [key: string]: PersonaConfig;
}

export class GroupPersonaMapper {
  private personas: PersonasConfig;
  private mappingsConfig: GroupMappingsConfig;
  private compiledPatterns: { regex: RegExp; persona: string }[];

  constructor(configDir?: string) {
    const configPath = configDir || path.join(process.cwd(), 'config');

    // Load personas config
    const personasPath = path.join(configPath, 'personas.json');
    this.personas = JSON.parse(fs.readFileSync(personasPath, 'utf-8'));

    // Load group mappings config
    const mappingsPath = path.join(configPath, 'group-mappings.json');
    this.mappingsConfig = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));

    // Pre-compile regex patterns for performance
    this.compiledPatterns = this.mappingsConfig.mappings.map(mapping => ({
      regex: new RegExp(mapping.groupNamePattern, 'i'),
      persona: mapping.persona
    }));

    logger.info('GroupPersonaMapper initialized', {
      personas: Object.keys(this.personas),
      mappings: this.mappingsConfig.mappings.length
    });
  }

  /**
   * Match a group name to a persona
   */
  matchGroup(groupName: string | undefined, isPrivateMessage: boolean = false): string {
    // Private messages use the configured private message persona
    if (isPrivateMessage || !groupName) {
      return this.mappingsConfig.privateMessagePersona;
    }

    // Try each pattern in order (first match wins)
    for (const { regex, persona } of this.compiledPatterns) {
      if (regex.test(groupName)) {
        logger.debug(`Group "${groupName}" matched to persona: ${persona}`);
        return persona;
      }
    }

    // Fallback to default
    return this.mappingsConfig.defaultPersona;
  }

  /**
   * Get the full configuration for a persona
   */
  getPersona(personaId: string): PersonaConfig | null {
    const persona = this.personas[personaId];
    if (!persona) {
      logger.warn(`Persona "${personaId}" not found, returning null`);
      return null;
    }
    return persona;
  }

  /**
   * Get all personas with their configurations
   */
  getAllPersonas(): Map<string, PersonaConfig> {
    return new Map(Object.entries(this.personas));
  }

  /**
   * Check if a skill is allowed for a persona
   */
  isSkillAllowed(personaId: string, skillName: string): boolean {
    const persona = this.getPersona(personaId);
    if (!persona) return false;

    // "all" means all skills are allowed
    if (persona.allowedSkills.includes('all')) return true;

    return persona.allowedSkills.includes(skillName);
  }

  /**
   * Get the guard policy name for a persona
   */
  getGuardPolicyName(personaId: string): string {
    const persona = this.getPersona(personaId);
    return persona?.guardPolicy || 'default';
  }

  /**
   * Get the memory scope for a persona
   */
  getMemoryScope(personaId: string): string {
    const persona = this.getPersona(personaId);
    return persona?.memoryScope || 'general';
  }

  /**
   * Get system prompt for a persona
   */
  getSystemPrompt(personaId: string): string {
    const persona = this.getPersona(personaId);
    return persona?.systemPrompt || 'You are a helpful assistant.';
  }
}

export default GroupPersonaMapper;
