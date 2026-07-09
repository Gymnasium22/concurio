/**
 * Input — компонент текстового поля
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] px-4 py-2 text-sm text-[rgb(var(--fg-primary))] placeholder:text-[rgb(var(--fg-muted))] transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-accent-400/50 focus:border-accent-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
