/**
 * Textarea — многострочное текстовое поле
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[100px] w-full rounded-xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-card))] px-4 py-3 text-sm text-[rgb(var(--fg-primary))] placeholder:text-[rgb(var(--fg-muted))] transition-colors duration-200 resize-y',
        'focus:outline-none focus:ring-2 focus:ring-accent-400/50 focus:border-accent-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
