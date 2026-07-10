/**
 * Канбан: колонки по статусам, клик для смены статуса
 */
import { Link } from 'react-router-dom';
import { useContests, useUpdateContestStatus } from '@/hooks/use-contests';
import { STATUS_LABELS, STATUS_ORDER, STATUS_DEFAULT_PROGRESS } from '@/lib/constants';
import type { Contest, ContestStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, cn } from '@/lib/utils';
import { haptic } from '@/lib/telegram';

const COLUMNS: ContestStatus[] = [...STATUS_ORDER, 'cancelled'];

export function KanbanBoard() {
  const { data: contests, isLoading } = useContests();
  const updateStatus = useUpdateContestStatus();

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1 touch-pan-x">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 w-[min(260px,80vw)] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  const byStatus = (status: ContestStatus) =>
    (contests ?? []).filter((c) => c.status === status);

  const moveTo = async (contest: Contest, status: ContestStatus) => {
    if (contest.status === status) return;
    haptic.light();
    await updateStatus.mutateAsync({
      id: contest.id,
      status,
      progress: STATUS_DEFAULT_PROGRESS[status],
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1 snap-x snap-mandatory touch-pan-x overscroll-x-contain">
      {COLUMNS.map((status) => {
        const items = byStatus(status);
        return (
          <div
            key={status}
            className="snap-start shrink-0 w-[min(260px,82vw)] sm:w-[280px] flex flex-col rounded-2xl bg-[rgb(var(--bg-secondary))]/80 border border-[rgb(var(--border-default))] max-h-[min(65vh,calc(var(--tg-viewport-stable-height,100dvh)-12rem))]"
          >
            <div className="px-3 py-3 border-b border-[rgb(var(--border-default))] flex items-center justify-between shrink-0 bg-[rgb(var(--bg-secondary))] rounded-t-2xl">
              <h3 className="text-sm font-bold truncate">{STATUS_LABELS[status]}</h3>
              <span className="text-xs font-medium text-[rgb(var(--fg-muted))] bg-[rgb(var(--bg-card))] px-2 py-0.5 rounded-full shrink-0">
                {items.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-2 min-h-0">
              {items.length === 0 && (
                <p className="text-xs text-center text-[rgb(var(--fg-muted))] py-6">
                  Пусто
                </p>
              )}
              {items.map((c) => (
                <div
                  key={c.id}
                  className="glass rounded-xl p-3 space-y-2 border border-[rgb(var(--border-default))] hover:border-accent-400/40 transition-colors"
                >
                  <Link to={`/contest/${c.id}`} className="block">
                    <p className="text-sm font-semibold line-clamp-2 hover:text-accent-500">
                      {c.title}
                    </p>
                    {c.due_date && (
                      <p className="text-[11px] text-[rgb(var(--fg-muted))] mt-1">
                        {formatDate(c.due_date)}
                      </p>
                    )}
                    <div className="mt-2 h-1 rounded-full bg-[rgb(var(--bg-secondary))]">
                      <div
                        className="h-full rounded-full bg-accent-500"
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </Link>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {COLUMNS.filter((s) => s !== c.status)
                      .slice(0, 3)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={updateStatus.isPending}
                          onClick={() => moveTo(c, s)}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-md border border-[rgb(var(--border-default))]',
                            'hover:bg-accent-50 hover:text-accent-700 dark:hover:bg-accent-900/30'
                          )}
                          title={`Переместить: ${STATUS_LABELS[s]}`}
                        >
                          → {STATUS_LABELS[s]}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
