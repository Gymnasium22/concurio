/**
 * StatusBadge — бейдж статуса конкурса
 */
import { STATUS_LABELS, STATUS_COLORS, STATUS_ICONS } from '@/lib/constants';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ContestStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ContestStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] || status;
  const colors = STATUS_COLORS[status];
  const iconName = STATUS_ICONS[status];

  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  const Icon = icons[iconName] || LucideIcons.Circle;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border',
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      <span>{label}</span>
    </div>
  );
}
