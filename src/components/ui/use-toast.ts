/**
 * Toast — система уведомлений (хук + состояние)
 * Упрощённая версия shadcn/ui toast без Radix (для лёгкости)
 */
import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

// Глобальное состояние toasts
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];
let toastId = 0;

function notifyListeners() {
  for (const listener of toastListeners) {
    listener([...toasts]);
  }
}

/**
 * Показать toast уведомление (можно вызывать вне React-компонентов)
 */
export function toast(input: Omit<Toast, 'id'>) {
  const id = String(++toastId);
  const newToast: Toast = { ...input, id };
  toasts = [...toasts, newToast];
  notifyListeners();

  // Автоудаление
  setTimeout(() => {
    dismissToast(id);
  }, input.duration ?? 4000);

  return id;
}

/** Удалить toast */
export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

/**
 * Хук для подписки на toasts
 */
export function useToast(): ToastState & {
  toast: typeof toast;
  dismiss: typeof dismissToast;
} {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  // Подписка на обновления
  useEffect(() => {
    const listener = (updatedToasts: Toast[]) => {
      setState({ toasts: updatedToasts });
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  return {
    ...state,
    toast,
    dismiss,
  };
}
