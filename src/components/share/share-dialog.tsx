/**
 * Диалог: выбрать задачи → создать публичную ссылку (только просмотр, без регистрации)
 */
import { useMemo, useState } from 'react';
import { useContests } from '@/hooks/use-contests';
import {
  buildShareUrl,
  useCreateShareLink,
  useMyShareLinks,
  useRevokeShareLink,
} from '@/hooks/use-share';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Share2, Copy, Check, Link2Off, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, TASK_TYPE_LABELS } from '@/lib/constants';
import type { Contest } from '@/types';

export function ShareDialog() {
  const { data: contests, isLoading } = useContests();
  const { data: myLinks } = useMyShareLinks();
  const createShare = useCreateShareLink();
  const revokeShare = useRevokeShareLink();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('7');
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const list = contests ?? [];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(list.map((c) => c.id)));
  };

  const clearAll = () => setSelected(new Set());

  const selectedCount = selected.size;

  const handleCreate = async () => {
    try {
      const days =
        expiresInDays === 'never' ? null : Number(expiresInDays) || 7;
      const result = await createShare.mutateAsync({
        contestIds: [...selected],
        title: title.trim() || undefined,
        expiresInDays: days,
      });
      setLastUrl(result.url);
      toast({ title: 'Ссылка создана', variant: 'success' });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Ошибка',
        variant: 'error',
      });
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Ссылка скопирована', variant: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Не удалось скопировать', variant: 'error' });
    }
  };

  const activeLinks = useMemo(
    () =>
      (myLinks ?? []).filter(
        (l) =>
          !l.revoked_at &&
          (!l.expires_at || new Date(l.expires_at) > new Date())
      ),
    [myLinks]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 sm:w-auto sm:px-3 p-0 sm:gap-1.5 shrink-0"
          aria-label="Поделиться"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Поделиться</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Общий доступ</DialogTitle>
          <DialogDescription>
            Выберите задачи — получите ссылку. Получатель откроет их{' '}
            <strong>без регистрации</strong> (только просмотр). В Telegram и
            мессенджерах подтянется превью с названием подборки.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Название ссылки</label>
            <Input
              placeholder="Например: Для наставника — март 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Срок действия</label>
            <Select value={expiresInDays} onValueChange={setExpiresInDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 день</SelectItem>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
                <SelectItem value="never">Без срока</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Задачи ({selectedCount})
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-accent-500 hover:underline"
                  onClick={selectAll}
                >
                  Все
                </button>
                <button
                  type="button"
                  className="text-xs text-[rgb(var(--fg-muted))] hover:underline"
                  onClick={clearAll}
                >
                  Сбросить
                </button>
              </div>
            </div>

            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
            ) : list.length === 0 ? (
              <p className="text-sm text-[rgb(var(--fg-muted))]">
                Сначала создайте задачи
              </p>
            ) : (
              <ul className="max-h-56 overflow-y-auto space-y-1.5 rounded-xl border border-[rgb(var(--border-default))] p-2">
                {list.map((c: Contest) => {
                  const on = selected.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        className={cn(
                          'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors border',
                          on
                            ? 'border-accent-400 bg-accent-50 dark:bg-accent-900/20'
                            : 'border-transparent hover:bg-[rgb(var(--bg-secondary))]'
                        )}
                      >
                        <span className="font-medium line-clamp-1">{c.title}</span>
                        <span className="block text-[11px] text-[rgb(var(--fg-muted))] mt-0.5">
                          {TASK_TYPE_LABELS[c.task_type] ?? c.task_type} ·{' '}
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Button
            className="w-full gap-2"
            disabled={selectedCount === 0 || createShare.isPending}
            onClick={handleCreate}
          >
            {createShare.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            Создать ссылку
          </Button>

          {lastUrl && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-3 space-y-2">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Готово — скопируйте и отправьте
              </p>
              <div className="flex gap-2">
                <Input readOnly value={lastUrl} className="text-xs h-9" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1"
                  onClick={() => copy(lastUrl)}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {activeLinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[rgb(var(--border-default))]">
              <p className="text-sm font-medium">Активные ссылки</p>
              <ul className="space-y-2">
                {activeLinks.map((link) => {
                  const url = buildShareUrl(link.token);
                  return (
                    <li
                      key={link.id}
                      className="rounded-lg border border-[rgb(var(--border-default))] p-2 text-xs space-y-1"
                    >
                      <p className="font-medium">
                        {link.title || 'Без названия'} · {link.contest_ids.length}{' '}
                        задач · 👁 {link.view_count}
                      </p>
                      <p className="text-[rgb(var(--fg-muted))] truncate">{url}</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => copy(url)}
                        >
                          <Copy className="h-3 w-3" />
                          Копировать
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-red-500"
                          disabled={revokeShare.isPending}
                          onClick={() =>
                            revokeShare.mutate(link.id, {
                              onSuccess: () =>
                                toast({
                                  title: 'Ссылка отозвана',
                                  variant: 'success',
                                }),
                            })
                          }
                        >
                          <Link2Off className="h-3 w-3" />
                          Отозвать
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
