/**
 * Очередь действий при offline → replay при online
 */
export type OfflineAction =
  | {
      id: string;
      type: 'update_status';
      contestId: string;
      status: string;
      progress?: number;
      createdAt: number;
    }
  | {
      id: string;
      type: 'create_task';
      payload: Record<string, unknown>;
      createdAt: number;
    };

export type OfflineActionInput =
  | {
      type: 'update_status';
      contestId: string;
      status: string;
      progress?: number;
    }
  | {
      type: 'create_task';
      payload: Record<string, unknown>;
    };

const KEY = 'concurio-offline-queue-v1';

export function loadOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(items: OfflineAction[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(-50)));
  } catch {
    /* quota */
  }
}

export function enqueueOffline(action: OfflineActionInput): void {
  const items = loadOfflineQueue();
  items.push({
    ...action,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  } as OfflineAction);
  saveOfflineQueue(items);
}

export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

export function removeOfflineAction(id: string): void {
  saveOfflineQueue(loadOfflineQueue().filter((a) => a.id !== id));
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
