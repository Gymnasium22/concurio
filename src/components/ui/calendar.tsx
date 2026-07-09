/**
 * Calendar — календарь для выбора даты (react-day-picker)
 */
import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ru}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium capitalize',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-[rgb(var(--fg-muted))] rounded-md w-9 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent-100 dark:[&:has([aria-selected])]:bg-accent-900/30 [&:has([aria-selected].day-outside)]:bg-accent-100/50 [&:has([aria-selected].day-range-end)]:rounded-r-md',
          'first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        range_end: 'day-range-end',
        selected: 'bg-accent-500 text-white hover:bg-accent-600 hover:text-white focus:bg-accent-500 focus:text-white rounded-md',
        today: 'bg-accent-100 text-accent-900 dark:bg-accent-900/30 dark:text-accent-200 rounded-md',
        outside: 'day-outside text-[rgb(var(--fg-muted))] opacity-50 aria-selected:bg-accent-100/50 aria-selected:text-[rgb(var(--fg-muted))] aria-selected:opacity-30',
        disabled: 'text-[rgb(var(--fg-muted))] opacity-50',
        range_middle: 'aria-selected:bg-accent-100 aria-selected:text-accent-900 dark:aria-selected:bg-accent-900/30 dark:aria-selected:text-accent-200',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
