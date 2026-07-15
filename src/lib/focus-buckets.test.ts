import { describe, expect, it } from 'vitest';
import {
  bucketContests,
  effectiveDue,
  matchesFocusTab,
  buildDayDigestLine,
  defaultFocusTab,
} from '@/lib/focus-buckets';
import type { Contest } from '@/types';

function base(partial: Partial<Contest> & Pick<Contest, 'id' | 'title'>): Contest {
  const c: Contest = {
    id: partial.id,
    title: partial.title,
    user_id: 'u1',
    description: null,
    status: 'todo',
    progress: 0,
    due_date: null,
    task_type: 'task',
    priority: 'medium',
    tags: [],
    telegram_message_links: [],
    color: null,
    recurrence: 'none',
    recurrence_until: null,
    parent_id: null,
    position: 0,
    workspace_id: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  return { ...c, ...partial };
}

describe('focus-buckets', () => {
  it('effectiveDue picks earliest of task and stage', () => {
    const c = base({
      id: '1',
      title: 'A',
      due_date: '2030-06-10T12:00:00.000Z',
      next_stage_due_date: '2030-06-01T12:00:00.000Z',
    });
    expect(effectiveDue(c)).toBe('2030-06-01T12:00:00.000Z');
  });

  it('buckets overdue / today / review / soon', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date(now);
    const in3 = new Date(now);
    in3.setDate(in3.getDate() + 3);

    const contests = [
      base({
        id: 'o',
        title: 'over',
        due_date: yesterday.toISOString(),
        status: 'in_progress',
      }),
      base({
        id: 't',
        title: 'today',
        due_date: today.toISOString(),
        status: 'todo',
      }),
      base({
        id: 'r',
        title: 'review',
        status: 'review',
        progress: 90,
      }),
      base({
        id: 's',
        title: 'soon',
        due_date: in3.toISOString(),
        status: 'todo',
      }),
      base({
        id: 'd',
        title: 'done',
        status: 'done',
        progress: 100,
        due_date: yesterday.toISOString(),
      }),
    ];

    const b = bucketContests(contests);
    expect(b.overdue.map((c) => c.id)).toContain('o');
    expect(b.today.map((c) => c.id)).toContain('t');
    expect(b.review.map((c) => c.id)).toContain('r');
    expect(b.soon.map((c) => c.id)).toContain('s');
    expect(b.overdue.find((c) => c.id === 'd')).toBeUndefined();
  });

  it('matchesFocusTab and defaultFocusTab', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const overdue = base({
      id: 'o',
      title: 'o',
      due_date: yesterday.toISOString(),
      status: 'todo',
    });
    expect(matchesFocusTab(overdue, 'overdue')).toBe(true);
    expect(matchesFocusTab(overdue, 'today')).toBe(false);

    const buckets = bucketContests([overdue]);
    expect(defaultFocusTab(buckets)).toBe('overdue');
    expect(buildDayDigestLine(buckets)).toMatch(/просроч/i);
  });
});
