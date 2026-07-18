/**
 * Баннер offline + flush очереди при online
 */
import { useCallback, useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import {
  loadOfflineQueue,
  clearOfflineQueue,
  removeOfflineAction,
  type OfflineAction,
} from '@/lib/offline-queue';
import { updateContest, createContest } from '@/services/contestService';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

async function replayAction(action: OfflineAction): Promise<void> {
  if (action.type === 'update_status') {
    await updateContest(action.contestId, {
      status: action.status as import('@/types').ContestStatus,
      progress: action.progress,
      completed_at: action.status === 'done' ? new Date().toISOString() : null,
    });
    return;
  }
  if (action.type === 'create_task') {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('Нет сессии');
    await createContest(action.payload as import('@/types').ContestInsert, userId);
  }
}

export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  const refreshCount = useCallback(() => setPending(loadOfflineQueue().length), []);

  const flush = useCallback(async () => {
    const queue = loadOfflineQueue();
    if (queue.length === 0) {
      setPending(0);
      return;
    }
    setSyncing(true);
    for (const action of queue) {
      try {
        await replayAction(action);
        removeOfflineAction(action.id);
      } catch {
        break;
      }
    }
    if (loadOfflineQueue().length === 0) clearOfflineQueue();
    refreshCount();
    setSyncing(false);
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.contests });
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.stats });
  }, [qc, refreshCount]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void flush();
    };
    const off = () => {
      setOnline(false);
      refreshCount();
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    refreshCount();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [flush, refreshCount]);

  if (online && pending === 0) return null;

  return (
    <div
      className={cn(
        'fixed left-1/2 z-[60] -translate-x-1/2 top-[max(0.5rem,env(safe-area-inset-top))]',
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg',
        'border backdrop-blur-xl',
        online
          ? 'border-amber-300/60 bg-amber-50/95 text-amber-900 dark:bg-amber-950/90 dark:text-amber-100'
          : 'border-red-300/50 bg-red-50/95 text-red-800 dark:bg-red-950/90 dark:text-red-100'
      )}
      role="status"
    >
      {!online ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Офлайн{pending > 0 ? ` · ${pending} в очереди` : ''}</span>
        </>
      ) : (
        <>
          <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
          <span>{syncing ? 'Синхронизация…' : `${pending} ждут отправки`}</span>
          {!syncing && (
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => void flush()}
            >
              Отправить
            </button>
          )}
        </>
      )}
    </div>
  );
}
