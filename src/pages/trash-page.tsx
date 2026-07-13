import { usePurgeTrash, useRestoreTrash, useTrash } from '@/hooks/use-platform';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function TrashPage() {
  const { data, isLoading } = useTrash();
  const restore = useRestoreTrash();
  const purge = usePurgeTrash();
  const { toast } = useToast();

  return (
    <div className="space-y-4 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold">Корзина</h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-0.5">
          Мягкое удаление — восстановите или удалите навсегда
        </p>
      </div>

      {isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}

      {!isLoading && (!data || data.length === 0) && (
        <div className="glass-subtle p-10 rounded-2xl text-center text-sm text-[rgb(var(--fg-muted))] border border-dashed">
          Корзина пуста
        </div>
      )}

      <ul className="space-y-2">
        {(data ?? []).map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border-default))] p-3 bg-[rgb(var(--bg-card))]"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{c.title}</p>
              <p className="text-xs text-[rgb(var(--fg-muted))]">
                Удалено: {formatDate(c.deleted_at)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={restore.isPending}
              onClick={() =>
                restore.mutate(c.id, {
                  onSuccess: () => toast({ title: 'Восстановлено', variant: 'success' }),
                })
              }
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Вернуть
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1"
              disabled={purge.isPending}
              onClick={() => {
                if (!confirm('Удалить навсегда?')) return;
                purge.mutate(c.id, {
                  onSuccess: () =>
                    toast({ title: 'Удалено навсегда', variant: 'success' }),
                });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
