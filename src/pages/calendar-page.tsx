import { DeadlineCalendar } from '@/components/task/deadline-calendar';
import { ContestFilters } from '@/components/dashboard/contest-filters';

export function CalendarPage() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Календарь дедлайнов</h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-1">
          Выберите день, чтобы увидеть задачи со сроком
        </p>
      </div>
      <ContestFilters />
      <DeadlineCalendar />
    </div>
  );
}
