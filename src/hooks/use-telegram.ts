/**
 * useTelegram — хуки для Telegram Mini App API
 *
 * MainButton, BackButton, тема, haptic
 */
import { useEffect, useRef } from 'react';
import { getTelegramWebApp, isTelegramApp as checkIsTelegramApp } from '@/lib/telegram';

/**
 * Управление Telegram MainButton
 * Показывает кнопку внизу экрана (вместо стандартного submit)
 */
export function useTelegramMainButton(
  text: string,
  onClick: () => void,
  options?: {
    disabled?: boolean;
    loading?: boolean;
    visible?: boolean;
  }
): void {
  const callbackRef = useRef(onClick);
  callbackRef.current = onClick;

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;

    const handler = () => callbackRef.current();

    // Настраиваем кнопку
    tg.MainButton.setText(text);

    if (options?.disabled) {
      tg.MainButton.disable();
    } else {
      tg.MainButton.enable();
    }

    if (options?.loading) {
      tg.MainButton.showProgress();
    } else {
      tg.MainButton.hideProgress();
    }

    if (options?.visible !== false) {
      tg.MainButton.show();
    } else {
      tg.MainButton.hide();
    }

    tg.MainButton.onClick(handler);

    return () => {
      tg.MainButton.offClick(handler);
      tg.MainButton.hide();
    };
  }, [text, options?.disabled, options?.loading, options?.visible]);
}

/**
 * Управление Telegram BackButton
 * Показывает стрелку «назад» в шапке Telegram
 */
export function useTelegramBackButton(
  onBack: () => void,
  visible = true
): void {
  const callbackRef = useRef(onBack);
  callbackRef.current = onBack;

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;

    const handler = () => callbackRef.current();

    if (visible) {
      tg.BackButton.show();
      tg.BackButton.onClick(handler);
    } else {
      tg.BackButton.hide();
    }

    return () => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    };
  }, [visible]);
}

/**
 * Определить, запущено ли приложение в Telegram
 */
export function useIsTelegramApp(): boolean {
  return checkIsTelegramApp();
}

/**
 * Получить тему Telegram
 */
export function useTelegramTheme(): 'light' | 'dark' | null {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  return tg.colorScheme;
}
