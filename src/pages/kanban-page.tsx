import { KanbanBoard } from '@/components/task/kanban-board';
import { ContestFilters } from '@/components/dashboard/contest-filters';

export function KanbanPage() {
  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Канбан</h1>
          <p className="text-sm text-[rgb(var(--fg-muted))] mt-0.5 leading-snug">
            <span className="md:hidden">Свайп по колонкам · </span>
            перетащите карточку или «⋯»
          </p>
        </div>
      </div>
      <ContestFilters compact />
      <KanbanBoard />
    </div>
  );
}
