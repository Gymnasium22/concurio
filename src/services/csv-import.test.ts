import { describe, it, expect } from 'vitest';
import { parseCsv, csvToContestInserts } from './contestService';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    const rows = parseCsv('a,b\n1,2\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quoted commas', () => {
    const rows = parseCsv('title,description\n"Hello, world","x"\n');
    expect(rows[1]).toEqual(['Hello, world', 'x']);
  });
});

describe('csvToContestInserts', () => {
  it('imports with english headers', () => {
    const csv = [
      'title,status,priority,task_type',
      'Task A,todo,high,task',
      'Task B,in_progress,medium,contest',
    ].join('\n');
    const items = csvToContestInserts(csv);
    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe('Task A');
    expect(items[0]?.priority).toBe('high');
    expect(items[1]?.status).toBe('in_progress');
  });

  it('imports russian title header', () => {
    const csv = 'название,описание\nОтчёт,Текст\n';
    const items = csvToContestInserts(csv);
    expect(items[0]?.title).toBe('Отчёт');
    expect(items[0]?.description).toBe('Текст');
  });

  it('throws on empty', () => {
    expect(() => csvToContestInserts('title\n')).toThrow();
  });
});
