/**
 * Sequential Thinking - Plan Schema
 *
 * Defines the structure for multi-step task planning.
 * Every complex task is broken down into a plan before execution.
 */

export interface PlanStep {
  id: number;
  action: string;                    // What to do
  description: string;               // Why/how to do it
  tool?: string;                     // MCP tool to use (if any)
  args?: Record<string, unknown>;    // Tool arguments
  dependencies?: number[];           // Step IDs this depends on
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: string;                   // Execution result
  error?: string;                    // Error if failed
  started_at?: string;
  completed_at?: string;
}

export interface RelevantLesson {
  id: number;
  summary: string;
  solution?: string;
  relevance: string;                 // Why this lesson is relevant
}

export interface Plan {
  id: string;                        // Unique plan ID
  created_at: string;
  updated_at: string;

  // Task definition
  task: {
    type: string;                    // bug_fix, feature, research, automation, etc.
    description: string;             // What we're trying to accomplish
    success_criteria: string[];      // How we know we're done
    category?: string;               // For memory lookup
  };

  // Context from Memory Engine
  memory_context: {
    lessons_consulted: RelevantLesson[];
    warnings: string[];              // Things to avoid based on past failures
  };

  // The plan itself
  steps: PlanStep[];

  // Execution state
  status: 'planning' | 'ready' | 'executing' | 'completed' | 'failed' | 'aborted';
  current_step?: number;

  // Results
  outcome?: {
    success: boolean;
    summary: string;
    lesson_saved?: number;           // ID of lesson saved from this plan
  };

  // Safety
  safety: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    requires_approval: boolean;
    approved_by?: string;
    approved_at?: string;
  };
}

export interface PlanTemplate {
  name: string;
  description: string;
  task_types: string[];              // Task types this template applies to
  default_steps: Omit<PlanStep, 'id' | 'status'>[];
}

// Common plan templates
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    name: 'web_research',
    description: 'Research a topic on the web',
    task_types: ['research', 'information_gathering'],
    default_steps: [
      { action: 'prepare', description: 'Query memory for relevant past research' },
      { action: 'navigate', description: 'Open browser and navigate to search engine' },
      { action: 'search', description: 'Enter search query' },
      { action: 'analyze', description: 'Review search results and identify relevant pages' },
      { action: 'extract', description: 'Extract key information from pages' },
      { action: 'screenshot', description: 'Take screenshots for verification' },
      { action: 'summarize', description: 'Compile findings into summary' },
      { action: 'save_lesson', description: 'Save learnings to memory' }
    ]
  },
  {
    name: 'web_automation',
    description: 'Automate a web-based task',
    task_types: ['automation', 'web_task'],
    default_steps: [
      { action: 'prepare', description: 'Query memory for similar automations' },
      { action: 'launch_browser', description: 'Start browser in controlled mode' },
      { action: 'navigate', description: 'Go to target URL' },
      { action: 'verify_page', description: 'Screenshot and verify correct page loaded' },
      { action: 'interact', description: 'Perform the required interactions' },
      { action: 'verify_result', description: 'Screenshot and verify success' },
      { action: 'cleanup', description: 'Close browser and clean up' },
      { action: 'save_lesson', description: 'Record outcome in memory' }
    ]
  },
  {
    name: 'bug_fix',
    description: 'Fix a bug in code',
    task_types: ['bug_fix', 'debugging'],
    default_steps: [
      { action: 'prepare', description: 'Query memory for similar bugs and solutions' },
      { action: 'reproduce', description: 'Understand and reproduce the bug' },
      { action: 'analyze', description: 'Identify root cause' },
      { action: 'plan_fix', description: 'Design the fix approach' },
      { action: 'implement', description: 'Make the code changes' },
      { action: 'test', description: 'Verify the fix works' },
      { action: 'save_lesson', description: 'Document the fix in memory' }
    ]
  },
  {
    name: 'installation',
    description: 'Install software or dependencies',
    task_types: ['installation', 'setup'],
    default_steps: [
      { action: 'prepare', description: 'Check memory for installation gotchas' },
      { action: 'verify_prerequisites', description: 'Check system requirements' },
      { action: 'backup', description: 'Backup if needed' },
      { action: 'install', description: 'Run installation commands' },
      { action: 'configure', description: 'Apply configuration' },
      { action: 'verify', description: 'Test installation works' },
      { action: 'save_lesson', description: 'Record any issues encountered' }
    ]
  }
];
