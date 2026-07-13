import { usePurgeTrash, useRestoreTrash, useTrash } from '@/hooks/use-platform';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { RotateCcw, Trash2, Archive } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { STATUS_LABELS } from '@/lib/constants';

export function TrashPage() {
  const { data, isLoading, error } = useTrash();
  const restore = useRestoreTrash();
  const purge = usePurgeTrash();
  const { toast } = useToast();

  return (
    <div className="space-y-4 animate-in fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="h-6 w-6 text-accent-500" aria-hidden />
          Корзина
        </h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-0.5">
          Удалённые задачи можно вернуть или стереть навсегда
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
          {error instanceof Error ? error.message : 'Ошибка загрузки корзины'}
        </p>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="glass-subtle p-10 rounded-2xl text-center border border-dashed border-[rgb(var(--border-default))]">
          <Trash2 className="h-10 w-10 text-[rgb(var(--fg-muted))] mx-auto mb-3 opacity-50" />
          <p className="font-medium">Корзина пуста</p>
          <p className="text-sm text-[rgb(var(--fg-muted))] mt-1">
            Удалённые задачи появятся здесь
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {(data ?? []).map((c) => (
          <li
            key={c.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-[rgb(var(--border-default))] p-3 sm:p-4 bg-[rgb(var(--bg-card))]"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{c.title}</p>
              <p className="text-xs text-[rgb(var(--fg-muted))] mt-0.5">
                {STATUS_LABELS[c.status] ?? c.status}
                {c.deleted_at ? ` · удалено ${formatDate(c.deleted_at)}` : ''}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 flex-1 sm:flex-none min-h-[40px]"
                disabled={restore.isPending}
                onClick={() =>
                  restore.mutate(c.id, {
                    onSuccess: () =>
                      toast({ title: 'Задача восстановлена', variant: 'success' }),
                    onError: (e) =>
                      toast({
                        title: e instanceof Error ? e.message : 'Ошибка',
                        variant: 'error',
                      }),
                  })
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Вернуть
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 flex-1 sm:flex-none min-h-[40px]"
                disabled={purge.isPending}
                onClick={() => {
                  if (!confirm('Удалить навсегда? Это нельзя отменить.')) return;
                  purge.mutate(c.id, {
                    onSuccess: () =>
                      toast({ title: 'Удалено навсегда', variant: 'success' }),
                  });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Стереть
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
