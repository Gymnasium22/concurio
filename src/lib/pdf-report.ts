/**
 * PDF-отчёт с кириллицей (шрифт DejaVu Sans)
 */
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
} from '@/lib/constants';
import type { Contest, DashboardStats } from '@/types';

const FONT_CACHE: { regular?: string; bold?: string } = {};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFontBase64(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Не удалось загрузить шрифт: ${path}`);
  return arrayBufferToBase64(await res.arrayBuffer());
}

async function ensureFonts(doc: jsPDF): Promise<boolean> {
  try {
    // basename GitHub Pages: /Concurio/fonts/...
    const base = import.meta.env.BASE_URL || '/';
    if (!FONT_CACHE.regular) {
      FONT_CACHE.regular = await loadFontBase64(`${base}fonts/DejaVuSans.ttf`);
    }
    if (!FONT_CACHE.bold) {
      FONT_CACHE.bold = await loadFontBase64(`${base}fonts/DejaVuSans-Bold.ttf`);
    }

    doc.addFileToVFS('DejaVuSans.ttf', FONT_CACHE.regular);
    doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
    doc.addFileToVFS('DejaVuSans-Bold.ttf', FONT_CACHE.bold);
    doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
    doc.setFont('DejaVu', 'normal');
    return true;
  } catch (e) {
    console.error('PDF font load failed', e);
    return false;
  }
}

function safe(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export async function downloadTasksPdfReport(
  contests: Contest[],
  stats?: DashboardStats | null,
  userName?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const hasCyrillicFont = await ensureFonts(doc);
  const font = hasCyrillicFont ? 'DejaVu' : 'helvetica';

  const margin = 14;
  let y = 18;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  const ensureSpace = (need = 10) => {
    if (y + need > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  const line = (text: string, size = 11, style: 'normal' | 'bold' = 'normal') => {
    ensureSpace(size * 0.5 + 4);
    doc.setFont(font, style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.42) + 2.5;
  };

  // Шапка
  doc.setFillColor(100, 70, 220);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, 'bold');
  doc.setFontSize(16);
  doc.text('Concurio — отчёт по задачам', margin, 12);
  doc.setFontSize(10);
  doc.setFont(font, 'normal');
  doc.text(
    `Сформирован: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru })}`,
    margin,
    20
  );
  if (userName) {
    doc.text(safe(userName), pageWidth - margin, 20, { align: 'right' });
  }

  y = 38;
  doc.setTextColor(30, 30, 40);

  line('Сводка', 13, 'bold');
  if (stats) {
    line(
      `Всего: ${stats.total}  ·  Готово: ${stats.completed}  ·  В работе: ${stats.inProgress}  ·  Просрочено: ${stats.overdue}`,
      10
    );
    line(
      `Конкурсы: ${stats.contests ?? 0}  ·  Прочие задачи: ${stats.tasks ?? 0}  ·  Срок ≤ 7 дней: ${stats.upcomingDeadlines}`,
      10
    );
  } else {
    line(`Задач в отчёте: ${contests.length}`, 10);
  }

  y += 3;
  line('Список задач', 13, 'bold');

  contests.forEach((c, index) => {
    ensureSpace(30);
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);

    const type = TASK_TYPE_LABELS[c.task_type] ?? c.task_type;
    const status = STATUS_LABELS[c.status] ?? c.status;
    const priority = PRIORITY_LABELS[c.priority] ?? c.priority;
    const due = c.due_date
      ? format(new Date(c.due_date), 'dd.MM.yyyy', { locale: ru })
      : 'без срока';

    line(`${index + 1}. ${safe(c.title)}`, 11, 'bold');
    line(
      `Тип: ${type}  ·  Статус: ${status}  ·  Приоритет: ${priority}  ·  Прогресс: ${c.progress}%  ·  Срок: ${due}`,
      9
    );
    if (c.description) {
      line(safe(c.description).slice(0, 400), 9);
    }
    if (c.tags?.length) {
      line(`Теги: ${c.tags.join(', ')}`, 9);
    }
    y += 2;
  });

  ensureSpace(12);
  doc.setFont(font, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  doc.text(
    'Concurio — персональный отчёт. Только для владельца аккаунта.',
    margin,
    pageHeight - 10
  );

  const fileName = `concurio-otchet-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
