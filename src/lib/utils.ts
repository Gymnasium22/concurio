/**
 * Общие утилиты приложения
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  differenceInDays,
  differenceInHours,
  format,
  isPast,
  isToday,
  isTomorrow,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DeadlineUrgency } from '@/types';

/** Merge Tailwind CSS классов (clsx + tailwind-merge) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Определить срочность дедлайна
 * overdue — просрочен, urgent — ≤3 дня, normal — 3-7 дней, safe — >7 дней
 */
export function getDeadlineUrgency(dueDate: string | null): DeadlineUrgency | 'none' {
  if (!dueDate) return 'none';
  const date = new Date(dueDate);
  const now = new Date();

  if (isPast(date) && !isToday(date)) return 'overdue';

  const daysLeft = differenceInDays(date, now);
  if (daysLeft <= 3) return 'urgent';
  if (daysLeft <= 7) return 'normal';
  return 'safe';
}

/** Цвет для срочности дедлайна */
export function getUrgencyColor(urgency: DeadlineUrgency | 'none'): string {
  const map: Record<DeadlineUrgency | 'none', string> = {
    none: 'text-[rgb(var(--fg-muted))]',
    overdue: 'text-red-500',
    urgent: 'text-amber-500',
    normal: 'text-blue-500 dark:text-blue-400',
    safe: 'text-emerald-600 dark:text-emerald-400',
  };
  return map[urgency];
}

/** Цвет фона для срочности */
export function getUrgencyBgColor(urgency: DeadlineUrgency | 'none'): string {
  const map: Record<DeadlineUrgency | 'none', string> = {
    none: 'bg-[rgb(var(--bg-secondary))] border-[rgb(var(--border-default))]',
    overdue: 'bg-red-500/10 border-red-500/20',
    urgent: 'bg-amber-500/10 border-amber-500/20',
    normal: 'bg-blue-400/10 border-blue-400/20',
    safe: 'bg-emerald-500/10 border-emerald-500/20',
  };
  return map[urgency];
}

/** Форматирование даты в человекопонятный вид */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Без дедлайна';
  const date = new Date(dateStr);
  const now = new Date();

  // В ближайшие сутки показываем относительное время — как в «Скоро сдача»
  if (!isPast(date) || isToday(date)) {
    const hours = differenceInHours(date, now);
    if (hours >= 0 && hours < 24) {
      if (hours < 1) return 'Меньше часа';
      return `Через ${hours} ч.`;
    }
  }

  if (isToday(date)) return 'Сегодня';
  if (isTomorrow(date)) return 'Завтра';

  return format(date, 'd MMM yyyy', { locale: ru });
}

/** Оставшееся время до дедлайна */
export function getTimeLeft(dueDate: string | null): string {
  if (!dueDate) return '—';
  const date = new Date(dueDate);
  const now = new Date();

  if (isPast(date) && !isToday(date)) {
    const days = Math.abs(differenceInDays(date, now));
    return `Просрочено на ${days} дн.`;
  }

  const hours = differenceInHours(date, now);
  if (hours < 24) return `${hours} ч.`;

  const days = differenceInDays(date, now);
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Завтра';
  return `${days} дн.`;
}

/** Валидация Telegram-ссылки */
export function isValidTelegramLink(url: string): boolean {
  return /^https?:\/\/(t\.me|telegram\.me)\/.+/.test(url.trim());
}

/** Форматирование размера файла */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Определить тип файла по расширению */
export function getFileIcon(
  fileName: string
): 'pdf' | 'word' | 'powerpoint' | 'image' | 'unknown' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'word';
  if (ext === 'pptx' || ext === 'ppt') return 'powerpoint';
  if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
    return 'image';
  }
  return 'unknown';
}

/** Задержка (для анимаций) */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Дедлайн → ISO без сдвига календарного дня (local noon).
 * `Date` из календаря часто = 00:00 local → toISOString() уезжает на вчера (UTC+).
 */
export function dueDateToIso(date: Date | string | null | undefined): string | null {
  if (date == null || date === '') return null;
  const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
