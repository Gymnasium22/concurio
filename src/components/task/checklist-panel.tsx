import { useState } from 'react';
import { useChecklist, useChecklistMutations } from '@/hooks/use-task-extras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChecklistPanel({ contestId }: { contestId: string }) {
  const { data: items, isLoading } = useChecklist(contestId);
  const { addItem, toggleItem, removeItem, reorderItems } =
    useChecklistMutations(contestId);
  const [title, setTitle] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  const list = items ?? [];
  const done = list.filter((i) => i.is_done).length;
  const total = list.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addItem.mutateAsync(title);
    setTitle('');
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= list.length) return;
    const ids = list.map((i) => i.id);
    const [removed] = ids.splice(index, 1);
    ids.splice(next, 0, removed!);
    await reorderItems.mutateAsync(ids);
  };

  const onDropOn = async (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = list.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    setDragId(null);
    await reorderItems.mutateAsync(ids);
  };

  return (
    <div className="glass p-5 sm:p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[rgb(var(--fg-secondary))]">
            Чек-лист
          </h3>
          {total > 0 && (
            <p className="text-[11px] text-[rgb(var(--fg-muted))] mt-0.5">
              Прогресс задачи = {pct}% ({done} из {total}) · перетащите или ▲▼
            </p>
          )}
        </div>
        {total > 0 && (
          <span className="text-sm font-bold tabular-nums text-accent-500 shrink-0">
            {pct}%
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="h-2 rounded-full bg-[rgb(var(--bg-secondary))] overflow-hidden">
          <div
            className="h-full bg-accent-500 transition-all duration-300 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {total === 0 && !isLoading && (
        <p className="text-xs text-[rgb(var(--fg-muted))]">
          Добавьте пункты — прогресс задачи будет считаться автоматически.
        </p>
      )}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
      ) : (
        <ul className="space-y-2">
          {list.map((item, index) => (
            <li
              key={item.id}
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDropOn(item.id)}
              className={cn(
                'flex items-center gap-1 group rounded-xl border border-[rgb(var(--border-default))] px-2 py-1.5',
                dragId === item.id && 'opacity-50'
              )}
            >
              <span
                className="text-[rgb(var(--fg-muted))] cursor-grab active:cursor-grabbing p-1 shrink-0"
                title="Перетащить"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <button
                type="button"
                className="shrink-0 text-accent-500 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center touch-manipulation"
                onClick={() =>
                  toggleItem.mutate({ id: item.id, is_done: !item.is_done })
                }
              >
                {item.is_done ? (
                  <CheckSquare className="h-5 w-5" />
                ) : (
                  <Square className="h-5 w-5 text-[rgb(var(--fg-muted))]" />
                )}
              </button>
              <span
                className={cn(
                  'flex-1 text-sm min-w-0',
                  item.is_done && 'line-through text-[rgb(var(--fg-muted))]'
                )}
              >
                {item.title}
              </span>
              <div className="flex flex-col shrink-0">
                <button
                  type="button"
                  className="p-0.5 text-[rgb(var(--fg-muted))] hover:text-accent-500 disabled:opacity-30"
                  disabled={index === 0 || reorderItems.isPending}
                  onClick={() => void move(index, -1)}
                  aria-label="Выше"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="p-0.5 text-[rgb(var(--fg-muted))] hover:text-accent-500 disabled:opacity-30"
                  disabled={index === list.length - 1 || reorderItems.isPending}
                  onClick={() => void move(index, 1)}
                  aria-label="Ниже"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-red-500 p-2 touch-manipulation"
                onClick={() => removeItem.mutate(item.id)}
                aria-label="Удалить пункт"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void handleAdd(e)} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новый пункт..."
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={addItem.isPending || !title.trim()}>
          {addItem.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
