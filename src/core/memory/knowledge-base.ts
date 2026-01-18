/**
 * Knowledge Base - Self-Learning Memory Engine
 *
 * Stores and retrieves lessons learned from task execution.
 * The agent uses this to avoid repeating mistakes and apply past solutions.
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  CREATE_TABLES_SQL,
  Lesson,
  TaskHistoryEntry,
  LessonQuery,
  SCHEMA_VERSION
} from './schema.js';

export class KnowledgeBase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Default to memory directory in project root
    const memoryDir = dbPath ? join(dbPath, '..') : join(process.cwd(), 'memory');
    if (!existsSync(memoryDir)) {
      mkdirSync(memoryDir, { recursive: true });
    }

    this.dbPath = dbPath || join(memoryDir, 'knowledge.db');
    this.db = new Database(this.dbPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Initialize schema
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(CREATE_TABLES_SQL);
  }

  /**
   * Save a lesson learned from a task execution
   * Call this after fixing a bug or when a command fails
   */
  saveLesson(lesson: Lesson): number {
    const stmt = this.db.prepare(`
      INSERT INTO lessons (
        task_type, category, tags,
        task_description, initial_approach,
        success, error_message, error_pattern,
        root_cause, solution, lesson_summary,
        attempts_before_success, time_to_resolution_ms,
        relevance_score
      ) VALUES (
        @task_type, @category, @tags,
        @task_description, @initial_approach,
        @success, @error_message, @error_pattern,
        @root_cause, @solution, @lesson_summary,
        @attempts_before_success, @time_to_resolution_ms,
        @relevance_score
      )
    `);

    const result = stmt.run({
      task_type: lesson.task_type,
      category: lesson.category || null,
      tags: lesson.tags ? JSON.stringify(lesson.tags) : null,
      task_description: lesson.task_description,
      initial_approach: lesson.initial_approach || null,
      success: lesson.success ? 1 : 0,
      error_message: lesson.error_message || null,
      error_pattern: lesson.error_pattern || this.extractErrorPattern(lesson.error_message),
      root_cause: lesson.root_cause || null,
      solution: lesson.solution || null,
      lesson_summary: lesson.lesson_summary,
      attempts_before_success: lesson.attempts_before_success || 1,
      time_to_resolution_ms: lesson.time_to_resolution_ms || null,
      relevance_score: lesson.relevance_score || 1.0
    });

    return result.lastInsertRowid as number;
  }

  /**
   * Query lessons relevant to a current task
   * Call this before starting any task to check for relevant insights
   */
  queryLessons(query: LessonQuery): Lesson[] {
    let sql = 'SELECT * FROM lessons WHERE 1=1';
    const params: Record<string, unknown> = {};

    if (query.task_type) {
      sql += ' AND task_type = @task_type';
      params.task_type = query.task_type;
    }

    if (query.category) {
      sql += ' AND category = @category';
      params.category = query.category;
    }

    if (query.error_pattern) {
      sql += ' AND error_pattern LIKE @error_pattern';
      params.error_pattern = `%${query.error_pattern}%`;
    }

    if (query.success_only) {
      sql += ' AND success = 1';
    }

    if (query.failure_only) {
      sql += ' AND success = 0';
    }

    if (query.min_relevance) {
      sql += ' AND relevance_score >= @min_relevance';
      params.min_relevance = query.min_relevance;
    }

    sql += ' ORDER BY relevance_score DESC, times_applied DESC, created_at DESC';

    if (query.limit) {
      sql += ' LIMIT @limit';
      params.limit = query.limit;
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(params) as Record<string, unknown>[];

    return rows.map(row => this.rowToLesson(row));
  }

  /**
   * Full-text search across all lesson content
   */
  searchLessons(searchText: string, limit: number = 10): Lesson[] {
    const stmt = this.db.prepare(`
      SELECT lessons.*
      FROM lessons_fts
      JOIN lessons ON lessons_fts.rowid = lessons.id
      WHERE lessons_fts MATCH @search_text
      ORDER BY rank
      LIMIT @limit
    `);

    const rows = stmt.all({
      search_text: searchText,
      limit
    }) as Record<string, unknown>[];

    return rows.map(row => this.rowToLesson(row));
  }

  /**
   * Find lessons that might help with a specific error
   */
  findLessonsForError(errorMessage: string, limit: number = 5): Lesson[] {
    const pattern = this.extractErrorPattern(errorMessage);

    // First try exact pattern match
    let lessons = this.queryLessons({
      error_pattern: pattern || undefined,
      success_only: true,
      limit
    });

    // If no exact matches, try full-text search
    if (lessons.length === 0) {
      const keywords = this.extractKeywords(errorMessage);
      if (keywords.length > 0) {
        lessons = this.searchLessons(keywords.join(' OR '), limit);
      }
    }

    return lessons;
  }

  /**
   * Mark a lesson as applied (increases relevance)
   */
  markLessonApplied(lessonId: number): void {
    const stmt = this.db.prepare(`
      UPDATE lessons
      SET times_applied = times_applied + 1,
          last_applied_at = CURRENT_TIMESTAMP,
          relevance_score = MIN(relevance_score * 1.1, 10.0)
      WHERE id = @id
    `);

    stmt.run({ id: lessonId });
  }

  /**
   * Log a task execution for history tracking
   */
  logTaskExecution(entry: TaskHistoryEntry): number {
    const stmt = this.db.prepare(`
      INSERT INTO task_history (
        task_type, command, working_directory,
        status, exit_code, output, error_output,
        duration_ms, lesson_id
      ) VALUES (
        @task_type, @command, @working_directory,
        @status, @exit_code, @output, @error_output,
        @duration_ms, @lesson_id
      )
    `);

    const result = stmt.run({
      task_type: entry.task_type,
      command: entry.command || null,
      working_directory: entry.working_directory || null,
      status: entry.status,
      exit_code: entry.exit_code ?? null,
      output: entry.output ? entry.output.substring(0, 10000) : null,
      error_output: entry.error_output ? entry.error_output.substring(0, 10000) : null,
      duration_ms: entry.duration_ms || null,
      lesson_id: entry.lesson_id || null
    });

    return result.lastInsertRowid as number;
  }

  /**
   * Get statistics about the knowledge base
   */
  getStats(): {
    total_lessons: number;
    successful_lessons: number;
    failed_lessons: number;
    total_tasks: number;
    most_common_categories: Array<{ category: string; count: number }>;
  } {
    const totalLessons = this.db.prepare('SELECT COUNT(*) as count FROM lessons').get() as { count: number };
    const successfulLessons = this.db.prepare('SELECT COUNT(*) as count FROM lessons WHERE success = 1').get() as { count: number };
    const failedLessons = this.db.prepare('SELECT COUNT(*) as count FROM lessons WHERE success = 0').get() as { count: number };
    const totalTasks = this.db.prepare('SELECT COUNT(*) as count FROM task_history').get() as { count: number };

    const categories = this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM lessons
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `).all() as Array<{ category: string; count: number }>;

    return {
      total_lessons: totalLessons.count,
      successful_lessons: successfulLessons.count,
      failed_lessons: failedLessons.count,
      total_tasks: totalTasks.count,
      most_common_categories: categories
    };
  }

  /**
   * Decay relevance scores over time (call periodically)
   */
  decayRelevanceScores(decayFactor: number = 0.99): void {
    const stmt = this.db.prepare(`
      UPDATE lessons
      SET relevance_score = relevance_score * @decay_factor
      WHERE relevance_score > 0.1
    `);

    stmt.run({ decay_factor: decayFactor });
  }

  /**
   * Get recent lessons for context injection
   */
  getRecentLessons(limit: number = 5): Lesson[] {
    const stmt = this.db.prepare(`
      SELECT * FROM lessons
      ORDER BY created_at DESC
      LIMIT @limit
    `);

    const rows = stmt.all({ limit }) as Record<string, unknown>[];
    return rows.map(row => this.rowToLesson(row));
  }

  /**
   * Get lessons by task type for context before similar tasks
   */
  getLessonsForTaskType(taskType: string, limit: number = 3): Lesson[] {
    return this.queryLessons({
      task_type: taskType,
      limit,
      min_relevance: 0.5
    });
  }

  /**
   * Extract a normalized error pattern for matching
   */
  private extractErrorPattern(errorMessage?: string): string | null {
    if (!errorMessage) return null;

    // Remove specific file paths, line numbers, timestamps
    let pattern = errorMessage
      .replace(/[A-Z]:\\[^\s]+/g, '<PATH>')           // Windows paths
      .replace(/\/[^\s]+/g, '<PATH>')                  // Unix paths
      .replace(/:\d+:\d+/g, ':<LINE>:<COL>')          // Line:col references
      .replace(/\d{4}-\d{2}-\d{2}/g, '<DATE>')        // Dates
      .replace(/\d{2}:\d{2}:\d{2}/g, '<TIME>')        // Times
      .replace(/0x[0-9a-fA-F]+/g, '<HEX>')            // Hex addresses
      .replace(/\b\d{5,}\b/g, '<NUM>')                // Large numbers
      .trim();

    // Take first 200 chars for pattern
    return pattern.substring(0, 200);
  }

  /**
   * Extract keywords from error message for search
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'again', 'further', 'then', 'once',
      'error', 'failed', 'cannot', 'unable'
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  private rowToLesson(row: Record<string, unknown>): Lesson {
    return {
      id: row.id as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      task_type: row.task_type as string,
      category: row.category as string | undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      task_description: row.task_description as string,
      initial_approach: row.initial_approach as string | undefined,
      success: (row.success as number) === 1,
      error_message: row.error_message as string | undefined,
      error_pattern: row.error_pattern as string | undefined,
      root_cause: row.root_cause as string | undefined,
      solution: row.solution as string | undefined,
      lesson_summary: row.lesson_summary as string,
      attempts_before_success: row.attempts_before_success as number | undefined,
      time_to_resolution_ms: row.time_to_resolution_ms as number | undefined,
      relevance_score: row.relevance_score as number | undefined,
      times_applied: row.times_applied as number | undefined,
      last_applied_at: row.last_applied_at as string | undefined
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance for global access
let knowledgeBaseInstance: KnowledgeBase | null = null;

export function getKnowledgeBase(): KnowledgeBase {
  if (!knowledgeBaseInstance) {
    knowledgeBaseInstance = new KnowledgeBase();
  }
  return knowledgeBaseInstance;
}

export function closeKnowledgeBase(): void {
  if (knowledgeBaseInstance) {
    knowledgeBaseInstance.close();
    knowledgeBaseInstance = null;
  }
}
