import { describe, expect, it } from 'vitest';
import { dueDateToIso } from './utils';

describe('dueDateToIso', () => {
  it('returns null for empty', () => {
    expect(dueDateToIso(null)).toBeNull();
    expect(dueDateToIso(undefined)).toBeNull();
    expect(dueDateToIso('')).toBeNull();
  });

  it('normalizes to local noon (same calendar day in ISO date for most TZ)', () => {
    const d = new Date(2026, 6, 18); // local midnight July 18
    const iso = dueDateToIso(d);
    expect(iso).toBeTruthy();
    const parsed = new Date(iso!);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(18);
    expect(parsed.getHours()).toBe(12);
  });

  it('accepts YYYY-MM-DD strings from date inputs', () => {
    const iso = dueDateToIso('2026-07-18');
    expect(iso).toBeTruthy();
    const parsed = new Date(iso!);
    // noon local of parsed calendar day
    expect(parsed.getHours()).toBe(12);
  });
});
