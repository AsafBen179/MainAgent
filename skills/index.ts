/**
 * Skills Index - Native Claude Code Skills for Autonomous Operations
 *
 * This module exports three core autonomous skills:
 *
 * 1. webOperator - Stealth Playwright browser automation
 *    - Headed mode (visible browser) for monitoring
 *    - Anti-detection measures
 *    - Human-like interactions
 *
 * 2. selfCorrection - DOM failure analysis and selector updates
 *    - Analyzes why selectors fail
 *    - Finds alternative selectors
 *    - Learns from corrections
 *
 * 3. tacticalPlanning - Structured execution plans
 *    - Creates step-by-step plans before acting
 *    - Tracks progress in real-time
 *    - Reports status via WhatsApp bridge
 *
 * @module skills
 */

export { default as webOperator, closeAllSessions } from './webOperator.js';
export { default as selfCorrection } from './selfCorrection.js';
export { default as tacticalPlanning, getCurrentPlan } from './tacticalPlanning.js';

/**
 * Skill metadata for Claude Code CLI discovery
 */
export const skillMetadata = {
  webOperator: {
    name: 'webOperator',
    description: 'Stealth browser automation with Playwright. Use for accessing trading sites, news, and web data without bot detection.',
    actions: ['launch', 'navigate', 'click', 'type', 'screenshot', 'getContent', 'waitFor', 'evaluate', 'close'],
    keywords: ['browse', 'web', 'trading', 'crypto', 'tradingview', 'coingecko', 'screenshot', 'scrape']
  },
  selfCorrection: {
    name: 'selfCorrection',
    description: 'Autonomous DOM failure analysis. Use when web automation fails due to outdated selectors.',
    actions: ['analyzeFailure', 'findAlternatives', 'learnCorrection', 'getMemory', 'applyFix', 'categorizeError'],
    keywords: ['selector', 'dom', 'failure', 'fix', 'correction', 'element not found']
  },
  tacticalPlanning: {
    name: 'tacticalPlanning',
    description: 'Structured execution plans for multi-step tasks. Use before complex missions to "think before acting".',
    actions: ['create', 'addStep', 'approve', 'start', 'completeStep', 'getStatus', 'getSummary', 'abort', 'load'],
    keywords: ['plan', 'mission', 'multi-step', 'task', 'strategy', 'execute']
  }
};
