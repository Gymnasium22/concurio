/**
 * Подзадачи — дедлайны, DnD-порядок, автопрогресс родителя (на бэке)
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useSubtasks,
  useCreateContest,
  useUpdateContest,
  useUpdateContestStatus,
  useReorderSubtasks,
} from '@/hooks/use-contests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATUS_LABELS, progressForStatusChange } from '@/lib/constants';
import {
  formatDate,
  getDeadlineUrgency,
  getUrgencyColor,
  cn,
  dueDateToIso,
} from '@/lib/utils';
import { Loader2, Plus, GitBranch, Calendar, GripVertical } from 'lucide-react';
import type { ContestStatus } from '@/types';

export function SubtasksPanel({ parentId }: { parentId: string }) {
  const { data: subtasks, isLoading } = useSubtasks(parentId);
  const create = useCreateContest();
  const update = useUpdateContest();
  const updateStatus = useUpdateContestStatus();
  const reorder = useReorderSubtasks(parentId);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  const list = subtasks ?? [];
  const doneCount = list.filter((s) => s.status === 'done').length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      parent_id: parentId,
      task_type: 'task',
      status: 'todo',
      progress: 0,
      due_date: dueDateToIso(dueDate || null),
    });
    setTitle('');
    setDueDate('');
  };

  const onDropOn = async (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = list.map((s) => s.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    setDragId(null);
    await reorder.mutateAsync(ids);
  };

  return (
    <div className="glass p-5 sm:p-6 rounded-2xl space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <GitBranch className="h-4 w-4 text-accent-500" />
        <h3 className="text-sm font-medium text-[rgb(var(--fg-secondary))]">Подзадачи</h3>
        <span className="text-xs text-[rgb(var(--fg-muted))]">
          ({doneCount}/{list.length})
        </span>
      </div>

      <p className="text-xs text-[rgb(var(--fg-muted))]">
        У каждой подзадачи свой дедлайн. Порядок — перетаскиванием; прогресс родителя
        считается автоматически по подзадачам.
      </p>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
      ) : list.length === 0 ? (
        <p className="text-xs text-[rgb(var(--fg-muted))]">
          Разбейте работу на более мелкие шаги.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => {
            const urgency = getDeadlineUrgency(s.due_date);
            return (
              <li
                key={s.id}
                draggable
                onDragStart={() => setDragId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void onDropOn(s.id)}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border border-[rgb(var(--border-default))] px-2 py-2.5 sm:flex-row sm:items-center',
                  dragId === s.id && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span
                    className="text-[rgb(var(--fg-muted))] cursor-grab active:cursor-grabbing p-1 shrink-0"
                    title="Перетащить"
                    aria-hidden
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <Link
                    to={`/contest/${s.id}`}
                    className="flex-1 min-w-0 text-sm font-medium hover:text-accent-500 truncate"
                    draggable={false}
                  >
                    {s.title}
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-[rgb(var(--fg-muted))]">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <input
                      type="date"
                      className="rounded-md border border-[rgb(var(--border-default))] bg-transparent px-1.5 py-1 text-[11px] max-w-[9.5rem]"
                      value={s.due_date ? s.due_date.slice(0, 10) : ''}
                      disabled={update.isPending}
                      onChange={(e) => {
                        const v = e.target.value;
                        void update.mutateAsync({
                          id: s.id,
                          due_date: dueDateToIso(v || null),
                        });
                      }}
                      title={s.due_date ? formatDate(s.due_date) : 'Дедлайн'}
                    />
                    {s.due_date && (
                      <span className={cn('hidden sm:inline', getUrgencyColor(urgency))}>
                        {formatDate(s.due_date)}
                      </span>
                    )}
                  </label>

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
                        progress: progressForStatusChange(status, s.progress),
                      });
                    }}
                  >
                    {(Object.keys(STATUS_LABELS) as ContestStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={(e) => void handleAdd(e)}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название подзадачи..."
          className="flex-1"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="sm:w-[10.5rem]"
          title="Дедлайн"
          aria-label="Дедлайн подзадачи"
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
