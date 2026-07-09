/**
 * Общие утилиты приложения
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, differenceInHours, format, isPast, isToday, isTomorrow } from 'date-fns';
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
export function getDeadlineUrgency(dueDate: string | null): DeadlineUrgency {
  if (!dueDate) return 'safe';
  const date = new Date(dueDate);
  const now = new Date();

  if (isPast(date) && !isToday(date)) return 'overdue';

  const daysLeft = differenceInDays(date, now);
  if (daysLeft <= 3) return 'urgent';
  if (daysLeft <= 7) return 'normal';
  return 'safe';
}

/** Цвет для срочности дедлайна */
export function getUrgencyColor(urgency: DeadlineUrgency): string {
  const map: Record<DeadlineUrgency, string> = {
    overdue: 'text-red-500',
    urgent: 'text-amber-500',
    normal: 'text-blue-400',
    safe: 'text-emerald-500',
  };
  return map[urgency];
}

/** Цвет фона для срочности */
export function getUrgencyBgColor(urgency: DeadlineUrgency): string {
  const map: Record<DeadlineUrgency, string> = {
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
export function getFileIcon(fileName: string): 'pdf' | 'word' | 'unknown' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'word';
  return 'unknown';
}

/** Задержка (для анимаций) */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
