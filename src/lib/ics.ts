/**
 * Экспорт задач в ICS (календарь Apple/Google/Outlook)
 */
import type { Contest } from '@/types';
import { STATUS_LABELS } from '@/lib/constants';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** UTC timestamp в формате ICS */
function toIcsDate(d: Date, allDay = false): string {
  if (allDay) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  }
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

export function contestsToIcs(contests: Contest[]): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Concurio//Tasks//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Concurio',
  ];

  for (const c of contests) {
    if (!c.due_date) continue;
    const due = new Date(c.due_date);
    const uid = `${c.id}@concurio.app`;
    const summary = escapeIcs(c.title);
    const desc = escapeIcs(
      [c.description ?? '', `Статус: ${STATUS_LABELS[c.status] ?? c.status}`]
        .filter(Boolean)
        .join('\n')
    );

    // All-day event on due date
    const day = new Date(
      Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())
    );
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + 1);

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid}`));
    lines.push(foldLine(`DTSTAMP:${toIcsDate(now)}`));
    lines.push(foldLine(`DTSTART;VALUE=DATE:${toIcsDate(day, true)}`));
    lines.push(foldLine(`DTEND;VALUE=DATE:${toIcsDate(next, true)}`));
    lines.push(foldLine(`SUMMARY:${summary}`));
    if (desc) lines.push(foldLine(`DESCRIPTION:${desc}`));
    if (c.status === 'done' || c.status === 'cancelled') {
      lines.push('STATUS:CANCELLED');
    } else {
      lines.push('STATUS:CONFIRMED');
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
