/**
 * Единый empty state — 2026 product polish
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  secondary?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-dashed border-[rgb(var(--border-default))]',
        'bg-gradient-to-b from-[rgb(var(--bg-card))] to-[rgb(var(--bg-secondary))]/40',
        'px-6 py-10 sm:px-10 sm:py-12 flex flex-col items-center text-center',
        className
      )}
    >
      <div
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent-500/15 blur-3xl"
        aria-hidden
      />
      <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/20 flex items-center justify-center mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="relative text-lg sm:text-xl font-bold tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="relative text-sm text-[rgb(var(--fg-secondary))] mb-6 max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && (actionTo || onAction) && (
        <div className="relative">
          {actionTo ? (
            <Button
              asChild
              className="gap-2 min-h-[44px] px-6 shadow-md shadow-accent-500/20"
            >
              <Link to={actionTo}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button
              className="gap-2 min-h-[44px] px-6 shadow-md shadow-accent-500/20"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
      {secondary && <div className="relative mt-4">{secondary}</div>}
    </div>
  );
}
