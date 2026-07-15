/**
 * FocusBoard — «что делать дальше» на главной
 * На дашборде: вкладка фильтрует список ниже; без выбора — превью, чип не «ложный».
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContests } from '@/hooks/use-contests';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDate, getDeadlineUrgency, getUrgencyColor, cn } from '@/lib/utils';
import {
  bucketContests,
  buildDayDigestLine,
  defaultFocusTab,
  effectiveDue,
  type FocusTab,
} from '@/lib/focus-buckets';
import {
  AlertTriangle,
  CalendarDays,
  Eye,
  Flame,
  CheckCircle2,
  ChevronRight,
  Plus,
} from 'lucide-react';

const TABS: {
  id: FocusTab;
  label: string;
  short: string;
  icon: typeof Flame;
  empty: string;
  accent: string;
  createTemplate?: string;
}[] = [
  {
    id: 'overdue',
    label: 'Просрочено',
    short: 'Горит',
    icon: AlertTriangle,
    empty: 'Нет просроченных — отлично',
    accent:
      'text-red-600 dark:text-red-400 border-red-300/60 bg-red-50 dark:bg-red-950/40',
  },
  {
    id: 'today',
    label: 'Сегодня',
    short: 'Сегодня',
    icon: Flame,
    empty: 'На сегодня дедлайнов нет',
    accent:
      'text-amber-700 dark:text-amber-300 border-amber-300/60 bg-amber-50 dark:bg-amber-950/40',
    createTemplate: 'weekly',
  },
  {
    id: 'review',
    label: 'На проверке',
    short: 'Проверка',
    icon: Eye,
    empty: 'Ничего не ждёт проверки',
    accent:
      'text-amber-600 dark:text-amber-400 border-amber-200/60 bg-amber-50/80 dark:bg-amber-900/20',
  },
  {
    id: 'soon',
    label: 'Скоро (7 дн.)',
    short: 'Скоро',
    icon: CalendarDays,
    empty: 'На неделе свободно — можно запланировать',
    accent:
      'text-blue-600 dark:text-blue-400 border-blue-200/60 bg-blue-50 dark:bg-blue-950/30',
    createTemplate: 'contest-3',
  },
];

interface FocusBoardProps {
  /** Управляемая вкладка (фильтр списка на главной). null = фильтр сброшен */
  activeTab?: FocusTab | null;
  onTabChange?: (tab: FocusTab) => void;
  /** Список ниже отфильтрован по этой вкладке */
  listLinked?: boolean;
}

export function FocusBoard({
  activeTab,
  onTabChange,
  listLinked = false,
}: FocusBoardProps) {
  const { data: contests, isLoading } = useContests();
  const buckets = useMemo(() => bucketContests(contests ?? []), [contests]);

  /** Локальный режим, если родитель не передаёт onTabChange */
  const [localTab, setLocalTab] = useState<FocusTab | null>(null);
  const linked = Boolean(onTabChange);

  /** Выбранный чип: в linked-режиме только activeTab (null = ничего не выбрано) */
  const selected: FocusTab | null = linked
    ? (activeTab ?? null)
    : (localTab ?? defaultFocusTab(buckets));

  /** Что показывать в превью: выбор или «самая горячая» корзина */
  const previewTab: FocusTab = selected ?? defaultFocusTab(buckets);
  const list = buckets[previewTab];
  const meta = TABS.find((t) => t.id === previewTab)!;

  const selectTab = (id: FocusTab) => {
    if (!linked) setLocalTab(id);
    onTabChange?.(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  const totalFocus =
    buckets.overdue.length +
    buckets.today.length +
    buckets.review.length +
    buckets.soon.length;

  const digestLine = buildDayDigestLine(buckets);
  const hot = buckets.overdue.length + buckets.today.length;

  return (
    <section
      className={cn(
        'rounded-2xl border bg-[rgb(var(--bg-card))] overflow-hidden shadow-sm',
        hot > 0
          ? 'border-amber-300/40 dark:border-amber-800/40'
          : 'border-[rgb(var(--border-default))]'
      )}
      aria-label="Что делать дальше"
    >
      <div className="px-3 sm:px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold tracking-tight">Что делать дальше</h2>
          <p
            className={cn(
              'text-[11px] sm:text-xs mt-0.5 leading-snug',
              hot > 0
                ? 'text-amber-800 dark:text-amber-200/90 font-medium'
                : 'text-[rgb(var(--fg-muted))]'
            )}
          >
            {digestLine}
          </p>
          {listLinked && selected ? (
            <p className="text-[10px] text-accent-600 dark:text-accent-400 mt-1">
              Список ниже: {meta.label} · ещё раз по вкладке — сброс
            </p>
          ) : linked && !selected ? (
            <p className="text-[10px] text-[rgb(var(--fg-muted))] mt-1">
              Нажмите вкладку — отфильтрует список задач
            </p>
          ) : null}
        </div>
        {totalFocus === 0 ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        ) : null}
      </div>

      <div className="flex gap-1.5 px-3 sm:px-4 pb-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const count = buckets[t.id].length;
          const Icon = t.icon;
          const isSelected = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              aria-pressed={isSelected}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium min-h-[36px] touch-manipulation transition-colors',
                isSelected
                  ? t.accent
                  : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))] text-[rgb(var(--fg-secondary))]',
                listLinked && isSelected && 'ring-2 ring-accent-400/40'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
              <span
                className={cn(
                  'tabular-nums rounded-full min-w-[1.25rem] text-center text-[10px] font-bold px-1',
                  isSelected ? 'bg-black/10 dark:bg-white/10' : 'bg-[rgb(var(--bg-card))]'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[rgb(var(--border-default))] px-2 py-2 sm:px-3 max-h-[200px] lg:max-h-[240px] overflow-y-auto overscroll-contain">
        {!selected && linked && (
          <p className="text-[10px] text-[rgb(var(--fg-muted))] px-2.5 pb-1.5">
            Превью: {meta.label}
          </p>
        )}
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-5 px-2">
            <p className="text-xs text-center text-[rgb(var(--fg-muted))]">
              {meta.empty}
            </p>
            {meta.createTemplate && (
              <Link to={`/create?template=${meta.createTemplate}`}>
                <Button size="sm" variant="outline" className="gap-1.5 min-h-[40px]">
                  <Plus className="h-3.5 w-3.5" />
                  Создать по шаблону
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {list.slice(0, 8).map((c) => {
              const due = effectiveDue(c);
              const urgency = getDeadlineUrgency(due);
              const stageOnly =
                c.next_stage_due_date &&
                (!c.due_date ||
                  new Date(c.next_stage_due_date).getTime() <=
                    new Date(c.due_date).getTime());

              return (
                <li key={c.id}>
                  <Link
                    to={`/contest/${c.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-2.5 py-2 min-h-[44px]',
                      'hover:bg-[rgb(var(--bg-secondary))] transition-colors'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p
                        className={cn(
                          'text-[11px] truncate mt-0.5',
                          getUrgencyColor(urgency)
                        )}
                      >
                        {stageOnly && c.next_stage_title
                          ? `Этап: ${c.next_stage_title} · `
                          : ''}
                        {formatDate(due)}
                        {c.status === 'review' ? ' · на проверке' : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[rgb(var(--fg-muted))] shrink-0" />
                  </Link>
                </li>
              );
            })}
            {list.length > 8 && (
              <li className="text-[11px] text-center text-[rgb(var(--fg-muted))] py-1">
                и ещё {list.length - 8}…
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
