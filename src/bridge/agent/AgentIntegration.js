/**
 * Agent Integration Layer
 *
 * Bridges the advanced autonomous features (Guard, Memory, Skills)
 * with the CLI executor for full agent mode.
 *
 * Flow:
 * 1. Pre-execution: Guard classification + Memory context injection
 * 2. Execution: Claude CLI with MCP tools
 * 3. Post-execution: Result storage + Self-correction on failure
 */

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { CommandClassifier } = require('./CommandClassifier');
const { getKnowledgeBase } = require('./KnowledgeBase');

class AgentIntegration {
  constructor(config = {}) {
    this.config = config;
    this.classifier = null;
    this.knowledgeBase = null;
    this.initialized = false;

    // MCP tools configuration
    this.mcpToolsPath = config.mcpToolsPath || path.join(process.cwd(), 'src', 'skills');
    this.skillsConfig = null;
  }

  /**
   * Initialize all components
   */
  async initialize() {
    logger.info('Initializing Agent Integration Layer...');

    try {
      // Initialize Guard (CommandClassifier)
      const guardPolicyPath = this.config.guardPolicyPath ||
        path.join(process.cwd(), 'config', 'guard_policy.json');
      this.classifier = new CommandClassifier(guardPolicyPath);
      logger.info('ExecutionGuard initialized');

      // Initialize Knowledge Base
      this.knowledgeBase = getKnowledgeBase();
      const stats = this.knowledgeBase.getStats();
      logger.info('KnowledgeBase initialized', stats);

      // Load skills configuration
      await this.loadSkillsConfig();

      this.initialized = true;
      logger.info('Agent Integration Layer initialized');

      return this;
    } catch (error) {
      logger.error('Failed to initialize Agent Integration', { error: error.message });
      throw error;
    }
  }

  /**
   * Load MCP skills configuration
   */
  async loadSkillsConfig() {
    try {
      const skillsIndexPath = path.join(this.mcpToolsPath, 'index.ts');
      if (fs.existsSync(skillsIndexPath)) {
        // Skills exist - extract configuration
        this.skillsConfig = {
          webOperator: {
            path: path.join(this.mcpToolsPath, 'web-operator'),
            headedMode: this.config.headedMode !== false
          },
          selfCorrection: {
            path: path.join(this.mcpToolsPath, 'self-correction'),
            enabled: true
          },
          tacticalPlanning: {
            path: path.join(this.mcpToolsPath, 'tactical-planning'),
            enabled: true
          }
        };
        logger.info('Skills configuration loaded', {
          skills: Object.keys(this.skillsConfig)
        });
      }
    } catch (error) {
      logger.warn('Could not load skills config', { error: error.message });
      this.skillsConfig = {};
    }
  }

  /**
   * Pre-execution hook: Guard classification + Memory injection
   * Returns: { proceed: boolean, classification, context, blockReason? }
   */
  async preExecution(command, options = {}) {
    const startTime = Date.now();
    const { taskType, taskDescription, groupId, senderPhone } = options;

    logger.info('Pre-execution check', { command: command.substring(0, 100), taskType });

    // Step 1: Classify the command with Guard
    const classification = this.classifier.classify(command);
    logger.info('Guard classification', {
      level: classification.level,
      reason: classification.reason
    });

    // Handle BLACKLISTED - Never proceed
    if (classification.level === 'BLACKLISTED') {
      // Auto-save lesson about blocked command
      this.knowledgeBase.saveLesson({
        task_type: 'command_blocked',
        task_description: taskDescription || command,
        success: false,
        error_message: `Command blocked: ${classification.reason}`,
        lesson_summary: `Command pattern is blacklisted for safety`,
        category: 'security'
      });

      return {
        proceed: false,
        classification,
        blockReason: classification.reason,
        context: null
      };
    }

    // Step 2: Query relevant lessons from memory
    const relevantLessons = this.knowledgeBase.queryLessons({
      task_type: taskType || 'command_execution',
      search_text: taskDescription || command,
      limit: 3
    });

    // Step 3: Build context with memory
    const memoryContext = this.knowledgeBase.formatLessonsForPrompt(relevantLessons);

    // Step 4: Handle RED (requires approval) - return for external handling
    if (classification.level === 'RED') {
      return {
        proceed: false,
        requiresApproval: true,
        classification,
        context: memoryContext,
        relevantLessons
      };
    }

    // GREEN or YELLOW - proceed with execution
    return {
      proceed: true,
      classification,
      context: memoryContext,
      relevantLessons,
      executionMetadata: {
        startTime,
        taskType: taskType || 'command_execution',
        taskDescription: taskDescription || command
      }
    };
  }

  /**
   * Build enhanced prompt with memory context
   */
  buildEnhancedPrompt(originalCommand, preResult) {
    let enhancedPrompt = originalCommand;

    // Inject memory context if available
    if (preResult.context && preResult.context.length > 0) {
      enhancedPrompt = `${preResult.context}\n\nTask: ${originalCommand}`;
    }

    return enhancedPrompt;
  }

  /**
   * Post-execution hook: Result storage + Self-correction trigger
   */
  async postExecution(result, preResult, originalCommand) {
    const { executionMetadata } = preResult;
    const duration = Date.now() - (executionMetadata?.startTime || Date.now());

    logger.info('Post-execution processing', {
      success: result.success,
      duration,
      outputLength: result.output?.length
    });

    // Save task history
    this.knowledgeBase.saveTaskHistory({
      task_type: executionMetadata?.taskType || 'command_execution',
      task_description: executionMetadata?.taskDescription || originalCommand,
      command_executed: originalCommand,
      success: result.success,
      output: result.output,
      error: result.error,
      duration_ms: duration,
      lessons_applied: preResult.relevantLessons?.map(l => l.id)
    });

    // Check for failure patterns that might trigger self-correction
    if (!result.success && result.error) {
      const selfCorrectionResult = await this.checkSelfCorrection(result, originalCommand);
      if (selfCorrectionResult.shouldRetry) {
        return {
          ...result,
          selfCorrection: selfCorrectionResult
        };
      }
    }

    // Auto-save lesson if this was a significant task
    if (result.shouldSaveLesson || (!result.success && result.error)) {
      const lesson = this.extractLesson(result, originalCommand, duration);
      if (lesson) {
        const lessonId = this.knowledgeBase.saveLesson(lesson);
        logger.info('Auto-saved lesson', { lessonId, success: result.success });
      }
    }

    return result;
  }

  /**
   * Check if self-correction should be triggered (SEASP)
   */
  async checkSelfCorrection(result, command) {
    const error = result.error || result.output;

    // Common error patterns that might benefit from self-correction
    const selfCorrectablePatterns = [
      { pattern: /selector.*not found/i, type: 'selector_failure' },
      { pattern: /element.*not found/i, type: 'element_failure' },
      { pattern: /timeout.*waiting/i, type: 'timeout_failure' },
      { pattern: /cannot find module/i, type: 'module_missing' },
      { pattern: /import.*error/i, type: 'import_error' },
      { pattern: /type.*error/i, type: 'type_error' }
    ];

    for (const { pattern, type } of selfCorrectablePatterns) {
      if (pattern.test(error)) {
        logger.info('Self-correction pattern detected', { type, error: error.substring(0, 200) });

        // Find past solutions for this error type
        const pastSolutions = this.knowledgeBase.findLessonsForError(error);

        if (pastSolutions.length > 0) {
          return {
            shouldRetry: true,
            correctionType: type,
            suggestedSolution: pastSolutions[0].solution,
            pastLesson: pastSolutions[0]
          };
        }

        // No past solution - record for future learning
        return {
          shouldRetry: false,
          correctionType: type,
          needsManualFix: true
        };
      }
    }

    return { shouldRetry: false };
  }

  /**
   * Extract lesson from execution result
   */
  extractLesson(result, command, duration) {
    // Only extract meaningful lessons
    if (!result.error && result.success) {
      // Success case - only save if it was complex
      if (duration > 30000 || command.length > 200) {
        return {
          task_type: 'command_execution',
          task_description: command.substring(0, 500),
          success: true,
          lesson_summary: `Successfully completed in ${Math.round(duration / 1000)}s`,
          time_to_resolution_ms: duration
        };
      }
      return null;
    }

    // Failure case - always save for learning
    return {
      task_type: 'command_execution',
      task_description: command.substring(0, 500),
      success: false,
      error_message: result.error?.substring(0, 1000),
      lesson_summary: `Failed: ${result.error?.substring(0, 200)}`,
      time_to_resolution_ms: duration
    };
  }

  /**
   * Get MCP environment variables for Claude CLI
   */
  getMcpEnvironment() {
    const env = { ...process.env };

    // Configure headed mode for browser automation
    if (this.config.headedMode !== false) {
      env.PLAYWRIGHT_HEADLESS = 'false';
      env.PUPPETEER_HEADLESS = 'false';
    }

    // Add skills path
    if (this.skillsConfig) {
      env.MCP_SKILLS_PATH = this.mcpToolsPath;
    }

    return env;
  }

  /**
   * Get Claude CLI arguments for MCP tools
   */
  getClaudeCliArgs() {
    const args = [];

    // Add MCP server configurations if skills exist
    if (this.skillsConfig?.webOperator) {
      // Playwright MCP config path
      const playwrightMcpConfig = 'C:\\Users\\asaf1\\.claude\\plugins\\marketplaces\\claude-plugins-official\\external_plugins\\playwright\\.mcp.json';
      if (fs.existsSync(playwrightMcpConfig)) {
        args.push('--mcp-config', playwrightMcpConfig);
      }
    }

    return args;
  }

  /**
   * Handle approval request (for RED commands)
   */
  async requestApproval(command, classification, groupId) {
    return {
      command,
      classification,
      groupId,
      approvalId: `approval_${Date.now()}`,
      timeout: this.classifier.getApprovalTimeout()
    };
  }

  /**
   * Get knowledge base statistics
   */
  getStats() {
    return this.knowledgeBase.getStats();
  }

  /**
   * Shutdown - cleanup resources
   */
  shutdown() {
    logger.info('Shutting down Agent Integration...');
    // KnowledgeBase will be closed by the singleton manager
  }
}

// Singleton instance
let instance = null;

function getAgentIntegration(config) {
  if (!instance) {
    instance = new AgentIntegration(config);
  }
  return instance;
}

async function initializeAgentIntegration(config) {
  const agent = getAgentIntegration(config);
  if (!agent.initialized) {
    await agent.initialize();
  }
  return agent;
}

module.exports = {
  AgentIntegration,
  getAgentIntegration,
  initializeAgentIntegration
};
