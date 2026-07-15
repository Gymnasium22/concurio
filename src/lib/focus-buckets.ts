/**
 * Разбор задач на «горящие» корзины для главной (этап 1–3)
 */
import { isToday, isPast, addDays, isBefore, startOfDay } from 'date-fns';
import type { Contest } from '@/types';

export type FocusTab = 'overdue' | 'today' | 'review' | 'soon';

export function effectiveDue(c: Contest): string | null {
  const dates = [c.due_date, c.next_stage_due_date].filter(Boolean) as string[];
  if (dates.length === 0) return null;
  return dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]!;
}

export function isOpenTask(c: Contest): boolean {
  return c.status !== 'done' && c.status !== 'cancelled';
}

export function bucketContests(contests: Contest[]) {
  const now = new Date();
  const weekEnd = addDays(startOfDay(now), 7);
  const open = contests.filter(isOpenTask);

  const overdue: Contest[] = [];
  const today: Contest[] = [];
  const review: Contest[] = [];
  const soon: Contest[] = [];

  for (const c of open) {
    if (c.status === 'review') review.push(c);

    const due = effectiveDue(c);
    if (!due) continue;
    const d = new Date(due);

    if (isPast(d) && !isToday(d)) {
      overdue.push(c);
    } else if (isToday(d)) {
      today.push(c);
    } else if (isBefore(d, weekEnd) && !isToday(d)) {
      soon.push(c);
    }
  }

  const byDue = (a: Contest, b: Contest) => {
    const da = effectiveDue(a);
    const db = effectiveDue(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return new Date(da).getTime() - new Date(db).getTime();
  };

  overdue.sort(byDue);
  today.sort(byDue);
  soon.sort(byDue);
  review.sort(byDue);

  return { overdue, today, review, soon };
}

/** Одна фраза для «дайджеста дня» */
export function buildDayDigestLine(buckets: ReturnType<typeof bucketContests>): string {
  const { overdue, today, review, soon } = buckets;
  const parts: string[] = [];

  if (overdue.length > 0) {
    parts.push(overdue.length === 1 ? '1 просрочена' : `${overdue.length} просрочено`);
  }
  if (today.length > 0) {
    parts.push(today.length === 1 ? '1 на сегодня' : `${today.length} на сегодня`);
  }
  if (review.length > 0) {
    parts.push(review.length === 1 ? '1 на проверке' : `${review.length} на проверке`);
  }
  if (soon.length > 0 && parts.length < 3) {
    parts.push(soon.length === 1 ? '1 скоро' : `${soon.length} на этой неделе`);
  }

  if (parts.length === 0) {
    return 'Сегодня спокойно — можно взять новый конкурс или задачу';
  }

  return `Сейчас: ${parts.join(' · ')}`;
}

export function defaultFocusTab(buckets: ReturnType<typeof bucketContests>): FocusTab {
  if (buckets.overdue.length > 0) return 'overdue';
  if (buckets.today.length > 0) return 'today';
  if (buckets.review.length > 0) return 'review';
  return 'soon';
}

export const FOCUS_TAB_LABELS: Record<FocusTab, string> = {
  overdue: 'Просрочено',
  today: 'Сегодня',
  review: 'На проверке',
  soon: 'Скоро (7 дн.)',
};

/** Попадает ли задача в вкладку фокуса (для фильтра списка) */
export function matchesFocusTab(c: Contest, tab: FocusTab): boolean {
  if (!isOpenTask(c)) return false;

  if (tab === 'review') {
    return c.status === 'review';
  }

  const due = effectiveDue(c);
  if (!due) return false;
  const d = new Date(due);
  const now = new Date();
  const weekEnd = addDays(startOfDay(now), 7);

  if (tab === 'overdue') {
    return isPast(d) && !isToday(d);
  }
  if (tab === 'today') {
    return isToday(d);
  }
  // soon
  return isBefore(d, weekEnd) && !isToday(d) && !(isPast(d) && !isToday(d));
}
