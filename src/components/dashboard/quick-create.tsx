/**
 * Быстрые шаблоны — компактная панель (сайдбар desktop / подсказка mobile)
 */
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK = [
  { template: 'contest-3', label: 'Конкурс 3 этапа' },
  { template: 'hackathon', label: 'Хакатон' },
  { template: 'coursework', label: 'Курсовая' },
  { template: 'weekly', label: 'На неделю' },
] as const;

export function QuickCreate({
  className,
  vertical = false,
}: {
  className?: string;
  /** Вертикальный список для сайдбара */
  vertical?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))]',
        vertical ? 'p-3 space-y-2' : 'px-3 py-2.5',
        className
      )}
      aria-label="Быстрое создание"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--fg-muted))] inline-flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-accent-500" />
        Создать быстро
      </p>
      <div
        className={cn(
          vertical
            ? 'flex flex-col gap-1.5'
            : 'flex gap-1.5 overflow-x-auto no-scrollbar mt-1.5'
        )}
      >
        {QUICK.map((q) => (
          <Link
            key={q.template}
            to={`/create?template=${q.template}`}
            className={cn(
              'rounded-xl border border-[rgb(var(--border-default))]',
              'bg-[rgb(var(--bg-secondary))] text-[11px] sm:text-xs font-medium',
              'hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-300',
              'touch-manipulation transition-colors',
              vertical
                ? 'px-3 py-2.5 min-h-[40px]'
                : 'shrink-0 px-2.5 py-1.5 min-h-[32px]'
            )}
          >
            {q.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
