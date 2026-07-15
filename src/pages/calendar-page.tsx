import { DeadlineCalendar } from '@/components/task/deadline-calendar';
import { ContestFilters } from '@/components/dashboard/contest-filters';

export function CalendarPage() {
  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Календарь</h1>
        <p className="text-xs sm:text-sm text-[rgb(var(--fg-muted))] mt-0.5">
          День → задачи со сроком (и этапы)
        </p>
      </div>
      <ContestFilters compact />
      <DeadlineCalendar />
    </div>
  );
}
