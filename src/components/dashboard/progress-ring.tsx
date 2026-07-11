/**
 * ProgressRing — SVG круговой индикатор прогресса
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: 'accent' | 'success' | 'warning' | 'danger';
}

export function ProgressRing({
  progress,
  size = 52,
  strokeWidth = 4,
  className,
  color = 'accent',
}: ProgressRingProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(progress)));
  // Inset so stroke isn't clipped at the SVG edge
  const inset = strokeWidth / 2;
  const radius = size / 2 - inset;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalized / 100);
  const center = size / 2;

  const colors = {
    accent: 'stroke-accent-500',
    success: 'stroke-emerald-500',
    warning: 'stroke-amber-500',
    danger: 'stroke-red-500',
  };

  const labelSize =
    size <= 44 ? 'text-[9px]' : size <= 56 ? 'text-[10px]' : 'text-xs';

  return (
    <div
      className={cn(
        'relative shrink-0 inline-flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${normalized}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block overflow-visible"
        aria-hidden
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-[rgb(var(--border-default))]"
          />
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={colors[color]}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'font-semibold tabular-nums leading-none tracking-tight text-[rgb(var(--fg-primary))]',
            labelSize
          )}
        >
          {normalized}%
        </span>
      </div>
    </div>
  );
}
