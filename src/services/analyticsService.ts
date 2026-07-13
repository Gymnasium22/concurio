/**
 * Аналитика: lead time, on-time %, velocity, burndown, by type
 */
import {
  startOfWeek,
  subWeeks,
  format,
  differenceInCalendarDays,
  isBefore,
  parseISO,
} from 'date-fns';
import type { AnalyticsBundle, Contest } from '@/types';

export function computeAnalytics(contests: Contest[]): AnalyticsBundle {
  const active = contests.filter((c) => !c.deleted_at && !c.parent_id);
  const total = active.length;
  const completed = active.filter((c) => c.status === 'done');
  const now = new Date();

  const withDueDone = completed.filter((c) => c.due_date && c.completed_at);
  const onTime = withDueDone.filter((c) => {
    const due = parseISO(c.due_date!);
    const done = parseISO(c.completed_at!);
    return !isBefore(due, done) || differenceInCalendarDays(done, due) <= 0;
  });
  // on-time: completed before or on due date
  const onTimeStrict = withDueDone.filter((c) => {
    const due = new Date(c.due_date!);
    const done = new Date(c.completed_at!);
    return done.getTime() <= due.getTime() + 24 * 60 * 60 * 1000;
  });
  const onTimeRate =
    withDueDone.length > 0
      ? Math.round((onTimeStrict.length / withDueDone.length) * 100)
      : completed.length > 0
        ? 100
        : 0;

  const leadSamples = completed
    .map((c) => {
      if (!c.completed_at) return null;
      const start = new Date(c.created_at).getTime();
      const end = new Date(c.completed_at).getTime();
      if (end < start) return null;
      return (end - start) / (1000 * 60 * 60 * 24);
    })
    .filter((n): n is number => n != null);
  const leadTimeDaysAvg =
    leadSamples.length > 0
      ? Math.round((leadSamples.reduce((a, b) => a + b, 0) / leadSamples.length) * 10) /
        10
      : 0;

  const overdue = active.filter(
    (c) =>
      c.due_date &&
      isBefore(new Date(c.due_date), now) &&
      c.status !== 'done' &&
      c.status !== 'cancelled'
  ).length;

  const typeMap = new Map<string, number>();
  for (const c of active) {
    const t = c.task_type || 'task';
    typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
  }
  const byType = [...typeMap.entries()].map(([type, count]) => ({
    type,
    count,
  }));

  // Velocity + burndown: last 8 weeks
  const weeks = 8;
  const weekStarts: Date[] = [];
  const cursor = startOfWeek(now, { weekStartsOn: 1 });
  for (let i = weeks - 1; i >= 0; i--) {
    weekStarts.push(subWeeks(cursor, i));
  }

  const velocity = weekStarts.map((ws) => {
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const n = completed.filter((c) => {
      const d = c.completed_at ? new Date(c.completed_at) : new Date(c.updated_at);
      return d >= ws && d < we;
    }).length;
    return {
      week: format(ws, 'dd.MM'),
      completed: n,
    };
  });

  // Burndown: remaining open tasks snapshot approximation by week
  // Ideal linear from total_at_start to 0
  const openAt = (until: Date) =>
    active.filter((c) => {
      const created = new Date(c.created_at);
      if (created > until) return false;
      if (c.status === 'done' && c.completed_at) {
        return new Date(c.completed_at) > until;
      }
      if (c.status === 'done') return false;
      return true;
    }).length;

  const startRemaining = openAt(weekStarts[0]!) || Math.max(total, 1);
  const burndown = weekStarts.map((ws, i) => {
    const remaining = openAt(new Date(ws.getTime() + 6 * 86400000));
    const ideal = Math.max(
      0,
      Math.round(startRemaining * (1 - i / Math.max(weeks - 1, 1)))
    );
    return {
      week: format(ws, 'dd.MM'),
      remaining,
      ideal,
    };
  });

  void onTime; // reserved
  return {
    onTimeRate,
    leadTimeDaysAvg,
    byType,
    velocity,
    burndown,
    completed: completed.length,
    overdue,
    total,
  };
}
