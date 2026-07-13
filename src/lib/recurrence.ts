/**
 * Следующая дата дедлайна и создание «следующего» экземпляра повторяющейся задачи
 */
import { addDays, addWeeks, addMonths } from 'date-fns';
import type { Contest, RecurrenceRule } from '@/types';
import { createContest } from '@/services/contestService';

export function nextDueDate(
  from: Date | string | null,
  rule: RecurrenceRule
): Date | null {
  if (rule === 'none') return null;
  const base = from ? new Date(from) : new Date();
  switch (rule) {
    case 'daily':
      return addDays(base, 1);
    case 'weekly':
      return addWeeks(base, 1);
    case 'monthly':
      return addMonths(base, 1);
    default:
      return null;
  }
}

/**
 * Когда задача с recurrence завершена — создать следующий экземпляр
 * (копия с новым due_date, status=todo).
 */
export async function spawnNextOccurrence(
  contest: Contest,
  userId: string
): Promise<Contest | null> {
  if (!contest.recurrence || contest.recurrence === 'none') return null;
  if (contest.parent_id) return null; // не клонируем подзадачи

  const next = nextDueDate(contest.due_date, contest.recurrence);
  if (!next) return null;

  if (contest.recurrence_until) {
    const until = new Date(contest.recurrence_until);
    if (next > until) return null;
  }

  return createContest(
    {
      title: contest.title,
      description: contest.description,
      due_date: next.toISOString(),
      status: 'todo',
      progress: 0,
      task_type: contest.task_type,
      priority: contest.priority,
      tags: contest.tags,
      color: contest.color,
      telegram_message_links: contest.telegram_message_links,
      recurrence: contest.recurrence,
      recurrence_until: contest.recurrence_until,
      parent_id: null,
    },
    userId
  );
}
