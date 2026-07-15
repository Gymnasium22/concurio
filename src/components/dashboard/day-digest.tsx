/**
 * DayDigest — одна строка «как сообщение от бота» + быстрые шаблоны
 * (этап 3: привычка без настоящего Telegram-бота)
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useContests } from '@/hooks/use-contests';
import { Skeleton } from '@/components/ui/skeleton';
import { bucketContests, buildDayDigestLine } from '@/lib/focus-buckets';
import { cn } from '@/lib/utils';
import { MessageCircle, Sparkles } from 'lucide-react';

const QUICK = [
  { template: 'contest-3', label: 'Конкурс 3 этапа' },
  { template: 'hackathon', label: 'Хакатон' },
  { template: 'coursework', label: 'Курсовая' },
  { template: 'weekly', label: 'На неделю' },
] as const;

export function DayDigest() {
  const { data: contests, isLoading } = useContests();
  const buckets = useMemo(() => bucketContests(contests ?? []), [contests]);
  const line = buildDayDigestLine(buckets);
  const hot = buckets.overdue.length + buckets.today.length;

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-2xl" />;
  }

  return (
    <section
      className={cn(
        'rounded-2xl border px-3 py-3 sm:px-4 sm:py-3.5 space-y-2.5',
        hot > 0
          ? 'border-amber-300/50 bg-gradient-to-br from-amber-50/90 to-[rgb(var(--bg-card))] dark:from-amber-950/30 dark:to-[rgb(var(--bg-card))] dark:border-amber-800/40'
          : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))]'
      )}
      aria-label="Дайджест дня"
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
            hot > 0
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              : 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
          )}
        >
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--fg-muted))]">
            Дайджест дня
          </p>
          <p className="text-sm font-medium leading-snug mt-0.5">{line}</p>
          <p className="text-[11px] text-[rgb(var(--fg-muted))] mt-1">
            Тот же смысл — в боте: команда /today. Тест — в Профиле.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-[rgb(var(--fg-muted))] pl-0.5">
          <Sparkles className="h-3 w-3 text-accent-500" />
          Быстро:
        </span>
        {QUICK.map((q) => (
          <Link
            key={q.template}
            to={`/create?template=${q.template}`}
            className={cn(
              'shrink-0 rounded-full border border-[rgb(var(--border-default))]',
              'bg-[rgb(var(--bg-secondary))] px-2.5 py-1.5 text-[11px] font-medium',
              'hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-300',
              'min-h-[32px] touch-manipulation transition-colors'
            )}
          >
            {q.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
