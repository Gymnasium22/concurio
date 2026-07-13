/**
 * Компактная горизонтальная полоса ближайших дедлайнов
 */
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
import { DASHBOARD_DEADLINE_COUNT } from '@/lib/constants';

export function DeadlineStrip() {
  const { data: contests, isLoading } = useContests();

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-40 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  const upcoming = (contests || [])
    .filter((c) => c.status !== 'done' && c.status !== 'cancelled' && c.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, DASHBOARD_DEADLINE_COUNT);

  // На десктопе пустую полосу не показываем — меньше шума
  if (upcoming.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[rgb(var(--fg-muted))]">
        Скоро сдача
      </p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 -mx-0.5 px-0.5">
        {upcoming.map((contest) => {
          const urgency = getDeadlineUrgency(contest.due_date);
          const colorClass = getUrgencyColor(urgency);
          const bgClass = getUrgencyBgColor(urgency);

          return (
            <Link
              key={contest.id}
              to={`/contest/${contest.id}`}
              className={cn(
                'shrink-0 w-[min(12rem,72vw)] sm:w-[13rem] rounded-xl border px-2.5 py-2 transition-all',
                'hover:border-accent-400/50 hover:shadow-sm bg-[rgb(var(--bg-card))]',
                'border-[rgb(var(--border-default))]'
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
                    {new Date(contest.due_date!).toLocaleString('ru', {
                      month: 'short',
                    })}
                  </span>
                  <span className={cn('text-sm font-bold leading-none', colorClass)}>
                    {new Date(contest.due_date!).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate">{contest.title}</p>
                  <p className={cn('text-[10px] truncate mt-0.5', colorClass)}>
                    {getTimeLeft(contest.due_date)}
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
