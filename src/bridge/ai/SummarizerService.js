const logger = require('../utils/logger');
const openRouterClient = require('./OpenRouterClient');

/**
 * AI-powered summarization service for Claude Code output
 */
class SummarizerService {
  constructor() {
    this.config = null;
    this.client = null;
  }

  /**
   * Initialize with configuration
   */
  initialize(config) {
    this.config = config;
    this.client = openRouterClient.initialize(config);
    return this;
  }

  /**
   * Summarize command output
   */
  async summarizeOutput(output, context = {}) {
    const { commandText, projectName, startTime } = context;

    logger.info('Summarizing output', {
      outputLength: output?.length || 0,
      outputPreview: output?.substring(0, 300),
      commandText
    });

    // Calculate execution time
    const executionTime = startTime ? Date.now() - startTime : null;

    // Check for errors
    const isError = this.detectError(output);

    // Get summary from AI (only for very long outputs)
    let summary = output;
    const MAX_WHATSAPP_LENGTH = 4000; // WhatsApp practical limit

    if (output.length > MAX_WHATSAPP_LENGTH) {
      // Only summarize if output is too long for WhatsApp
      summary = await this.client.summarize(output, {
        commandText,
        projectName,
        isError
      });
    }

    // Build result - include original output for short responses
    const result = {
      summary,
      originalOutput: output, // Keep original for formatting
      isError,
      executionTime,
      originalLength: output.length,
      keyPoints: this.extractKeyPoints(output)
    };

    return result;
  }

  /**
   * Summarize error output
   */
  async summarizeError(error, context = {}) {
    const errorOutput = typeof error === 'string' ? error : error.message || String(error);

    return this.summarizeOutput(errorOutput, {
      ...context,
      isError: true
    });
  }

  /**
   * Detect if output contains errors
   */
  detectError(output) {
    const errorPatterns = [
      /error:/i,
      /exception:/i,
      /failed:/i,
      /fatal:/i,
      /traceback/i,
      /ENOENT/i,
      /EACCES/i,
      /permission denied/i,
      /not found/i,
      /syntax error/i
    ];

    return errorPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Extract key points from output
   */
  extractKeyPoints(output) {
    const keyPoints = [];

    // Files created/modified
    const fileOps = output.match(/(?:created|modified|deleted|wrote|read)\s+['"]?([^'"]+)['"]?/gi);
    if (fileOps) {
      keyPoints.push(`Files affected: ${fileOps.length}`);
    }

    // Tests
    const testMatch = output.match(/(\d+)\s+(?:tests?|specs?)\s+(?:passed|failed)/i);
    if (testMatch) {
      keyPoints.push(`Tests: ${testMatch[0]}`);
    }

    // Warnings
    const warningCount = (output.match(/warning:/gi) || []).length;
    if (warningCount > 0) {
      keyPoints.push(`Warnings: ${warningCount}`);
    }

    // Errors
    const errorCount = (output.match(/error:/gi) || []).length;
    if (errorCount > 0) {
      keyPoints.push(`Errors: ${errorCount}`);
    }

    return keyPoints;
  }

  /**
   * Format summary for WhatsApp
   */
  formatForWhatsApp(result, config = {}) {
    const { successPrefix = '✅ ', errorPrefix = '❌ ' } = config;
    const MAX_WHATSAPP_LENGTH = 4000;

    let message = result.isError ? errorPrefix : successPrefix;

    // Use full output if short enough, otherwise use summary
    const content = result.summary || result.originalOutput || '';

    if (content.length <= MAX_WHATSAPP_LENGTH) {
      // Full output fits - send it all
      message += content;
    } else {
      // Truncate with indicator
      message += content.substring(0, MAX_WHATSAPP_LENGTH - 100);
      message += '\n\n... _(truncated - full output was ' + result.originalLength + ' chars)_';
    }

    // Add execution time
    if (result.executionTime) {
      message += `\n\n⏱️ ${this.formatDuration(result.executionTime)}`;
    }

    return message;
  }

  /**
   * Format duration
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Quick summary (no AI, just extraction)
   */
  quickSummary(output, maxLength = 500) {
    // Remove ANSI codes
    let clean = output.replace(/\x1b\[[0-9;]*m/g, '');

    // Remove excessive whitespace
    clean = clean.replace(/\n{3,}/g, '\n\n').trim();

    // Get last meaningful section
    const lines = clean.split('\n');
    const meaningfulLines = lines.filter(line =>
      line.trim() &&
      !line.match(/^[>\s]*$/) &&
      !line.match(/^\s*claude>\s*$/)
    );

    // Take last few lines
    const lastLines = meaningfulLines.slice(-10).join('\n');

    if (lastLines.length <= maxLength) {
      return lastLines;
    }

    return lastLines.substring(0, maxLength - 3) + '...';
  }

  /**
   * Check if summarization is available
   */
  isAvailable() {
    return this.client && this.client.isConfigured();
  }
}

module.exports = new SummarizerService();
