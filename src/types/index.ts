/**
 * Concurio — Core Type Definitions
 * Трекер задач и конкурсов
 */

// ========================
// Task / Contest
// ========================

/** Возможные статусы */
export type ContestStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

/** Тип сущности: конкурс или обычная задача */
export type TaskType = 'contest' | 'task' | 'personal' | 'reminder';

/** Приоритет */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Задача / конкурс — основная сущность */
export interface Contest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: ContestStatus;
  progress: number;
  telegram_message_links: string[];
  task_type: TaskType;
  priority: TaskPriority;
  tags: string[];
  color: string | null;
  created_at: string;
  updated_at: string;
}

/** Алиас для ясности в UI */
export type Task = Contest;

/** Данные для создания */
export interface ContestInsert {
  title: string;
  description?: string | null;
  due_date?: string | null;
  status?: ContestStatus;
  progress?: number;
  telegram_message_links?: string[];
  task_type?: TaskType;
  priority?: TaskPriority;
  tags?: string[];
  color?: string | null;
}

/** Данные для обновления */
export interface ContestUpdate {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  status?: ContestStatus;
  progress?: number;
  telegram_message_links?: string[];
  task_type?: TaskType;
  priority?: TaskPriority;
  tags?: string[];
  color?: string | null;
}

// ========================
// Attachment
// ========================

export type FileType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'image/jpeg'
  | 'image/png';

export interface Attachment {
  id: string;
  contest_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export interface AttachmentInsert {
  contest_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number | null;
}

// ========================
// Dashboard & Statistics
// ========================

export interface DashboardStats {
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  completedThisWeek: number;
  upcomingDeadlines: number;
  contests: number;
  tasks: number;
}

export type DeadlineUrgency = 'overdue' | 'urgent' | 'normal' | 'safe';

// ========================
// Filters & Sorting
// ========================

export interface ContestFilters {
  status: ContestStatus | 'all';
  taskType: TaskType | 'all';
  priority: TaskPriority | 'all';
  search: string;
  sortBy: 'due_date' | 'created_at' | 'title' | 'priority';
  sortOrder: 'asc' | 'desc';
}

// ========================
// Auth
// ========================

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface AppUser {
  id: string;
  email: string | null;
  telegram_id?: number;
  display_name: string;
  avatar_url?: string;
  auth_provider?: 'email' | 'telegram';
}

// ========================
// Telegram Mini App
// ========================

export interface TelegramTheme {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

// ========================
// App State
// ========================

export type ThemeMode = 'light' | 'dark' | 'system';

// ========================
// Checklist / Comments / Activity
// ========================

export interface ChecklistItem {
  id: string;
  contest_id: string;
  user_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  contest_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  contest_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export type ViewMode = 'list' | 'kanban' | 'calendar';
