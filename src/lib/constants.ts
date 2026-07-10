/**
 * Константы приложения
 */
import type { ContestStatus, TaskPriority, TaskType } from '@/types';

/** Маппинг статусов на русскоязычные лейблы */
export const STATUS_LABELS: Record<ContestStatus, string> = {
  todo: 'Не начат',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Готово',
  cancelled: 'Отменён',
};

/** Маппинг статусов на цвета (Tailwind классы) */
export const STATUS_COLORS: Record<ContestStatus, { text: string; bg: string; border: string }> = {
  todo: {
    text: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
  },
  in_progress: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
  review: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  done: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  cancelled: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
  },
};

export const STATUS_ICONS: Record<ContestStatus, string> = {
  todo: 'Circle',
  in_progress: 'Loader',
  review: 'Eye',
  done: 'CheckCircle2',
  cancelled: 'XCircle',
};

export const STATUS_ORDER: ContestStatus[] = [
  'todo',
  'in_progress',
  'review',
  'done',
];

/** Типы задач */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  contest: 'Конкурс',
  task: 'Задача',
  personal: 'Личное',
  reminder: 'Напоминание',
};

export const TASK_TYPE_COLORS: Record<TaskType, { text: string; bg: string; border: string }> = {
  contest: {
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    border: 'border-violet-200 dark:border-violet-800',
  },
  task: {
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-900/30',
    border: 'border-sky-200 dark:border-sky-800',
  },
  personal: {
    text: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-900/30',
    border: 'border-pink-200 dark:border-pink-800',
  },
  reminder: {
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-800',
  },
};

export const TASK_TYPE_ORDER: TaskType[] = ['contest', 'task', 'personal', 'reminder'];

/** Приоритеты */
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочно',
};

export const PRIORITY_COLORS: Record<TaskPriority, { text: string; bg: string; dot: string }> = {
  low: {
    text: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    dot: 'bg-slate-400',
  },
  medium: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    dot: 'bg-blue-500',
  },
  high: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    dot: 'bg-amber-500',
  },
  urgent: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
    dot: 'bg-red-500',
  },
};

/** Цвет полоски приоритета слева на карточке (solid) */
export const PRIORITY_BAR: Record<TaskPriority, string> = {
  low: 'bg-slate-400 dark:bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-red-500',
};

export const PRIORITY_ORDER: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

/** Допустимые типы файлов */
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

/** Максимальный размер файла (15 МБ) */
export const MAX_FILE_SIZE = 15 * 1024 * 1024;

export const DASHBOARD_DEADLINE_COUNT = 5;

export const QUERY_KEYS = {
  contests: ['contests'] as const,
  contest: (id: string) => ['contests', id] as const,
  attachments: (contestId: string) => ['attachments', contestId] as const,
  stats: ['stats'] as const,
  checklist: (contestId: string) => ['checklist', contestId] as const,
  comments: (contestId: string) => ['comments', contestId] as const,
  activity: (contestId: string) => ['activity', contestId] as const,
};

export const STATUS_DEFAULT_PROGRESS: Record<ContestStatus, number> = {
  todo: 0,
  in_progress: 30,
  review: 70,
  done: 100,
  cancelled: 0,
};
