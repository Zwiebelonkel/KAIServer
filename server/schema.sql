CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  content TEXT NOT NULL,
  min_level TEXT NOT NULL CHECK (min_level IN ('Einsteiger', 'Basics', 'Fortgeschritten')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS module_glossary_items (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS module_quiz_questions (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level TEXT CHECK (level IN ('Einsteiger', 'Basics', 'Fortgeschritten')),
  completed_modules_json TEXT NOT NULL DEFAULT '[]',
  quiz_scores_json TEXT NOT NULL DEFAULT '{}',
  total_progress INTEGER NOT NULL DEFAULT 0,
  trophies_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
