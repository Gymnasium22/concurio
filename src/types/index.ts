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

/** Повторение задачи */
export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly';

/** Задача / конкурс — основная сущность (Entry/Task) */
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
  /** null = корневая задача; иначе id родителя (подзадача) */
  parent_id: string | null;
  /** Порядок среди соседей (подзадачи одного parent_id) */
  position: number;
  recurrence: RecurrenceRule;
  recurrence_until: string | null;
  workspace_id: string | null;
  deleted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  /** UI: ближайший дедлайн незакрытого этапа (обогащение списка) */
  next_stage_due_date?: string | null;
  next_stage_title?: string | null;
  subtask_count?: number;
  subtask_done_count?: number;
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
  parent_id?: string | null;
  position?: number;
  recurrence?: RecurrenceRule;
  recurrence_until?: string | null;
  workspace_id?: string | null;
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
  parent_id?: string | null;
  position?: number;
  recurrence?: RecurrenceRule;
  recurrence_until?: string | null;
  workspace_id?: string | null;
  deleted_at?: string | null;
  completed_at?: string | null;
}

// ========================
// Attachment
// ========================

export type FileType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'application/vnd.ms-powerpoint'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif';

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

// ========================
// Workspace / Platform
// ========================

export type WorkspaceRole = 'owner' | 'member' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  token: string;
  email: string | null;
  role: 'member' | 'viewer';
  created_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export type HomeWidgetId =
  'stats' | 'deadlines' | 'list' | 'heatmap' | 'analytics' | 'activity';

export interface UserPreferences {
  user_id: string;
  widgets: HomeWidgetId[];
  onboarding_done: boolean;
  /** Присылать дайджест в Telegram-бот */
  tg_notify_enabled: boolean;
  /** Час UTC для утреннего дайджеста (0–23) */
  tg_digest_hour: number;
  tg_last_digest_at: string | null;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  enabled: boolean;
  trigger_on: 'on_create' | 'on_update' | 'on_status';
  conditions: {
    title_contains?: string;
    task_type?: TaskType;
    priority?: TaskPriority;
    tag?: string;
  };
  actions: {
    add_tags?: string[];
    set_status?: ContestStatus;
    set_priority?: TaskPriority;
  };
  created_at: string;
}

export interface AnalyticsBundle {
  onTimeRate: number;
  leadTimeDaysAvg: number;
  byType: { type: string; count: number }[];
  velocity: { week: string; completed: number }[];
  burndown: { week: string; remaining: number; ideal: number }[];
  completed: number;
  overdue: number;
  total: number;
}
