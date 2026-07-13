/**
 * Workspace: команда, инвайты, activity feed
 */
import { useState } from 'react';
import {
  useAcceptInvite,
  useCreateInvite,
  useCreateWorkspace,
  useWorkspaceActivity,
  useWorkspaceMembers,
  useWorkspaces,
} from '@/hooks/use-platform';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Users, Link2, Plus, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkspacePage() {
  const { data: workspaces } = useWorkspaces();
  const createWs = useCreateWorkspace();
  const accept = useAcceptInvite();
  const activeId = useAppStore((s) => s.activeWorkspaceId);
  const setActive = useAppStore((s) => s.setActiveWorkspaceId);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const selected = activeId || workspaces?.[0]?.id;
  const invite = useCreateInvite(selected || '');
  const { data: members } = useWorkspaceMembers(selected);
  const { data: activity } = useWorkspaceActivity(selected);

  const create = async () => {
    if (!name.trim()) return;
    const ws = await createWs.mutateAsync(name.trim());
    setActive(ws.id);
    setName('');
    toast({ title: 'Workspace создан', variant: 'success' });
  };

  const makeInvite = async () => {
    if (!selected) return;
    const inv = await invite.mutateAsync({ role: 'member' });
    const url = `${window.location.origin}${import.meta.env.BASE_URL}workspace?invite=${inv.token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Ссылка-приглашение скопирована', variant: 'success' });
  };

  const acceptInvite = async () => {
    const t =
      inviteToken.trim() ||
      new URLSearchParams(window.location.search).get('invite') ||
      '';
    if (!t) return;
    await accept.mutateAsync(t);
    toast({ title: 'Вы в команде', variant: 'success' });
    setInviteToken('');
  };

  return (
    <div className="space-y-5 animate-in fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-500" />
          Команда
        </h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-0.5">
          Workspace, роли owner / member / viewer, инвайты
        </p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3 border border-[rgb(var(--border-default))]">
        <p className="text-sm font-medium">Активный контекст</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive(null)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm border',
              !activeId
                ? 'border-accent-400 bg-accent-50 dark:bg-accent-900/30'
                : 'border-[rgb(var(--border-default))]'
            )}
          >
            Личное
          </button>
          {(workspaces ?? []).map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setActive(w.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm border',
                activeId === w.id
                  ? 'border-accent-400 bg-accent-50 dark:bg-accent-900/30'
                  : 'border-[rgb(var(--border-default))]'
              )}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 space-y-2 border border-[rgb(var(--border-default))]">
          <p className="text-sm font-medium">Новый workspace</p>
          <Input
            placeholder="Название команды"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            className="w-full gap-1"
            disabled={createWs.isPending}
            onClick={() => void create()}
          >
            <Plus className="h-4 w-4" />
            Создать
          </Button>
        </div>

        <div className="glass rounded-2xl p-4 space-y-2 border border-[rgb(var(--border-default))]">
          <p className="text-sm font-medium">Принять приглашение</p>
          <Input
            placeholder="Токен или вставьте из ?invite="
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
          />
          <Button
            variant="outline"
            className="w-full"
            disabled={accept.isPending}
            onClick={() => void acceptInvite()}
          >
            Принять
          </Button>
        </div>
      </div>

      {selected && (
        <>
          <div className="glass rounded-2xl p-4 space-y-3 border border-[rgb(var(--border-default))]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Участники</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={invite.isPending}
                onClick={() => void makeInvite()}
              >
                <Link2 className="h-3.5 w-3.5" />
                Ссылка-инвайт
              </Button>
            </div>
            <ul className="space-y-1.5 text-sm">
              {(members ?? []).map((m) => (
                <li
                  key={`${m.workspace_id}-${m.user_id}`}
                  className="flex justify-between border-b border-[rgb(var(--border-default))] py-1.5"
                >
                  <span className="font-mono text-xs truncate max-w-[60%]">
                    {m.user_id.slice(0, 8)}…
                  </span>
                  <span className="text-[rgb(var(--fg-muted))]">{m.role}</span>
                </li>
              ))}
              {!members?.length && (
                <li className="text-[rgb(var(--fg-muted))] text-xs">
                  Нет участников или миграция 007 не применена
                </li>
              )}
            </ul>
          </div>

          <div className="glass rounded-2xl p-4 space-y-2 border border-[rgb(var(--border-default))]">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-accent-500" />
              Activity feed
            </p>
            <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
              {(activity ?? []).map(
                (a: {
                  id: string;
                  action: string;
                  created_at: string;
                  user_id: string;
                }) => (
                  <li
                    key={a.id}
                    className="flex justify-between gap-2 border-b border-[rgb(var(--border-default))] pb-1.5"
                  >
                    <span>
                      <span className="font-medium">{a.action}</span>
                      <span className="text-[rgb(var(--fg-muted))] text-xs ml-1">
                        {a.user_id.slice(0, 6)}…
                      </span>
                    </span>
                    <span className="text-[10px] text-[rgb(var(--fg-muted))] shrink-0">
                      {new Date(a.created_at).toLocaleString('ru')}
                    </span>
                  </li>
                )
              )}
              {!activity?.length && (
                <li className="text-xs text-[rgb(var(--fg-muted))]">Пока нет событий</li>
              )}
            </ul>
          </div>
        </>
      )}

      <p className="text-[11px] text-[rgb(var(--fg-muted))]">
        Нужна миграция <code>007_workspace_platform.sql</code> в Supabase SQL Editor.
        Share и вложения: доступ через RLS workspace member.
      </p>
    </div>
  );
}
