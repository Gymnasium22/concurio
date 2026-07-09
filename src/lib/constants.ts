/**
 * Константы приложения
 */
import type { ContestStatus } from '@/types';

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

/** Иконки статусов (Lucide icon names) */
export const STATUS_ICONS: Record<ContestStatus, string> = {
  todo: 'Circle',
  in_progress: 'Loader',
  review: 'Eye',
  done: 'CheckCircle2',
  cancelled: 'XCircle',
};

/** Порядок статусов (для stepper) */
export const STATUS_ORDER: ContestStatus[] = [
  'todo',
  'in_progress',
  'review',
  'done',
];

/** Допустимые типы файлов */
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

/** Максимальный размер файла (10 МБ) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Количество конкурсов на дашборде */
export const DASHBOARD_DEADLINE_COUNT = 5;

/** Ключи React Query */
export const QUERY_KEYS = {
  contests: ['contests'] as const,
  contest: (id: string) => ['contests', id] as const,
  attachments: (contestId: string) => ['attachments', contestId] as const,
  stats: ['stats'] as const,
};

/** Прогресс по умолчанию для каждого статуса */
export const STATUS_DEFAULT_PROGRESS: Record<ContestStatus, number> = {
  todo: 0,
  in_progress: 30,
  review: 70,
  done: 100,
  cancelled: 0,
};
