import { useState } from 'react';
import { useChecklist, useChecklistMutations } from '@/hooks/use-task-extras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, Square, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChecklistPanel({ contestId }: { contestId: string }) {
  const { data: items, isLoading } = useChecklist(contestId);
  const { addItem, toggleItem, removeItem } = useChecklistMutations(contestId);
  const [title, setTitle] = useState('');

  const done = items?.filter((i) => i.is_done).length ?? 0;
  const total = items?.length ?? 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addItem.mutateAsync(title);
    setTitle('');
  };

  return (
    <div className="glass p-5 sm:p-6 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[rgb(var(--fg-secondary))]">Чек-лист</h3>
        {total > 0 && (
          <span className="text-xs font-medium text-[rgb(var(--fg-muted))]">
            {done}/{total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="h-1.5 rounded-full bg-[rgb(var(--bg-secondary))] overflow-hidden">
          <div
            className="h-full bg-accent-500 transition-all"
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      )}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
      ) : (
        <ul className="space-y-2">
          {(items ?? []).map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 group rounded-xl border border-[rgb(var(--border-default))] px-3 py-2"
            >
              <button
                type="button"
                className="shrink-0 text-accent-500"
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
                  'flex-1 text-sm',
                  item.is_done && 'line-through text-[rgb(var(--fg-muted))]'
                )}
              >
                {item.title}
              </span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-red-500 p-1"
                onClick={() => removeItem.mutate(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="Новый пункт..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10"
        />
        <Button type="submit" size="sm" className="h-10 gap-1" disabled={addItem.isPending}>
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </form>
    </div>
  );
}
