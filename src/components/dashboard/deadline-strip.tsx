/**
 * Компактная полоса ближайших дедлайнов (учитывает этап)
 */
import { useMemo } from 'react';
import { useContests } from '@/hooks/use-contests';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import {
  getDeadlineUrgency,
  getUrgencyColor,
  getUrgencyBgColor,
  getTimeLeft,
  cn,
} from '@/lib/utils';
import { effectiveDue, isOpenTask } from '@/lib/focus-buckets';
import { DASHBOARD_DEADLINE_COUNT } from '@/lib/constants';

export function DeadlineStrip() {
  const { data: contests, isLoading } = useContests();

  const upcoming = useMemo(() => {
    return (contests || [])
      .filter((c) => isOpenTask(c) && effectiveDue(c))
      .map((c) => ({ contest: c, due: effectiveDue(c)! }))
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
      .slice(0, DASHBOARD_DEADLINE_COUNT);
  }, [contests]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20 rounded" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--fg-muted))] px-0.5">
        Скоро сдача
      </p>
      {/* На desktop в сайдбаре — вертикальный список, на mobile — горизонталь */}
      <div
        className={cn(
          'flex gap-2',
          'overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5',
          'lg:flex-col lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0'
        )}
      >
        {upcoming.map(({ contest, due }) => {
          const urgency = getDeadlineUrgency(due);
          const colorClass = getUrgencyColor(urgency);
          const bgClass = getUrgencyBgColor(urgency);
          const stageLabel =
            contest.next_stage_due_date === due && contest.next_stage_title
              ? contest.next_stage_title
              : null;

          return (
            <Link
              key={contest.id}
              to={`/contest/${contest.id}`}
              className={cn(
                'rounded-xl border px-2.5 py-2 transition-all',
                'hover:border-accent-400/50 hover:shadow-sm bg-[rgb(var(--bg-card))]',
                'border-[rgb(var(--border-default))]',
                'shrink-0 w-[min(12rem,72vw)] sm:w-[13rem]',
                'lg:w-full lg:shrink'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'shrink-0 w-9 h-9 rounded-lg border flex flex-col items-center justify-center',
                    bgClass
                  )}
                >
                  <span
                    className={cn(
                      'text-[9px] font-bold uppercase leading-none',
                      colorClass
                    )}
                  >
                    {new Date(due).toLocaleString('ru', {
                      month: 'short',
                    })}
                  </span>
                  <span className={cn('text-sm font-bold leading-none', colorClass)}>
                    {new Date(due).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{contest.title}</p>
                  <p className={cn('text-[10px] truncate mt-0.5', colorClass)}>
                    {stageLabel ? `${stageLabel} · ` : ''}
                    {getTimeLeft(due)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
