import { KanbanBoard } from '@/components/task/kanban-board';
import { ContestFilters } from '@/components/dashboard/contest-filters';

export function KanbanPage() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Канбан</h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-1">
          Перетаскивайте задачи между колонками кнопками «→ статус»
        </p>
      </div>
      <ContestFilters />
      <KanbanBoard />
    </div>
  );
}
