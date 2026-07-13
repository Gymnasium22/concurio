/**
 * Расширенный PDF-отчёт для куратора/директора
 */
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { PRIORITY_LABELS, STATUS_LABELS, TASK_TYPE_LABELS } from '@/lib/constants';
import type { AnalyticsBundle, Contest } from '@/types';
import { downloadTasksPdfReport } from '@/lib/pdf-report';

const FONT_CACHE: { regular?: string; bold?: string } = {};

async function loadFont(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('font');
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function ensureFonts(doc: jsPDF) {
  try {
    const base = import.meta.env.BASE_URL || '/';
    if (!FONT_CACHE.regular)
      FONT_CACHE.regular = await loadFont(`${base}fonts/DejaVuSans.ttf`);
    if (!FONT_CACHE.bold)
      FONT_CACHE.bold = await loadFont(`${base}fonts/DejaVuSans-Bold.ttf`);
    doc.addFileToVFS('DejaVuSans.ttf', FONT_CACHE.regular);
    doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
    doc.addFileToVFS('DejaVuSans-Bold.ttf', FONT_CACHE.bold);
    doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold');
    return true;
  } catch {
    return false;
  }
}

export async function downloadCuratorPdfReport(
  contests: Contest[],
  analytics: AnalyticsBundle,
  orgName?: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ok = await ensureFonts(doc);
  const font = ok ? 'DejaVu' : 'helvetica';
  const margin = 14;
  let y = 18;
  const pageW = doc.internal.pageSize.getWidth();

  const line = (text: string, size = 11, bold = false) => {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.setFont(font, bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.45) + 3;
  };

  doc.setFillColor(120, 80, 255);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, 'bold');
  doc.setFontSize(16);
  doc.text('Concurio — отчёт для куратора', margin, 12);
  doc.setFontSize(10);
  doc.text(
    `${orgName || 'Организация'} · ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: ru })}`,
    margin,
    20
  );
  doc.setTextColor(20, 20, 30);
  y = 38;

  line('Сводка KPI', 14, true);
  line(`Всего задач: ${analytics.total}`);
  line(`Выполнено: ${analytics.completed}`);
  line(`Просрочено: ${analytics.overdue}`);
  line(`% в срок: ${analytics.onTimeRate}%`);
  line(`Средний lead time: ${analytics.leadTimeDaysAvg} дн.`);
  y += 2;

  line('Нагрузка по типам', 13, true);
  for (const t of analytics.byType) {
    const label = TASK_TYPE_LABELS[t.type as keyof typeof TASK_TYPE_LABELS] || t.type;
    line(`• ${label}: ${t.count}`);
  }
  y += 2;

  line('Velocity (задач / неделя)', 13, true);
  for (const v of analytics.velocity) {
    line(`${v.week}: ${v.completed}`);
  }
  y += 2;

  line('Активные / ключевые задачи', 13, true);
  const open = contests
    .filter(
      (c) =>
        !c.deleted_at && !c.parent_id && c.status !== 'done' && c.status !== 'cancelled'
    )
    .slice(0, 25);

  for (const c of open) {
    const meta = [
      STATUS_LABELS[c.status],
      PRIORITY_LABELS[c.priority],
      c.due_date
        ? format(new Date(c.due_date), 'd MMM yyyy', { locale: ru })
        : 'без срока',
    ].join(' · ');
    line(`${c.title}`, 11, true);
    line(meta, 9);
  }

  doc.save(`concurio-curator-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

/** PPT-подобный отчёт: multipage PDF landscape (без тяжёлого pptx lib) */
export async function downloadCuratorSlideReport(
  _contests: Contest[],
  analytics: AnalyticsBundle
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const ok = await ensureFonts(doc);
  const font = ok ? 'DejaVu' : 'helvetica';
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Slide 1
  doc.setFillColor(18, 18, 30);
  doc.rect(0, 0, w, h, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, 'bold');
  doc.setFontSize(28);
  doc.text('Concurio', 20, 50);
  doc.setFontSize(18);
  doc.text('Отчёт о прогрессе', 20, 65);
  doc.setFontSize(12);
  doc.setTextColor(180, 180, 200);
  doc.text(format(new Date(), 'd MMMM yyyy', { locale: ru }), 20, 80);

  // Slide 2 KPI
  doc.addPage();
  doc.setFillColor(245, 245, 250);
  doc.rect(0, 0, w, h, 'F');
  doc.setTextColor(20, 20, 30);
  doc.setFont(font, 'bold');
  doc.setFontSize(20);
  doc.text('Ключевые показатели', 20, 25);

  const cards = [
    [`${analytics.onTimeRate}%`, 'В срок'],
    [`${analytics.leadTimeDaysAvg}д`, 'Lead time'],
    [`${analytics.completed}`, 'Готово'],
    [`${analytics.overdue}`, 'Просрочено'],
  ];
  cards.forEach((c, i) => {
    const x = 20 + i * 68;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, 40, 60, 40, 4, 4, 'F');
    doc.setFont(font, 'bold');
    doc.setFontSize(22);
    doc.setTextColor(120, 80, 255);
    doc.text(c[0]!, x + 8, 60);
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 100);
    doc.text(c[1]!, x + 8, 72);
  });

  doc.setTextColor(20, 20, 30);
  doc.setFont(font, 'bold');
  doc.setFontSize(14);
  doc.text('Нагрузка по типам', 20, 100);
  doc.setFont(font, 'normal');
  doc.setFontSize(12);
  let y = 112;
  for (const t of analytics.byType) {
    const label = TASK_TYPE_LABELS[t.type as keyof typeof TASK_TYPE_LABELS] || t.type;
    doc.text(`${label}: ${t.count}`, 24, y);
    y += 8;
  }

  doc.save(`concurio-slides-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export { downloadTasksPdfReport };
