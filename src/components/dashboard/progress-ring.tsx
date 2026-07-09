/**
 * ProgressRing — SVG круговой индикатор прогресса (Framer Motion)
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
  size = 64,
  strokeWidth = 6,
  className,
  color = 'accent',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.max(0, Math.min(100, progress)) / 100) * circumference;

  const colors = {
    accent: 'stroke-accent-500',
    success: 'stroke-emerald-500',
    warning: 'stroke-amber-500',
    danger: 'stroke-red-500',
  };

  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Фоновый круг */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-[rgb(var(--bg-secondary))]"
        />
        {/* Индикатор прогресса */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          className={colors[color]}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      {/* Процент в центре */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
