import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// In ES modules (since NodeNext resolves with ESM), __dirname is not available directly.
// Let's resolve the path relative to the file.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDB() {
  // Create tables in order of dependency
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT DEFAULT 'Productive User',
        bio TEXT DEFAULT 'Mi espacio de MetaFlow',
        theme_palette TEXT DEFAULT 'sapphire',
        bg_image_path TEXT,
        bg_opacity REAL DEFAULT 0.15,
        bg_blur INTEGER DEFAULT 8,
        avatar_path TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active', -- active, completed, archived
        due_date TEXT,
        color TEXT DEFAULT '#3b82f6',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        goal_id TEXT,
        status TEXT DEFAULT 'planning', -- planning, active, completed, on_hold
        due_date TEXT,
        color TEXT DEFAULT '#10b981',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        project_id TEXT,
        goal_id TEXT,
        status TEXT DEFAULT 'todo', -- todo, in_progress, done
        priority TEXT DEFAULT 'medium', -- low, medium, high
        due_date TEXT,
        pomodoros_completed INTEGER DEFAULT 0,
        is_pinned INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        frequency TEXT DEFAULT 'daily', -- daily, weekly
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL,
        completed_date TEXT NOT NULL, -- YYYY-MM-DD
        FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        UNIQUE(habit_id, completed_date)
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        duration_minutes INTEGER NOT NULL,
        completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS crm_contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        last_interaction_date TEXT,
        keep_in_touch_interval INTEGER DEFAULT 30,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT DEFAULT 'wiki',
        contact_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL
    );


    CREATE TABLE IF NOT EXISTS crm_interactions (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        type TEXT NOT NULL,
        summary TEXT,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        time TEXT,
        meeting_link TEXT,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Self-healing migration for existing databases to add avatar_path
  try {
    db.exec('ALTER TABLE user_profile ADD COLUMN avatar_path TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  // Self-healing migrations for tasks
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN completed_at TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    db.exec('ALTER TABLE tasks ADD COLUMN is_pinned INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    db.exec('ALTER TABLE projects ADD COLUMN contact_id TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  // Self-healing migrations for events
  try {
    db.exec('ALTER TABLE events ADD COLUMN time TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    db.exec('ALTER TABLE events ADD COLUMN meeting_link TEXT');
  } catch (e) {
    // Column already exists, ignore
  }

  // Ensure there is at least one profile row
  const rowCount = db.prepare('SELECT count(*) as count FROM user_profile').get() as { count: number };
  if (rowCount.count === 0) {
    db.prepare('INSERT INTO user_profile (username, bio) VALUES (?, ?)').run('Productive User', 'Mi espacio de MetaFlow');
  } else {
    // Healing: Restore defaults if bug wiped them to NULL
    db.prepare("UPDATE user_profile SET theme_palette = 'sapphire' WHERE theme_palette IS NULL").run();
    db.prepare("UPDATE user_profile SET bg_opacity = 0.15 WHERE bg_opacity IS NULL").run();
    db.prepare("UPDATE user_profile SET bg_blur = 8 WHERE bg_blur IS NULL").run();
  }
}

export default db;
