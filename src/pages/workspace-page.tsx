/**
 * Workspace: команда, инвайты, activity feed
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useAcceptInvite,
  useCreateInvite,
  useCreateWorkspace,
  useWorkspaceActivity,
  useWorkspaceMembers,
  useWorkspaces,
} from '@/hooks/use-platform';
import { useAppStore } from '@/stores/app-store';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Users, Link2, Plus, Activity, Copy, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  member: 'Участник',
  viewer: 'Наблюдатель',
};

const ACTION_LABELS: Record<string, string> = {
  checklist_add: 'Чек-лист +',
  checklist_done: 'Пункт выполнен',
  checklist_undone: 'Пункт открыт',
  checklist_remove: 'Пункт удалён',
  comment_add: 'Комментарий',
  mention: 'Упоминание',
  status_change: 'Смена статуса',
  progress_change: 'Прогресс',
  created: 'Создано',
  updated: 'Обновлено',
};

export function WorkspacePage() {
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const createWs = useCreateWorkspace();
  const accept = useAcceptInvite();
  const { user } = useAuth();
  const activeId = useAppStore((s) => s.activeWorkspaceId);
  const setActive = useAppStore((s) => s.setActiveWorkspaceId);
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [name, setName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');
  const [copied, setCopied] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const selected =
    activeId && activeId !== 'all' && activeId !== 'personal'
      ? activeId
      : workspaces?.[0]?.id || '';
  const invite = useCreateInvite(selected);
  const { data: members, isLoading: memLoading } = useWorkspaceMembers(
    selected || undefined
  );
  const { data: activity } = useWorkspaceActivity(selected || undefined);

  // Авто-принятие из ?invite=
  useEffect(() => {
    const token = params.get('invite');
    if (!token || !user) return;
    let cancelled = false;
    (async () => {
      try {
        await accept.mutateAsync(token);
        if (cancelled) return;
        toast({ title: 'Вы присоединились к команде', variant: 'success' });
        params.delete('invite');
        setParams(params, { replace: true });
      } catch (e) {
        if (!cancelled) {
          setInviteToken(token);
          toast({
            title: e instanceof Error ? e.message : 'Не удалось принять инвайт',
            variant: 'error',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount/token
  }, [user?.id]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      const ws = await createWs.mutateAsync(name.trim());
      setActive(ws.id);
      setName('');
      toast({ title: 'Команда создана', variant: 'success' });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Ошибка',
        variant: 'error',
      });
    }
  };

  const makeInvite = async () => {
    if (!selected) {
      toast({ title: 'Сначала создайте или выберите команду', variant: 'error' });
      return;
    }
    try {
      const inv = await invite.mutateAsync({ role: inviteRole });
      const url = `${window.location.origin}${import.meta.env.BASE_URL}workspace?invite=${inv.token}`;
      setLastInviteUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Ссылка скопирована', variant: 'success' });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Ошибка',
        variant: 'error',
      });
    }
  };

  const acceptInvite = async () => {
    const t = inviteToken.trim();
    if (!t) return;
    try {
      await accept.mutateAsync(t);
      toast({ title: 'Вы в команде', variant: 'success' });
      setInviteToken('');
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Ошибка',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
          <Users className="h-6 w-6 text-accent-500" aria-hidden />
          Команда
        </h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-0.5">
          Общие задачи, роли и приглашения по ссылке
        </p>
      </div>

      {/* Контекст */}
      <section className="glass rounded-2xl p-4 space-y-3 border border-[rgb(var(--border-default))]">
        <p className="text-sm font-medium">Где вы работаете</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive('all')}
            className={cn(
              'rounded-xl px-3 py-2 text-sm border transition-colors min-h-[40px]',
              activeId === 'all'
                ? 'border-accent-400 bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200 font-medium'
                : 'border-[rgb(var(--border-default))] hover:bg-[rgb(var(--bg-secondary))]'
            )}
          >
            Все
          </button>
          <button
            type="button"
            onClick={() => setActive('personal')}
            className={cn(
              'rounded-xl px-3 py-2 text-sm border transition-colors min-h-[40px]',
              activeId === 'personal'
                ? 'border-accent-400 bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200 font-medium'
                : 'border-[rgb(var(--border-default))] hover:bg-[rgb(var(--bg-secondary))]'
            )}
          >
            Личное
          </button>
          {wsLoading && (
            <span className="text-xs text-[rgb(var(--fg-muted))] self-center">
              Загрузка…
            </span>
          )}
          {(workspaces ?? []).map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setActive(w.id)}
              className={cn(
                'rounded-xl px-3 py-2 text-sm border transition-colors min-h-[40px]',
                activeId === w.id
                  ? 'border-accent-400 bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200 font-medium'
                  : 'border-[rgb(var(--border-default))] hover:bg-[rgb(var(--bg-secondary))]'
              )}
            >
              {w.name}
            </button>
          ))}
        </div>
        {activeId !== 'all' && activeId !== 'personal' && (
          <p className="text-xs text-[rgb(var(--fg-muted))]">
            Новые задачи попадут в выбранную команду.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className="glass rounded-2xl p-4 space-y-3 border border-[rgb(var(--border-default))]">
          <p className="text-sm font-medium">Новая команда</p>
          <Input
            placeholder="Например: 11А · Проекты"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
          />
          <Button
            className="w-full gap-1.5 min-h-[44px]"
            disabled={createWs.isPending || !name.trim()}
            onClick={() => void create()}
          >
            {createWs.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Создать
          </Button>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3 border border-[rgb(var(--border-default))]">
          <p className="text-sm font-medium">Принять приглашение</p>
          <Input
            placeholder="Вставьте ссылку или токен"
            value={inviteToken}
            onChange={(e) => {
              const v = e.target.value.trim();
              const m = v.match(/invite=([a-f0-9]+)/i);
              setInviteToken(m?.[1] ?? v);
            }}
          />
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            disabled={accept.isPending || !inviteToken.trim()}
            onClick={() => void acceptInvite()}
          >
            {accept.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Присоединиться'
            )}
          </Button>
        </section>
      </div>

      {selected ? (
        <>
          <section className="glass rounded-2xl p-4 space-y-3 border border-[rgb(var(--border-default))]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm font-medium">Участники</p>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as 'member' | 'viewer')}
                >
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Участник</SelectItem>
                    <SelectItem value="viewer">Наблюдатель</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-9"
                  disabled={invite.isPending}
                  onClick={() => void makeInvite()}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  Пригласить
                </Button>
              </div>
            </div>

            {lastInviteUrl && (
              <div className="flex gap-2 items-center rounded-xl bg-[rgb(var(--bg-secondary))] p-2">
                <p className="text-[11px] truncate flex-1 font-mono text-[rgb(var(--fg-muted))]">
                  {lastInviteUrl}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={async () => {
                    await navigator.clipboard.writeText(lastInviteUrl);
                    toast({ title: 'Скопировано', variant: 'success' });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {memLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
            ) : (
              <ul className="space-y-1.5">
                {(members ?? []).map((m) => {
                  const isMe = m.user_id === user?.id;
                  return (
                    <li
                      key={`${m.workspace_id}-${m.user_id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[rgb(var(--border-default))] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {isMe ? 'Вы' : `Участник ${m.user_id.slice(0, 8)}`}
                        </p>
                        <p className="text-[11px] text-[rgb(var(--fg-muted))] font-mono truncate">
                          {m.user_id}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                          m.role === 'owner'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                            : m.role === 'viewer'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                        )}
                      >
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                    </li>
                  );
                })}
                {!members?.length && (
                  <li className="text-center text-sm text-[rgb(var(--fg-muted))] py-6 border border-dashed rounded-xl">
                    Пока только вы. Пригласите коллег ссылкой.
                  </li>
                )}
              </ul>
            )}
          </section>

          <section className="glass rounded-2xl p-4 space-y-3 border border-[rgb(var(--border-default))]">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-accent-500" aria-hidden />
              Лента активности
            </p>
            <ul className="space-y-2 max-h-72 overflow-y-auto overscroll-contain">
              {(activity ?? []).map(
                (a: {
                  id: string;
                  action: string;
                  created_at: string;
                  user_id: string;
                }) => (
                  <li
                    key={a.id}
                    className="flex justify-between gap-3 rounded-lg px-2 py-2 hover:bg-[rgb(var(--bg-secondary))]/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {ACTION_LABELS[a.action] ?? a.action}
                      </p>
                      <p className="text-[11px] text-[rgb(var(--fg-muted))]">
                        {a.user_id === user?.id ? 'Вы' : a.user_id.slice(0, 8) + '…'}
                      </p>
                    </div>
                    <time className="text-[10px] text-[rgb(var(--fg-muted))] shrink-0 tabular-nums">
                      {new Date(a.created_at).toLocaleString('ru', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </li>
                )
              )}
              {!activity?.length && (
                <li className="text-sm text-center text-[rgb(var(--fg-muted))] py-8 border border-dashed rounded-xl">
                  Событий пока нет — работайте с общими задачами
                </li>
              )}
            </ul>
          </section>
        </>
      ) : (
        !wsLoading && (
          <div className="glass-subtle rounded-2xl p-8 text-center border border-dashed border-[rgb(var(--border-default))]">
            <Users className="h-10 w-10 text-accent-500 mx-auto mb-3 opacity-80" />
            <p className="font-medium">Создайте первую команду</p>
            <p className="text-sm text-[rgb(var(--fg-muted))] mt-1 max-w-sm mx-auto">
              Или примите приглашение — общие задачи появятся при выборе workspace в
              шапке.
            </p>
          </div>
        )
      )}
    </div>
  );
}
