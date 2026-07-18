/**
 * Skeleton — скелетон-загрузка
 */
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-r from-[rgb(var(--bg-secondary))] via-[rgb(var(--bg-elevated))] to-[rgb(var(--bg-secondary))]',
        'bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
