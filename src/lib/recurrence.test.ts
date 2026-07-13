import { describe, it, expect } from 'vitest';
import { nextDueDate } from './recurrence';

describe('nextDueDate', () => {
  it('returns null for none', () => {
    expect(nextDueDate(new Date('2026-01-01'), 'none')).toBeNull();
  });

  it('adds one day for daily', () => {
    const next = nextDueDate(new Date('2026-01-01T12:00:00Z'), 'daily');
    expect(next?.toISOString().slice(0, 10)).toBe('2026-01-02');
  });

  it('adds one week for weekly', () => {
    const next = nextDueDate(new Date('2026-01-01T12:00:00Z'), 'weekly');
    expect(next?.toISOString().slice(0, 10)).toBe('2026-01-08');
  });

  it('adds one month for monthly', () => {
    const next = nextDueDate(new Date('2026-01-15T12:00:00Z'), 'monthly');
    expect(next?.getMonth()).toBe(1); // February
  });
});
