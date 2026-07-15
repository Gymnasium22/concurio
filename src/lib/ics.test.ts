import { describe, it, expect } from 'vitest';
import { contestsToIcs } from './ics';
import type { Contest } from '@/types';

const base: Contest = {
  id: 'abc-123',
  user_id: 'u1',
  title: 'Тест, задача',
  description: 'Строка\nдве',
  due_date: '2026-03-15T00:00:00.000Z',
  status: 'todo',
  progress: 0,
  telegram_message_links: [],
  task_type: 'task',
  priority: 'medium',
  tags: [],
  color: null,
  parent_id: null,
  position: 0,
  recurrence: 'none',
  recurrence_until: null,
  workspace_id: null,
  deleted_at: null,
  completed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('contestsToIcs', () => {
  it('builds VCALENDAR with VEVENT', () => {
    const ics = contestsToIcs([base]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:abc-123@concurio.app');
    expect(ics).toContain('SUMMARY:Тест\\, задача');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('skips tasks without due_date', () => {
    const ics = contestsToIcs([{ ...base, due_date: null }]);
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
