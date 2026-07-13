/**
 * Подзадачи — иерархия через parent_id
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubtasks, useCreateContest, useUpdateContestStatus } from '@/hooks/use-contests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATUS_LABELS, STATUS_DEFAULT_PROGRESS } from '@/lib/constants';
import { Loader2, Plus, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContestStatus } from '@/types';

export function SubtasksPanel({ parentId }: { parentId: string }) {
  const { data: subtasks, isLoading } = useSubtasks(parentId);
  const create = useCreateContest();
  const updateStatus = useUpdateContestStatus();
  const [title, setTitle] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      parent_id: parentId,
      task_type: 'task',
      status: 'todo',
      progress: 0,
    });
    setTitle('');
  };

  const list = subtasks ?? [];

  return (
    <div className="glass p-5 sm:p-6 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-accent-500" />
        <h3 className="text-sm font-medium text-[rgb(var(--fg-secondary))]">
          Подзадачи
        </h3>
        <span className="text-xs text-[rgb(var(--fg-muted))]">({list.length})</span>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
      ) : list.length === 0 ? (
        <p className="text-xs text-[rgb(var(--fg-muted))]">
          Разбейте работу на более мелкие шаги.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border-default))] px-3 py-2"
            >
              <Link
                to={`/contest/${s.id}`}
                className="flex-1 min-w-0 text-sm font-medium hover:text-accent-500 truncate"
              >
                {s.title}
              </Link>
              <select
                className={cn(
                  'text-[11px] rounded-md border border-[rgb(var(--border-default))] bg-transparent px-1.5 py-1 max-w-[7.5rem]'
                )}
                value={s.status}
                disabled={updateStatus.isPending}
                onChange={(e) => {
                  const status = e.target.value as ContestStatus;
                  void updateStatus.mutateAsync({
                    id: s.id,
                    status,
                    progress: STATUS_DEFAULT_PROGRESS[status],
                  });
                }}
              >
                {(Object.keys(STATUS_LABELS) as ContestStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void handleAdd(e)} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название подзадачи..."
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={create.isPending || !title.trim()}>
          {create.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
