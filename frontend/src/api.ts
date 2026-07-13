const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


export interface UserProfile {
  id: number;
  username: string;
  bio: string;
  theme_palette: 'sapphire' | 'emerald' | 'amethyst' | 'ruby' | 'obsidian';
  bg_image_path: string | null;
  bg_opacity: number;
  bg_blur: number;
  avatar_path: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  due_date: string | null;
  color: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  goal_id: string | null;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  due_date: string | null;
  color: string;
  contact_id?: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'wiki' | 'general' | 'personal';
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  last_interaction_date: string | null;
  keep_in_touch_interval: number;
  created_at: string;
}

export interface CRMInteraction {
  id: string;
  contact_id: string;
  type: 'email' | 'call' | 'meeting' | 'message';
  summary: string;
  date: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  time?: string | null;
  meeting_link?: string | null;
  date: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project_id: string | null;
  goal_id: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  pomodoros_completed: number;
  is_pinned?: number;
  completed_at?: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  completed_date: string; // YYYY-MM-DD
}

export interface FocusSession {
  id: string;
  task_id: string | null;
  duration_minutes: number;
  completed_at: string;
}

export const api = {
  // Profile & Settings
  getProfile: async (): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/profile`);
    if (!res.ok) throw new Error('Error fetching profile');
    return res.json();
  },
  updateProfile: async (profile: Partial<UserProfile>): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error('Error updating profile');
    return res.json();
  },
  uploadBackground: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('background', file);
    const res = await fetch(`${BASE_URL}/profile/background`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Error uploading background');
    return res.json();
  },
  deleteBackground: async (): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/profile/background`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting background');
    return res.json();
  },
  uploadAvatar: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Error uploading avatar');
    return res.json();
  },
  deleteAvatar: async (): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting avatar');
    return res.json();
  },

  // Goals
  getGoals: async (): Promise<Goal[]> => {
    const res = await fetch(`${BASE_URL}/goals`);
    if (!res.ok) throw new Error('Error fetching goals');
    return res.json();
  },
  createGoal: async (goal: Partial<Goal>): Promise<Goal> => {
    const res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Error creating goal');
    return res.json();
  },
  updateGoal: async (id: string, goal: Partial<Goal>): Promise<Goal> => {
    const res = await fetch(`${BASE_URL}/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!res.ok) throw new Error('Error updating goal');
    return res.json();
  },
  deleteGoal: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/goals/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting goal');
    return res.json();
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    const res = await fetch(`${BASE_URL}/projects`);
    if (!res.ok) throw new Error('Error fetching projects');
    return res.json();
  },
  createProject: async (project: Partial<Project>): Promise<Project> => {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Error creating project');
    return res.json();
  },
  updateProject: async (id: string, project: Partial<Project>): Promise<Project> => {
    const res = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Error updating project');
    return res.json();
  },
  deleteProject: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting project');
    return res.json();
  },

  // Tasks
  getTasks: async (): Promise<Task[]> => {
    const res = await fetch(`${BASE_URL}/tasks`);
    if (!res.ok) throw new Error('Error fetching tasks');
    return res.json();
  },
  createTask: async (task: Partial<Task>): Promise<Task> => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Error creating task');
    return res.json();
  },
  updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Error updating task');
    return res.json();
  },
  deleteTask: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting task');
    return res.json();
  },

  // Habits
  getHabits: async (): Promise<Habit[]> => {
    const res = await fetch(`${BASE_URL}/habits`);
    if (!res.ok) throw new Error('Error fetching habits');
    return res.json();
  },
  createHabit: async (habit: Partial<Habit>): Promise<Habit> => {
    const res = await fetch(`${BASE_URL}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habit),
    });
    if (!res.ok) throw new Error('Error creating habit');
    return res.json();
  },
  updateHabit: async (id: string, habit: Partial<Habit>): Promise<Habit> => {
    const res = await fetch(`${BASE_URL}/habits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habit),
    });
    if (!res.ok) throw new Error('Error updating habit');
    return res.json();
  },
  deleteHabit: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/habits/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting habit');
    return res.json();
  },
  getHabitLogs: async (): Promise<HabitLog[]> => {
    const res = await fetch(`${BASE_URL}/habits/logs`);
    if (!res.ok) throw new Error('Error fetching habit logs');
    return res.json();
  },
  toggleHabit: async (id: string, date: string): Promise<{ toggled: boolean }> => {
    const res = await fetch(`${BASE_URL}/habits/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    if (!res.ok) throw new Error('Error toggling habit');
    return res.json();
  },

  // Focus Sessions
  getFocusSessions: async (): Promise<FocusSession[]> => {
    const res = await fetch(`${BASE_URL}/focus`);
    if (!res.ok) throw new Error('Error fetching focus sessions');
    return res.json();
  },
  createFocusSession: async (session: { task_id: string | null; duration_minutes: number }): Promise<FocusSession> => {
    const res = await fetch(`${BASE_URL}/focus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error('Error logging focus session');
    return res.json();
  },

  // Notes
  getNotes: async (): Promise<Note[]> => {
    const res = await fetch(`${BASE_URL}/notes`);
    if (!res.ok) throw new Error('Error fetching notes');
    return res.json();
  },
  createNote: async (note: Partial<Note>): Promise<Note> => {
    const res = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Error creating note');
    return res.json();
  },
  updateNote: async (id: string, note: Partial<Note>): Promise<Note> => {
    const res = await fetch(`${BASE_URL}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Error updating note');
    return res.json();
  },
  deleteNote: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/notes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting note');
    return res.json();
  },

  // CRM Contacts
  getCRMContacts: async (): Promise<CRMContact[]> => {
    const res = await fetch(`${BASE_URL}/crm/contacts`);
    if (!res.ok) throw new Error('Error fetching CRM contacts');
    return res.json();
  },
  createCRMContact: async (contact: Partial<CRMContact>): Promise<CRMContact> => {
    const res = await fetch(`${BASE_URL}/crm/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    if (!res.ok) throw new Error('Error creating CRM contact');
    return res.json();
  },
  updateCRMContact: async (id: string, contact: Partial<CRMContact>): Promise<CRMContact> => {
    const res = await fetch(`${BASE_URL}/crm/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });
    if (!res.ok) throw new Error('Error updating CRM contact');
    return res.json();
  },
  deleteCRMContact: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/crm/contacts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting CRM contact');
    return res.json();
  },

  // CRM Interactions
  getCRMInteractions: async (): Promise<CRMInteraction[]> => {
    const res = await fetch(`${BASE_URL}/crm/interactions`);
    if (!res.ok) throw new Error('Error fetching CRM interactions');
    return res.json();
  },
  createCRMInteraction: async (interaction: Partial<CRMInteraction>): Promise<CRMInteraction> => {
    const res = await fetch(`${BASE_URL}/crm/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interaction),
    });
    if (!res.ok) throw new Error('Error logging CRM interaction');
    return res.json();
  },
  deleteCRMInteraction: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/crm/interactions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting CRM interaction');
    return res.json();
  },

  // Calendar Events
  getEvents: async (): Promise<CalendarEvent[]> => {
    const res = await fetch(`${BASE_URL}/events`);
    if (!res.ok) throw new Error('Error fetching calendar events');
    return res.json();
  },
  createEvent: async (event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) throw new Error('Error creating calendar event');
    return res.json();
  },
  deleteEvent: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/events/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error deleting calendar event');
    return res.json();
  },
};
export default api;
