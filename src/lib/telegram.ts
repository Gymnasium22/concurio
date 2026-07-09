/**
 * Telegram Mini App — утилиты и интеграция
 *
 * Определяет, запущено ли приложение в Telegram, и предоставляет
 * доступ к API: MainButton, BackButton, haptic, тема.
 */

/** Тип Telegram WebApp (глобальный объект) */
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
    auth_date?: number;
    hash?: string;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  platform: string;
  version: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

/**
 * Получить объект Telegram WebApp (или null, если не в Telegram)
 */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Проверить, запущено ли приложение внутри Telegram
 */
export function isTelegramApp(): boolean {
  const tg = getTelegramWebApp();
  // Если initData не пустой — мы в Telegram
  return !!(tg && tg.initData && tg.initData.length > 0);
}

/**
 * Инициализировать Telegram Mini App
 * Вызывать один раз при старте приложения
 */
export function initTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (!tg) return;

  // Сообщаем Telegram, что приложение готово
  tg.ready();

  // Разворачиваем на весь экран
  tg.expand();

  // Добавляем CSS-класс для safe areas
  document.body.classList.add('tg-mini-app');

  // Устанавливаем цвета из темы Telegram
  applyTelegramTheme(tg);
}

/**
 * Применить тему Telegram к CSS-переменным
 */
function applyTelegramTheme(tg: TelegramWebApp): void {
  const isDark = tg.colorScheme === 'dark';

  // Устанавливаем класс темы
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Получить пользователя Telegram из initDataUnsafe
 */
export function getTelegramUser() {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user ?? null;
}

/**
 * Haptic feedback — тактильная обратная связь
 */
export const haptic = {
  /** Лёгкий удар (нажатие кнопки) */
  light: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('light'),
  /** Средний удар */
  medium: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('medium'),
  /** Тяжёлый удар */
  heavy: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('heavy'),
  /** Уведомление об успехе */
  success: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('success'),
  /** Уведомление об ошибке */
  error: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('error'),
  /** Уведомление-предупреждение */
  warning: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('warning'),
  /** Изменение выбора */
  selection: () => getTelegramWebApp()?.HapticFeedback.selectionChanged(),
};
