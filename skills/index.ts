/**
 * Skills Index - Native Claude Code Skills for Autonomous Operations
 *
 * This plugin provides three core autonomous skills:
 *
 * 1. web-operator - Stealth Playwright browser automation
 *    - Trigger: "browse website", "open TradingView", "check crypto prices"
 *    - Headed mode (visible browser) for monitoring
 *    - Anti-detection measures
 *
 * 2. self-correction - DOM failure analysis and selector updates
 *    - Trigger: "element not found", "fix selector", "debug web automation"
 *    - Analyzes why selectors fail
 *    - Finds alternative selectors
 *
 * 3. tactical-planning - Structured execution plans
 *    - Trigger: "create a plan", "plan a mission", "multi-step task"
 *    - Creates step-by-step plans before acting
 *    - Reports progress via WhatsApp bridge
 *
 * Plugin Structure:
 * - .claude-plugin/plugin.json - Plugin manifest
 * - skills/web-operator/SKILL.md - Web automation skill
 * - skills/self-correction/SKILL.md - Self-correction skill
 * - skills/tactical-planning/SKILL.md - Planning skill
 *
 * @module mainagent-skills
 */

// Re-export TypeScript implementations for programmatic use
export { default as webOperator, closeAllSessions } from './web-operator/webOperator.js';
export { default as selfCorrection } from './self-correction/selfCorrection.js';
export { default as tacticalPlanning, getCurrentPlan } from './tactical-planning/tacticalPlanning.js';

/**
 * Skill metadata for reference
 */
export const skillMetadata = {
  'web-operator': {
    name: 'web-operator',
    description: 'Stealth browser automation for accessing trading sites, news, and web data',
    triggers: ['browse website', 'open TradingView', 'check crypto prices', 'take screenshot', 'scrape web']
  },
  'self-correction': {
    name: 'self-correction',
    description: 'DOM failure analysis when web automation fails due to outdated selectors',
    triggers: ['element not found', 'fix selector', 'debug web automation', 'selector broken']
  },
  'tactical-planning': {
    name: 'tactical-planning',
    description: 'Structured execution plans for multi-step tasks',
    triggers: ['create a plan', 'plan a mission', 'multi-step task', 'complex task']
  }
};
