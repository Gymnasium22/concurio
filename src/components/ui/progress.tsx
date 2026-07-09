/**
 * Progress — индикатор прогресса (Radix UI)
 */
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-2.5 w-full overflow-hidden rounded-full bg-[rgb(var(--bg-secondary))]',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-500 ease-out"
      style={{ width: `${value ?? 0}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
