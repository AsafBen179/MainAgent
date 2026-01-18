/**
 * Memory Engine Database Schema
 *
 * Defines the structure for storing lessons learned, task outcomes,
 * and contextual knowledge for self-improvement.
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- Lessons learned from task execution
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Categorization
  task_type TEXT NOT NULL,           -- e.g., 'bug_fix', 'installation', 'configuration', 'coding'
  category TEXT,                      -- e.g., 'npm', 'git', 'typescript', 'windows'
  tags TEXT,                          -- JSON array of tags for searching

  -- Context
  task_description TEXT NOT NULL,     -- What was being attempted
  initial_approach TEXT,              -- The first approach tried

  -- Outcome
  success INTEGER NOT NULL DEFAULT 0, -- 1 = success, 0 = failure
  error_message TEXT,                 -- Error encountered (if any)
  error_pattern TEXT,                 -- Normalized error pattern for matching

  -- Learning
  root_cause TEXT,                    -- Why it failed/succeeded
  solution TEXT,                      -- What worked (the fix)
  lesson_summary TEXT NOT NULL,       -- Key takeaway in one sentence

  -- Metrics
  attempts_before_success INTEGER DEFAULT 1,
  time_to_resolution_ms INTEGER,

  -- Relevance
  relevance_score REAL DEFAULT 1.0,   -- Decays over time, boosted on reuse
  times_applied INTEGER DEFAULT 0,    -- How many times this lesson helped
  last_applied_at DATETIME
);

-- Index for fast searching
CREATE INDEX IF NOT EXISTS idx_lessons_task_type ON lessons(task_type);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);
CREATE INDEX IF NOT EXISTS idx_lessons_error_pattern ON lessons(error_pattern);
CREATE INDEX IF NOT EXISTS idx_lessons_relevance ON lessons(relevance_score DESC);

-- Full-text search for lesson content
CREATE VIRTUAL TABLE IF NOT EXISTS lessons_fts USING fts5(
  task_description,
  error_message,
  solution,
  lesson_summary,
  content='lessons',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS lessons_ai AFTER INSERT ON lessons BEGIN
  INSERT INTO lessons_fts(rowid, task_description, error_message, solution, lesson_summary)
  VALUES (new.id, new.task_description, new.error_message, new.solution, new.lesson_summary);
END;

CREATE TRIGGER IF NOT EXISTS lessons_ad AFTER DELETE ON lessons BEGIN
  INSERT INTO lessons_fts(lessons_fts, rowid, task_description, error_message, solution, lesson_summary)
  VALUES ('delete', old.id, old.task_description, old.error_message, old.solution, old.lesson_summary);
END;

CREATE TRIGGER IF NOT EXISTS lessons_au AFTER UPDATE ON lessons BEGIN
  INSERT INTO lessons_fts(lessons_fts, rowid, task_description, error_message, solution, lesson_summary)
  VALUES ('delete', old.id, old.task_description, old.error_message, old.solution, old.lesson_summary);
  INSERT INTO lessons_fts(rowid, task_description, error_message, solution, lesson_summary)
  VALUES (new.id, new.task_description, new.error_message, new.solution, new.lesson_summary);
END;

-- Task execution history for pattern analysis
CREATE TABLE IF NOT EXISTS task_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  task_type TEXT NOT NULL,
  command TEXT,
  working_directory TEXT,

  status TEXT NOT NULL,               -- 'started', 'completed', 'failed', 'blocked'
  exit_code INTEGER,
  output TEXT,
  error_output TEXT,

  duration_ms INTEGER,
  lesson_id INTEGER,                  -- Link to lesson if one was created

  FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE INDEX IF NOT EXISTS idx_task_history_type ON task_history(task_type);
CREATE INDEX IF NOT EXISTS idx_task_history_status ON task_history(status);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial version
INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});
`;

export interface Lesson {
  id?: number;
  created_at?: string;
  updated_at?: string;

  task_type: string;
  category?: string;
  tags?: string[];

  task_description: string;
  initial_approach?: string;

  success: boolean;
  error_message?: string;
  error_pattern?: string;

  root_cause?: string;
  solution?: string;
  lesson_summary: string;

  attempts_before_success?: number;
  time_to_resolution_ms?: number;

  relevance_score?: number;
  times_applied?: number;
  last_applied_at?: string;
}

export interface TaskHistoryEntry {
  id?: number;
  created_at?: string;

  task_type: string;
  command?: string;
  working_directory?: string;

  status: 'started' | 'completed' | 'failed' | 'blocked';
  exit_code?: number;
  output?: string;
  error_output?: string;

  duration_ms?: number;
  lesson_id?: number;
}

export interface LessonQuery {
  task_type?: string;
  category?: string;
  tags?: string[];
  search_text?: string;
  error_pattern?: string;
  success_only?: boolean;
  failure_only?: boolean;
  limit?: number;
  min_relevance?: number;
}
