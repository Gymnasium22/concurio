/**
 * Тепловая карта активности (12 недель)
 */
import { useActivityHeatmap } from '@/hooks/use-contests';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function level(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 3;
  const r = count / max;
  if (r < 0.25) return 1;
  if (r < 0.5) return 2;
  if (r < 0.75) return 3;
  return 4;
}

const LEVEL_CLS = [
  'bg-[rgb(var(--bg-secondary))]',
  'bg-accent-200 dark:bg-accent-900/50',
  'bg-accent-300 dark:bg-accent-800/70',
  'bg-accent-400 dark:bg-accent-600',
  'bg-accent-500 dark:bg-accent-500',
];

export function ActivityHeatmap() {
  const { data, isLoading } = useActivityHeatmap(84);

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-2xl" />;
  }

  const cells = data ?? [];
  const max = Math.max(1, ...cells.map((c) => c.count));

  // 7 строк (дни недели), столбцы = недели
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="glass p-4 sm:p-5 rounded-2xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-[rgb(var(--fg-secondary))]">
          Активность
        </h3>
        <span className="text-[11px] text-[rgb(var(--fg-muted))]">12 недель</span>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex gap-1 min-w-0">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count}`}
                  className={cn(
                    'h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm',
                    LEVEL_CLS[level(day.count, max)]
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-[rgb(var(--fg-muted))]">
        <span>Меньше</span>
        {LEVEL_CLS.map((cls, i) => (
          <span key={i} className={cn('h-2.5 w-2.5 rounded-sm', cls)} />
        ))}
        <span>Больше</span>
      </div>
    </div>
  );
}
