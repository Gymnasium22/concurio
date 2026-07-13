/**
 * Публичная страница share — без входа
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicShare, type PublicShareBundle } from '@/hooks/use-share';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  CheckSquare,
  Loader2,
  Calendar,
  Paperclip,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  STATUS_LABELS,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  TASK_TYPE_COLORS,
} from '@/lib/constants';
import { cn, formatFileSize } from '@/lib/utils';

export function PublicSharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicShareBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Нет токена ссылки');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const bundle = await fetchPublicShare(token);
        if (cancelled) return;
        if (!bundle.ok) {
          const map: Record<string, string> = {
            not_found: 'Ссылка не найдена',
            revoked: 'Ссылка отозвана владельцем',
            expired: 'Срок действия ссылки истёк',
            empty: 'В ссылке нет задач',
            invalid_token: 'Некорректная ссылка',
          };
          setError(map[bundle.error || ''] || bundle.error || 'Недоступно');
          setData(null);
        } else {
          setData(bundle);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  type ChecklistItem = {
    id: string;
    title: string;
    is_done: boolean;
    position: number;
  };

  const checklistMap = useMemo(() => {
    const m = new Map<string, ChecklistItem[]>();
    for (const block of data?.checklists || []) {
      m.set(block.contest_id, block.items);
    }
    return m;
  }, [data?.checklists]);

  const attachmentsByContest = useMemo(() => {
    const m = new Map<string, NonNullable<PublicShareBundle['attachments']>>();
    for (const a of data?.attachments || []) {
      const list = m.get(a.contest_id) || [];
      list.push(a);
      m.set(a.contest_id, list);
    }
    return m;
  }, [data?.attachments]);

  return (
    <div className="min-h-[var(--tg-viewport-stable-height,100dvh)] flex flex-col bg-[rgb(var(--bg-primary))] text-[rgb(var(--fg-primary))] overflow-x-hidden">
      <header className="sticky top-0 z-40 glass border-b border-[rgb(var(--border-default))] pt-[var(--tg-content-safe-top,0px)] shrink-0">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
              <CheckSquare className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">Concurio</p>
              <p className="text-[10px] text-[rgb(var(--fg-muted))]">
                Публичный просмотр
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Link to="/">
              <Button size="sm" variant="outline">
                Войти
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4',
          'py-4 sm:py-6 space-y-4 sm:space-y-6',
          'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          /* на десктопе ошибка/лоадер — по центру, без «дыры» внизу */
          (loading || error) &&
            'flex flex-col justify-center min-h-[min(70vh,calc(100dvh-5rem))]'
        )}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
            <p className="text-sm text-[rgb(var(--fg-muted))]">Загрузка…</p>
          </div>
        )}

        {error && !loading && (
          <div className="glass rounded-2xl p-8 sm:p-10 text-center space-y-3 max-w-lg mx-auto w-full shadow-lg border border-[rgb(var(--border-default))]">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <h1 className="text-xl font-bold">{error}</h1>
            <p className="text-sm text-[rgb(var(--fg-muted))]">
              Попросите владельца прислать новую ссылку или открыть доступ снова.
            </p>
            <Link to="/">
              <Button className="mt-2" variant="outline">
                На страницу входа
              </Button>
            </Link>
          </div>
        )}

        {data?.ok && !loading && (
          <>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 px-3 py-1 text-xs font-medium">
                Только просмотр · без регистрации
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {data.share?.title || 'Общий доступ'}
              </h1>
              <p className="text-sm text-[rgb(var(--fg-muted))]">
                {data.share?.task_count ?? data.contests?.length ?? 0} задач
                {data.share?.expires_at &&
                  ` · до ${format(new Date(data.share.expires_at), 'd MMMM yyyy', { locale: ru })}`}
              </p>
            </div>

            <div className="space-y-4">
              {(data.contests || []).map((raw) => {
                const c = raw as {
                  id: string;
                  title: string;
                  description: string | null;
                  status: string;
                  progress: number;
                  due_date: string | null;
                  task_type: string;
                  priority: string;
                  tags?: string[];
                };
                const status = c.status as keyof typeof STATUS_LABELS;
                const type = c.task_type as keyof typeof TASK_TYPE_LABELS;
                const priority = c.priority as keyof typeof PRIORITY_LABELS;
                const items = checklistMap.get(c.id) || [];
                const files = attachmentsByContest.get(c.id) || [];
                const done = items.filter((i) => i.is_done).length;

                return (
                  <article
                    key={c.id}
                    className="glass rounded-2xl p-5 sm:p-6 space-y-4 border border-[rgb(var(--border-default))]"
                  >
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-md border',
                          TASK_TYPE_COLORS[type]?.text,
                          TASK_TYPE_COLORS[type]?.bg,
                          TASK_TYPE_COLORS[type]?.border
                        )}
                      >
                        {TASK_TYPE_LABELS[type] ?? c.task_type}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-md',
                          STATUS_COLORS[status]?.text,
                          STATUS_COLORS[status]?.bg
                        )}
                      >
                        {STATUS_LABELS[status] ?? c.status}
                      </span>
                      <span className="text-[11px] text-[rgb(var(--fg-muted))] px-2 py-0.5">
                        {PRIORITY_LABELS[priority] ?? c.priority}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold">{c.title}</h2>

                    {c.description && (
                      <p className="text-sm text-[rgb(var(--fg-secondary))] whitespace-pre-wrap">
                        {c.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-[rgb(var(--fg-muted))]">
                      {c.due_date && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(c.due_date), 'd MMMM yyyy', {
                            locale: ru,
                          })}
                        </span>
                      )}
                      <span className="font-medium text-accent-500">{c.progress}%</span>
                    </div>

                    <Progress value={c.progress ?? 0} className="h-2" />

                    {c.tags && c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[rgb(var(--bg-secondary))] text-[rgb(var(--fg-muted))]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {items.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[rgb(var(--border-default))]">
                        <p className="text-xs font-medium text-[rgb(var(--fg-muted))]">
                          Чек-лист · {done}/{items.length}
                        </p>
                        <ul className="space-y-1">
                          {items.map((item) => (
                            <li
                              key={item.id}
                              className={cn(
                                'text-sm flex items-start gap-2',
                                item.is_done && 'line-through text-[rgb(var(--fg-muted))]'
                              )}
                            >
                              <span className="mt-0.5">{item.is_done ? '☑' : '☐'}</span>
                              {item.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {files.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[rgb(var(--border-default))]">
                        <p className="text-xs font-medium text-[rgb(var(--fg-muted))] flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5" />
                          Файлы
                        </p>
                        <ul className="space-y-1.5">
                          {files.map((f) => (
                            <li key={f.id}>
                              {f.url ? (
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-accent-500 hover:underline inline-flex items-center gap-1"
                                >
                                  {f.file_name}
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="text-[rgb(var(--fg-muted))] text-xs">
                                    {formatFileSize(f.file_size)}
                                  </span>
                                </a>
                              ) : (
                                <span className="text-sm text-[rgb(var(--fg-muted))]">
                                  {f.file_name}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {(data.contests || []).length === 0 && (
              <p className="text-center text-[rgb(var(--fg-muted))]">
                Нет доступных задач
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
