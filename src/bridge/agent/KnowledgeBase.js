/**
 * Knowledge Base - Self-Learning Memory Engine (JavaScript port)
 *
 * Stores and retrieves lessons learned from task execution.
 * The agent uses this to avoid repeating mistakes and apply past solutions.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type TEXT NOT NULL,
  category TEXT,
  tags TEXT,
  task_description TEXT NOT NULL,
  initial_approach TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  error_pattern TEXT,
  root_cause TEXT,
  solution TEXT,
  lesson_summary TEXT NOT NULL,
  attempts_before_success INTEGER DEFAULT 1,
  time_to_resolution_ms INTEGER,
  relevance_score REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lessons_task_type ON lessons(task_type);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);
CREATE INDEX IF NOT EXISTS idx_lessons_success ON lessons(success);
CREATE INDEX IF NOT EXISTS idx_lessons_error_pattern ON lessons(error_pattern);

CREATE TABLE IF NOT EXISTS task_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_type TEXT NOT NULL,
  task_description TEXT NOT NULL,
  command_executed TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  output TEXT,
  error TEXT,
  duration_ms INTEGER,
  lessons_applied TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_history_type ON task_history(task_type);
CREATE INDEX IF NOT EXISTS idx_task_history_created ON task_history(created_at);
`;

class KnowledgeBase {
  constructor(dbPath) {
    // Default to memory directory in project root
    const memoryDir = dbPath ? path.dirname(dbPath) : path.join(process.cwd(), 'memory');
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    this.dbPath = dbPath || path.join(memoryDir, 'knowledge.db');

    try {
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL');

      // Initialize schema
      this.initializeSchema();

      logger.info('KnowledgeBase initialized', { path: this.dbPath });
    } catch (error) {
      logger.error('Failed to initialize KnowledgeBase', { error: error.message });
      this.db = null;
    }
  }

  initializeSchema() {
    if (this.db) {
      this.db.exec(CREATE_TABLES_SQL);
    }
  }

  /**
   * Save a lesson learned from a task execution
   */
  saveLesson(lesson) {
    if (!this.db) return null;

    try {
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

      logger.info('Lesson saved', { id: result.lastInsertRowid, task_type: lesson.task_type });
      return result.lastInsertRowid;
    } catch (error) {
      logger.error('Failed to save lesson', { error: error.message });
      return null;
    }
  }

  /**
   * Query lessons relevant to a current task
   */
  queryLessons(query) {
    if (!this.db) return [];

    try {
      let sql = 'SELECT * FROM lessons WHERE 1=1';
      const params = {};

      if (query.task_type) {
        sql += ' AND task_type = @task_type';
        params.task_type = query.task_type;
      }

      if (query.category) {
        sql += ' AND category = @category';
        params.category = query.category;
      }

      if (query.success !== undefined) {
        sql += ' AND success = @success';
        params.success = query.success ? 1 : 0;
      }

      if (query.error_pattern) {
        sql += ' AND error_pattern LIKE @error_pattern';
        params.error_pattern = `%${query.error_pattern}%`;
      }

      if (query.search_text) {
        sql += ' AND (task_description LIKE @search OR lesson_summary LIKE @search OR solution LIKE @search)';
        params.search = `%${query.search_text}%`;
      }

      sql += ' ORDER BY relevance_score DESC, created_at DESC';

      if (query.limit) {
        sql += ` LIMIT ${parseInt(query.limit)}`;
      }

      const stmt = this.db.prepare(sql);
      const rows = stmt.all(params);

      // Parse JSON fields
      return rows.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        success: Boolean(row.success)
      }));
    } catch (error) {
      logger.error('Failed to query lessons', { error: error.message });
      return [];
    }
  }

  /**
   * Find lessons relevant to a specific error
   */
  findLessonsForError(errorMessage) {
    const pattern = this.extractErrorPattern(errorMessage);
    return this.queryLessons({
      error_pattern: pattern,
      success: true,  // Find successful resolutions
      limit: 5
    });
  }

  /**
   * Save task execution to history
   */
  saveTaskHistory(entry) {
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO task_history (
          task_type, task_description, command_executed,
          success, output, error, duration_ms, lessons_applied
        ) VALUES (
          @task_type, @task_description, @command_executed,
          @success, @output, @error, @duration_ms, @lessons_applied
        )
      `);

      const result = stmt.run({
        task_type: entry.task_type,
        task_description: entry.task_description,
        command_executed: entry.command_executed || null,
        success: entry.success ? 1 : 0,
        output: entry.output ? entry.output.substring(0, 10000) : null,
        error: entry.error || null,
        duration_ms: entry.duration_ms || null,
        lessons_applied: entry.lessons_applied ? JSON.stringify(entry.lessons_applied) : null
      });

      return result.lastInsertRowid;
    } catch (error) {
      logger.error('Failed to save task history', { error: error.message });
      return null;
    }
  }

  /**
   * Extract error pattern from error message for matching
   */
  extractErrorPattern(errorMessage) {
    if (!errorMessage) return null;

    // Remove specific values to get generic pattern
    let pattern = errorMessage
      .replace(/line \d+/gi, 'line N')
      .replace(/column \d+/gi, 'column N')
      .replace(/at position \d+/gi, 'at position N')
      .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE')
      .replace(/\d{2}:\d{2}:\d{2}/g, 'TIME')
      .replace(/0x[0-9a-f]+/gi, 'HEX')
      .replace(/\b\d+\b/g, 'N')
      .substring(0, 200);

    return pattern;
  }

  /**
   * Get statistics about the knowledge base
   */
  getStats() {
    if (!this.db) {
      return { total_lessons: 0, successful_lessons: 0, failed_lessons: 0 };
    }

    try {
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_lessons,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_lessons,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_lessons
        FROM lessons
      `).get();

      return stats;
    } catch (error) {
      return { total_lessons: 0, successful_lessons: 0, failed_lessons: 0 };
    }
  }

  /**
   * Format lessons for injection into prompt
   */
  formatLessonsForPrompt(lessons) {
    if (!lessons || lessons.length === 0) return '';

    const formatted = lessons.map((lesson, i) => {
      let text = `\n[Lesson ${i + 1}] ${lesson.task_type}`;
      if (lesson.success) {
        text += ` (SUCCESS)`;
        if (lesson.solution) text += `\n  Solution: ${lesson.solution}`;
      } else {
        text += ` (FAILED)`;
        if (lesson.error_message) text += `\n  Error: ${lesson.error_message}`;
        if (lesson.root_cause) text += `\n  Root cause: ${lesson.root_cause}`;
      }
      text += `\n  Lesson: ${lesson.lesson_summary}`;
      return text;
    }).join('\n');

    return `\n--- RELEVANT PAST LESSONS ---${formatted}\n--- END LESSONS ---\n`;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let instance = null;

function getKnowledgeBase(dbPath) {
  if (!instance) {
    instance = new KnowledgeBase(dbPath);
  }
  return instance;
}

function closeKnowledgeBase() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

module.exports = {
  KnowledgeBase,
  getKnowledgeBase,
  closeKnowledgeBase
};
