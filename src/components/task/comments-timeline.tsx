import { useState } from 'react';
import {
  useActivity,
  useCommentMutations,
  useComments,
} from '@/hooks/use-task-extras';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Trash2, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const ACTION_LABELS: Record<string, string> = {
  checklist_add: 'Добавлен пункт чек-листа',
  checklist_done: 'Пункт отмечен выполненным',
  checklist_undone: 'Пункт снова открыт',
  checklist_remove: 'Пункт удалён',
  comment_add: 'Добавлен комментарий',
  comment_remove: 'Комментарий удалён',
  status_change: 'Изменён статус',
  progress_change: 'Изменён прогресс',
  created: 'Задача создана',
  updated: 'Задача обновлена',
};

export function CommentsTimeline({ contestId }: { contestId: string }) {
  const { data: comments, isLoading: cLoad } = useComments(contestId);
  const { data: activity, isLoading: aLoad } = useActivity(contestId);
  const { addComment, removeComment } = useCommentMutations(contestId);
  const [body, setBody] = useState('');
  const [tab, setTab] = useState<'comments' | 'timeline'>('comments');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    await addComment.mutateAsync(body);
    setBody('');
  };

  return (
    <div className="glass p-5 sm:p-6 rounded-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('comments')}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
            tab === 'comments'
              ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
              : 'text-[rgb(var(--fg-secondary))]'
          }`}
        >
          <MessageSquare className="inline h-4 w-4 mr-1" />
          Комментарии
        </button>
        <button
          type="button"
          onClick={() => setTab('timeline')}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
            tab === 'timeline'
              ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
              : 'text-[rgb(var(--fg-secondary))]'
          }`}
        >
          <Clock className="inline h-4 w-4 mr-1" />
          Timeline
        </button>
      </div>

      {tab === 'comments' && (
        <div className="space-y-4">
          <form onSubmit={handleAdd} className="space-y-2">
            <Textarea
              placeholder="Напишите комментарий..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[80px]"
            />
            <Button type="submit" size="sm" disabled={addComment.isPending || !body.trim()}>
              Отправить
            </Button>
          </form>

          {cLoad ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
          ) : !comments?.length ? (
            <p className="text-sm text-[rgb(var(--fg-muted))]">Пока нет комментариев</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-[rgb(var(--border-default))] p-3 group"
                >
                  <div className="flex justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap flex-1">{c.body}</p>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 text-red-500 shrink-0"
                      onClick={() => removeComment.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[rgb(var(--fg-muted))] mt-1">
                    {formatDistanceToNow(new Date(c.created_at), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="space-y-0">
          {aLoad ? (
            <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
          ) : !activity?.length ? (
            <p className="text-sm text-[rgb(var(--fg-muted))]">Пока нет событий</p>
          ) : (
            <ol className="relative border-l border-[rgb(var(--border-default))] ml-2 space-y-4">
              {activity.map((ev) => (
                <li key={ev.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-accent-500" />
                  <p className="text-sm font-medium">
                    {ACTION_LABELS[ev.action] ?? ev.action}
                  </p>
                  {ev.details && Object.keys(ev.details).length > 0 && (
                    <p className="text-xs text-[rgb(var(--fg-muted))]">
                      {typeof ev.details.preview === 'string'
                        ? ev.details.preview
                        : typeof ev.details.title === 'string'
                          ? String(ev.details.title)
                          : typeof ev.details.status === 'string'
                            ? `→ ${String(ev.details.status)}`
                            : ''}
                    </p>
                  )}
                  <p className="text-[11px] text-[rgb(var(--fg-muted))]">
                    {formatDistanceToNow(new Date(ev.created_at), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
