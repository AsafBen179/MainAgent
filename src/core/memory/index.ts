#!/usr/bin/env node
/**
 * Memory Engine - MCP Server
 *
 * Provides tools for storing and retrieving lessons learned.
 * The agent uses this to avoid repeating mistakes and apply past solutions.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { KnowledgeBase, getKnowledgeBase } from './knowledge-base.js';
import { Lesson, LessonQuery } from './schema.js';

// Tool argument schemas
const SaveLessonArgsSchema = z.object({
  task_type: z.string().describe('Type of task: bug_fix, installation, configuration, coding, etc.'),
  task_description: z.string().describe('What was being attempted'),
  success: z.boolean().describe('Whether the task succeeded'),
  lesson_summary: z.string().describe('Key takeaway in one sentence'),
  category: z.string().optional().describe('Category: npm, git, typescript, windows, etc.'),
  tags: z.array(z.string()).optional().describe('Tags for searching'),
  initial_approach: z.string().optional().describe('The first approach tried'),
  error_message: z.string().optional().describe('Error encountered (if any)'),
  root_cause: z.string().optional().describe('Why it failed/succeeded'),
  solution: z.string().optional().describe('What worked (the fix)'),
  attempts_before_success: z.number().optional().describe('Number of attempts before success')
});

const QueryLessonsArgsSchema = z.object({
  task_type: z.string().optional().describe('Filter by task type'),
  category: z.string().optional().describe('Filter by category'),
  search_text: z.string().optional().describe('Full-text search query'),
  error_pattern: z.string().optional().describe('Search for similar errors'),
  success_only: z.boolean().optional().describe('Only return successful lessons'),
  failure_only: z.boolean().optional().describe('Only return failed lessons'),
  limit: z.number().optional().describe('Maximum number of results')
});

const FindLessonsForErrorArgsSchema = z.object({
  error_message: z.string().describe('The error message to find lessons for'),
  limit: z.number().optional().describe('Maximum number of results')
});

const MarkLessonAppliedArgsSchema = z.object({
  lesson_id: z.number().describe('ID of the lesson that was applied')
});

// Initialize knowledge base
const kb = getKnowledgeBase();

// Create the MCP Server
const server = new Server(
  {
    name: 'memory-engine',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'save_lesson',
        description: `Save a lesson learned from task execution.

IMPORTANT: Call this automatically when:
- A bug is fixed (success=true, include the solution)
- A command fails (success=false, include the error)
- A workaround is discovered
- A non-obvious solution is found

This builds the agent's knowledge base for future tasks.`,
        inputSchema: {
          type: 'object',
          properties: {
            task_type: {
              type: 'string',
              description: 'Type of task: bug_fix, installation, configuration, coding, command_execution, etc.'
            },
            task_description: {
              type: 'string',
              description: 'What was being attempted'
            },
            success: {
              type: 'boolean',
              description: 'Whether the task succeeded'
            },
            lesson_summary: {
              type: 'string',
              description: 'Key takeaway in one sentence - what should be remembered'
            },
            category: {
              type: 'string',
              description: 'Category: npm, git, typescript, windows, python, database, etc.'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for searching'
            },
            initial_approach: {
              type: 'string',
              description: 'The first approach tried (useful for learning what NOT to do)'
            },
            error_message: {
              type: 'string',
              description: 'Error encountered (if any)'
            },
            root_cause: {
              type: 'string',
              description: 'Why it failed/succeeded - the underlying reason'
            },
            solution: {
              type: 'string',
              description: 'What worked (the fix) - be specific!'
            },
            attempts_before_success: {
              type: 'number',
              description: 'Number of attempts before success'
            }
          },
          required: ['task_type', 'task_description', 'success', 'lesson_summary']
        }
      },
      {
        name: 'query_lessons',
        description: `Query lessons relevant to a current task.

IMPORTANT: Call this BEFORE starting any significant task to check for relevant insights.
This helps avoid repeating past mistakes and apply known solutions.`,
        inputSchema: {
          type: 'object',
          properties: {
            task_type: {
              type: 'string',
              description: 'Filter by task type'
            },
            category: {
              type: 'string',
              description: 'Filter by category'
            },
            search_text: {
              type: 'string',
              description: 'Full-text search query'
            },
            error_pattern: {
              type: 'string',
              description: 'Search for similar errors'
            },
            success_only: {
              type: 'boolean',
              description: 'Only return successful lessons (solutions)'
            },
            failure_only: {
              type: 'boolean',
              description: 'Only return failed lessons (things to avoid)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 5)'
            }
          }
        }
      },
      {
        name: 'find_lessons_for_error',
        description: `Find lessons that might help resolve a specific error.

Call this immediately when encountering an error to see if there's a known solution.`,
        inputSchema: {
          type: 'object',
          properties: {
            error_message: {
              type: 'string',
              description: 'The error message to find lessons for'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 5)'
            }
          },
          required: ['error_message']
        }
      },
      {
        name: 'mark_lesson_applied',
        description: `Mark a lesson as applied (increases its relevance score).

Call this when you successfully use a lesson to solve a problem.`,
        inputSchema: {
          type: 'object',
          properties: {
            lesson_id: {
              type: 'number',
              description: 'ID of the lesson that was applied'
            }
          },
          required: ['lesson_id']
        }
      },
      {
        name: 'get_memory_stats',
        description: 'Get statistics about the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_recent_lessons',
        description: 'Get the most recent lessons for context',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 5)'
            }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'save_lesson': {
      const parsed = SaveLessonArgsSchema.parse(args);
      const lessonId = kb.saveLesson({
        task_type: parsed.task_type,
        task_description: parsed.task_description,
        success: parsed.success,
        lesson_summary: parsed.lesson_summary,
        category: parsed.category,
        tags: parsed.tags,
        initial_approach: parsed.initial_approach,
        error_message: parsed.error_message,
        root_cause: parsed.root_cause,
        solution: parsed.solution,
        attempts_before_success: parsed.attempts_before_success
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Lesson saved (ID: ${lessonId})\n\n` +
              `Type: ${parsed.task_type}\n` +
              `Success: ${parsed.success ? 'Yes' : 'No'}\n` +
              `Summary: ${parsed.lesson_summary}`
          }
        ]
      };
    }

    case 'query_lessons': {
      const parsed = QueryLessonsArgsSchema.parse(args);

      let lessons: Lesson[];
      if (parsed.search_text) {
        lessons = kb.searchLessons(parsed.search_text, parsed.limit || 5);
      } else {
        lessons = kb.queryLessons({
          task_type: parsed.task_type,
          category: parsed.category,
          error_pattern: parsed.error_pattern,
          success_only: parsed.success_only,
          failure_only: parsed.failure_only,
          limit: parsed.limit || 5
        });
      }

      if (lessons.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📭 No relevant lessons found in the knowledge base.'
            }
          ]
        };
      }

      const formatted = lessons.map((lesson, i) => {
        const emoji = lesson.success ? '✅' : '❌';
        return `${i + 1}. ${emoji} [ID: ${lesson.id}] ${lesson.lesson_summary}\n` +
          `   Type: ${lesson.task_type} | Category: ${lesson.category || 'N/A'}\n` +
          (lesson.solution ? `   Solution: ${lesson.solution}\n` : '') +
          (lesson.error_message ? `   Error: ${lesson.error_message.substring(0, 100)}...\n` : '');
      }).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📚 Found ${lessons.length} relevant lesson(s):\n\n${formatted}`
          }
        ]
      };
    }

    case 'find_lessons_for_error': {
      const parsed = FindLessonsForErrorArgsSchema.parse(args);
      const lessons = kb.findLessonsForError(parsed.error_message, parsed.limit || 5);

      if (lessons.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '🔍 No matching lessons found for this error. This might be a new issue.'
            }
          ]
        };
      }

      const formatted = lessons.map((lesson, i) => {
        return `${i + 1}. [ID: ${lesson.id}] ${lesson.lesson_summary}\n` +
          `   Solution: ${lesson.solution || 'See full lesson'}\n` +
          `   Relevance: ${(lesson.relevance_score || 1).toFixed(2)} | Applied: ${lesson.times_applied || 0} times`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `💡 Found ${lessons.length} potentially helpful lesson(s):\n\n${formatted}\n\n` +
              `Use mark_lesson_applied with the lesson ID if one of these helps!`
          }
        ]
      };
    }

    case 'mark_lesson_applied': {
      const parsed = MarkLessonAppliedArgsSchema.parse(args);
      kb.markLessonApplied(parsed.lesson_id);

      return {
        content: [
          {
            type: 'text',
            text: `✨ Lesson ${parsed.lesson_id} marked as applied. Its relevance score has been boosted.`
          }
        ]
      };
    }

    case 'get_memory_stats': {
      const stats = kb.getStats();

      return {
        content: [
          {
            type: 'text',
            text: `📊 Knowledge Base Statistics\n\n` +
              `Total Lessons: ${stats.total_lessons}\n` +
              `  ✅ Successful: ${stats.successful_lessons}\n` +
              `  ❌ Failed: ${stats.failed_lessons}\n` +
              `Total Tasks Logged: ${stats.total_tasks}\n\n` +
              `Top Categories:\n` +
              stats.most_common_categories.map(c => `  - ${c.category}: ${c.count}`).join('\n')
          }
        ]
      };
    }

    case 'get_recent_lessons': {
      const limit = (args as { limit?: number })?.limit || 5;
      const lessons = kb.getRecentLessons(limit);

      if (lessons.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📭 No lessons recorded yet. The knowledge base is empty.'
            }
          ]
        };
      }

      const formatted = lessons.map((lesson, i) => {
        const emoji = lesson.success ? '✅' : '❌';
        return `${i + 1}. ${emoji} ${lesson.lesson_summary}\n` +
          `   Type: ${lesson.task_type} | ${lesson.created_at}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📚 Recent Lessons:\n\n${formatted}`
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Memory Engine MCP Server running on stdio');
}

main().catch(console.error);
