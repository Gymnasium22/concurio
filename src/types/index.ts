/**
 * Concurio — Core Type Definitions
 * Все TypeScript типы для приложения
 */

// ========================
// Contest (Конкурс/Задание)
// ========================

/** Возможные статусы конкурса */
export type ContestStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

/** Конкурс — основная сущность */
export interface Contest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null; // ISO 8601 timestamp
  status: ContestStatus;
  progress: number; // 0-100
  telegram_message_links: string[];
  created_at: string;
  updated_at: string;
}

/** Данные для создания конкурса */
export interface ContestInsert {
  title: string;
  description?: string | null;
  due_date?: string | null;
  status?: ContestStatus;
  progress?: number;
  telegram_message_links?: string[];
}

/** Данные для обновления конкурса */
export interface ContestUpdate {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  status?: ContestStatus;
  progress?: number;
  telegram_message_links?: string[];
}

// ========================
// Attachment (Вложение)
// ========================

/** Тип файла */
export type FileType = 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Вложенный файл */
export interface Attachment {
  id: string;
  contest_id: string;
  file_name: string;
  file_path: string; // Путь в Supabase Storage
  file_type: string;
  file_size: number | null;
  created_at: string;
}

/** Данные для создания вложения */
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

/** Статистика для дашборда */
export interface DashboardStats {
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  completedThisWeek: number;
  upcomingDeadlines: number;
}

/** Цвет индикации дедлайна */
export type DeadlineUrgency = 'overdue' | 'urgent' | 'normal' | 'safe';

// ========================
// Filters & Sorting
// ========================

/** Фильтры для списка конкурсов */
export interface ContestFilters {
  status: ContestStatus | 'all';
  search: string;
  sortBy: 'due_date' | 'created_at' | 'title';
  sortOrder: 'asc' | 'desc';
}

// ========================
// Auth
// ========================

/** Telegram-пользователь (из initDataUnsafe) */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

/** Данные текущего пользователя */
export interface AppUser {
  id: string; // Supabase auth user ID
  email: string | null;
  telegram_id?: number;
  display_name: string;
  avatar_url?: string;
}

// ========================
// Telegram Mini App
// ========================

/** Тема Telegram (цвета) */
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
