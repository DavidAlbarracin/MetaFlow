import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import db, { initDB } from './db.js';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database tables
initDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Set up static uploads folder for user backgrounds
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `background-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});

/* ==========================================================================
   1. USER PROFILE ENDPOINTS
   ========================================================================== */
app.get('/api/profile', (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM user_profile ORDER BY id LIMIT 1').get();
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profile', (req, res) => {
  try {
    const current = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as any;
    if (!current) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    const username = req.body.username !== undefined ? req.body.username : current.username;
    const bio = req.body.bio !== undefined ? req.body.bio : current.bio;
    const theme_palette = req.body.theme_palette !== undefined ? req.body.theme_palette : current.theme_palette;
    const bg_opacity = req.body.bg_opacity !== undefined ? req.body.bg_opacity : current.bg_opacity;
    const bg_blur = req.body.bg_blur !== undefined ? req.body.bg_blur : current.bg_blur;
    const avatar_path = req.body.avatar_path !== undefined ? req.body.avatar_path : current.avatar_path;

    db.prepare(`
      UPDATE user_profile 
      SET username = ?, bio = ?, theme_palette = ?, bg_opacity = ?, bg_blur = ?, avatar_path = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(username, bio, theme_palette, bg_opacity, bg_blur, avatar_path);
    const updated = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/profile/avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const avatarPath = `/uploads/${req.file.filename}`;

    // Delete the old avatar file if it exists
    const current = db.prepare('SELECT avatar_path FROM user_profile WHERE id = 1').get() as { avatar_path?: string };
    if (current && current.avatar_path) {
      const oldFilename = path.basename(current.avatar_path);
      const oldFilePath = path.join(uploadDir, oldFilename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error("Error deleting old avatar file:", err);
        }
      }
    }

    db.prepare('UPDATE user_profile SET avatar_path = ? WHERE id = 1').run(avatarPath);
    const updated = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/profile/avatar', (req, res) => {
  try {
    const current = db.prepare('SELECT avatar_path FROM user_profile WHERE id = 1').get() as { avatar_path?: string };
    if (current && current.avatar_path) {
      const oldFilename = path.basename(current.avatar_path);
      const oldFilePath = path.join(uploadDir, oldFilename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error("Error deleting avatar file:", err);
        }
      }
    }

    db.prepare('UPDATE user_profile SET avatar_path = NULL WHERE id = 1').run();
    const updated = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/profile/background', upload.single('background'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const bgPath = `/uploads/${req.file.filename}`;

    // Delete the old background file to prevent storage bloat
    const current = db.prepare('SELECT bg_image_path FROM user_profile WHERE id = 1').get() as { bg_image_path?: string };
    if (current && current.bg_image_path) {
      const oldFilename = path.basename(current.bg_image_path);
      const oldFilePath = path.join(uploadDir, oldFilename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error("Error deleting old background file:", err);
        }
      }
    }

    db.prepare('UPDATE user_profile SET bg_image_path = ? WHERE id = 1').run(bgPath);
    const updated = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/profile/background', (req, res) => {
  try {
    const current = db.prepare('SELECT bg_image_path FROM user_profile WHERE id = 1').get() as { bg_image_path?: string };
    if (current && current.bg_image_path) {
      const oldFilename = path.basename(current.bg_image_path);
      const oldFilePath = path.join(uploadDir, oldFilename);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error("Error deleting background file:", err);
        }
      }
    }

    db.prepare('UPDATE user_profile SET bg_image_path = NULL WHERE id = 1').run();
    const updated = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   2. GOALS ENDPOINTS
   ========================================================================== */
app.get('/api/goals', (req, res) => {
  try {
    const goals = db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all();
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/goals', (req, res) => {
  try {
    const { title, description, status, due_date, color } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO goals (id, title, description, status, due_date, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', status || 'active', due_date || null, color || '#3b82f6');
    const created = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/goals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, due_date, color } = req.body;
    db.prepare(`
      UPDATE goals 
      SET title = ?, description = ?, status = ?, due_date = ?, color = ?
      WHERE id = ?
    `).run(title, description || '', status, due_date || null, color, id);
    const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/goals/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM goals WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   3. PROJECTS ENDPOINTS
   ========================================================================== */
app.get('/api/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const { title, description, goal_id, status, due_date, color, contact_id } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO projects (id, title, description, goal_id, status, due_date, color, contact_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', goal_id || null, status || 'planning', due_date || null, color || '#10b981', contact_id || null);
    const created = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, goal_id, status, due_date, color, contact_id } = req.body;
    db.prepare(`
      UPDATE projects 
      SET title = ?, description = ?, goal_id = ?, status = ?, due_date = ?, color = ?, contact_id = ?
      WHERE id = ?
    `).run(title, description || '', goal_id || null, status, due_date || null, color, contact_id || null, id);
    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   4. TASKS ENDPOINTS
   ========================================================================== */
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, project_id, goal_id, status, priority, due_date, is_pinned } = req.body;
    const id = crypto.randomUUID();
    const isPinnedVal = is_pinned ? 1 : 0;
    const completedAtVal = (status === 'done') ? new Date().toISOString() : null;
    db.prepare(`
      INSERT INTO tasks (id, title, description, project_id, goal_id, status, priority, due_date, is_pinned, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', project_id || null, goal_id || null, status || 'todo', priority || 'medium', due_date || null, isPinnedVal, completedAtVal);
    const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, project_id, goal_id, status, priority, due_date, pomodoros_completed, is_pinned } = req.body;
    const current = db.prepare('SELECT status, completed_at, is_pinned FROM tasks WHERE id = ?').get(id) as any;
    if (!current) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    let completed_at = current.completed_at;
    if (status === 'done') {
      if (!completed_at) {
        completed_at = new Date().toISOString();
      }
    } else {
      completed_at = null;
    }

    const isPinnedVal = is_pinned !== undefined ? (is_pinned ? 1 : 0) : current.is_pinned;

    db.prepare(`
      UPDATE tasks 
      SET title = ?, description = ?, project_id = ?, goal_id = ?, status = ?, priority = ?, due_date = ?, pomodoros_completed = ?, is_pinned = ?, completed_at = ?
      WHERE id = ?
    `).run(title, description || '', project_id || null, goal_id || null, status, priority, due_date || null, pomodoros_completed || 0, isPinnedVal, completed_at, id);
    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   5. HABITS ENDPOINTS
   ========================================================================== */
app.get('/api/habits', (req, res) => {
  try {
    const habits = db.prepare('SELECT * FROM habits ORDER BY created_at DESC').all();
    res.json(habits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/habits', (req, res) => {
  try {
    const { title, frequency } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO habits (id, title, frequency)
      VALUES (?, ?, ?)
    `).run(id, title, frequency || 'daily');
    const created = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/habits/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, frequency } = req.body;
    db.prepare(`
      UPDATE habits
      SET title = ?, frequency = ?
      WHERE id = ?
    `).run(title, frequency || 'daily', id);
    const updated = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/habits/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM habits WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/habits/logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM habit_logs').all();
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/habits/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body; // YYYY-MM-DD
    if (!date) {
      res.status(400).json({ error: 'Date is required (format YYYY-MM-DD)' });
      return;
    }

    const existing = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND completed_date = ?').get(id, date);
    if (existing) {
      db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND completed_date = ?').run(id, date);
      res.json({ toggled: false });
    } else {
      const logId = crypto.randomUUID();
      try {
        db.prepare('INSERT INTO habit_logs (id, habit_id, completed_date) VALUES (?, ?, ?)').run(logId, id, date);
        res.json({ toggled: true });
      } catch (err: any) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message.includes('UNIQUE constraint failed')) {
          res.status(409).json({ error: 'Habit log already exists for this date' });
        } else {
          throw err;
        }
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   6. FOCUS SESSIONS (POMODORO) ENDPOINTS
   ========================================================================== */
app.get('/api/focus', (req, res) => {
  try {
    const sessions = db.prepare('SELECT * FROM focus_sessions ORDER BY completed_at DESC LIMIT 100').all();
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/focus', (req, res) => {
  try {
    const { task_id, duration_minutes } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO focus_sessions (id, task_id, duration_minutes)
      VALUES (?, ?, ?)
    `).run(id, task_id || null, duration_minutes || 25);

    if (task_id) {
      db.prepare('UPDATE tasks SET pomodoros_completed = pomodoros_completed + 1 WHERE id = ?').run(task_id);
    }

    const created = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   7. NOTES & WIKI ENDPOINTS
   ========================================================================== */
app.get('/api/notes', (req, res) => {
  try {
    const notes = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const { title, content, category, contact_id } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO notes (id, title, content, category, contact_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, title, content || '', category || 'wiki', contact_id || null);
    const created = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, contact_id } = req.body;
    db.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, category = ?, contact_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content || '', category || 'wiki', contact_id || null, id);
    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   8. CRM CONTACTS ENDPOINTS
   ========================================================================== */
app.get('/api/crm/contacts', (req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM crm_contacts ORDER BY name ASC').all();
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/crm/contacts', (req, res) => {
  try {
    const { name, email, phone, company, keep_in_touch_interval } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO crm_contacts (id, name, email, phone, company, keep_in_touch_interval)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, email || '', phone || '', company || '', keep_in_touch_interval || 30);
    const created = db.prepare('SELECT * FROM crm_contacts WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/crm/contacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, keep_in_touch_interval, last_interaction_date } = req.body;
    db.prepare(`
      UPDATE crm_contacts 
      SET name = ?, email = ?, phone = ?, company = ?, keep_in_touch_interval = ?, last_interaction_date = ?
      WHERE id = ?
    `).run(name, email || '', phone || '', company || '', keep_in_touch_interval || 30, last_interaction_date || null, id);
    const updated = db.prepare('SELECT * FROM crm_contacts WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/crm/contacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.transaction(() => {
      db.prepare('UPDATE projects SET contact_id = NULL WHERE contact_id = ?').run(id);
      db.prepare('DELETE FROM crm_contacts WHERE id = ?').run(id);
    })();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   9. CRM INTERACTIONS ENDPOINTS
   ========================================================================== */
app.get('/api/crm/interactions', (req, res) => {
  try {
    const interactions = db.prepare('SELECT * FROM crm_interactions ORDER BY date DESC').all();
    res.json(interactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/crm/interactions', (req, res) => {
  try {
    const { contact_id, type, summary, date } = req.body;
    const id = crypto.randomUUID();
    const dateVal = date || new Date().toISOString().split('T')[0];

    db.transaction(() => {
      db.prepare(`
        INSERT INTO crm_interactions (id, contact_id, type, summary, date)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, contact_id, type, summary || '', dateVal);

      db.prepare(`
        UPDATE crm_contacts 
        SET last_interaction_date = ? 
        WHERE id = ?
      `).run(dateVal, contact_id);
    })();

    const created = db.prepare('SELECT * FROM crm_interactions WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/crm/interactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const interaction = db.prepare('SELECT contact_id FROM crm_interactions WHERE id = ?').get(id) as { contact_id: string } | undefined;
    db.transaction(() => {
      db.prepare('DELETE FROM crm_interactions WHERE id = ?').run(id);
      if (interaction) {
        const latest = db.prepare('SELECT MAX(date) as last FROM crm_interactions WHERE contact_id = ?').get(interaction.contact_id) as { last: string | null };
        db.prepare('UPDATE crm_contacts SET last_interaction_date = ? WHERE id = ?').run(latest.last ?? null, interaction.contact_id);
      }
    })();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


/* ==========================================================================
   10. CALENDAR EVENTS ENDPOINTS
   ========================================================================== */
app.get('/api/events', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY date ASC').all();
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events', (req, res) => {
  try {
    const { title, description, date, time, meeting_link } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and Date are required' });
    }
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO events (id, title, description, time, meeting_link, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, description || null, time || null, meeting_link || null, date);
    const created = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`[MetaFlow Server] running on http://localhost:${PORT}`);
});
