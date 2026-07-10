/**
 * Telegram Mini App — утилиты и интеграция
 */

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
    start_param?: string;
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
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }) => void;
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
  setHeaderColor: (color: string | 'bg_color' | 'secondary_bg_color') => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  disableVerticalSwipes?: () => void;
  enableVerticalSwipes?: () => void;
  requestFullscreen?: () => void;
  isVerticalSwipesEnabled?: boolean;
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
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

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function isTelegramApp(): boolean {
  const tg = getTelegramWebApp();
  return !!(tg && tg.initData && tg.initData.length > 0);
}

function hexToRgbCss(hex?: string): string | null {
  if (!hex || !hex.startsWith('#')) return null;
  const h = hex.slice(1);
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return `${r} ${g} ${b}`;
}

/** CSS-переменные viewport / safe-area для вёрстки */
export function syncTelegramViewportCss(tg: TelegramWebApp): void {
  const root = document.documentElement;
  const vh = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight;
  root.style.setProperty('--tg-viewport-height', `${vh}px`);
  root.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight || vh}px`);

  const safe = tg.safeAreaInset;
  const content = tg.contentSafeAreaInset;
  if (safe) {
    root.style.setProperty('--tg-safe-top', `${safe.top || 0}px`);
    root.style.setProperty('--tg-safe-bottom', `${safe.bottom || 0}px`);
    root.style.setProperty('--tg-safe-left', `${safe.left || 0}px`);
    root.style.setProperty('--tg-safe-right', `${safe.right || 0}px`);
  }
  if (content) {
    root.style.setProperty('--tg-content-safe-top', `${content.top || 0}px`);
    root.style.setProperty('--tg-content-safe-bottom', `${content.bottom || 0}px`);
  }
}

function applyTelegramTheme(tg: TelegramWebApp): void {
  const isDark = tg.colorScheme === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  const tp = tg.themeParams || {};
  const bg = hexToRgbCss(tp.bg_color);
  const secondary = hexToRgbCss(tp.secondary_bg_color);
  const text = hexToRgbCss(tp.text_color);
  const hint = hexToRgbCss(tp.hint_color);
  const button = hexToRgbCss(tp.button_color);

  const root = document.documentElement;
  if (bg) root.style.setProperty('--bg-primary', bg);
  if (secondary) root.style.setProperty('--bg-secondary', secondary);
  if (text) root.style.setProperty('--fg-primary', text);
  if (hint) root.style.setProperty('--fg-muted', hint);
  if (button) root.style.setProperty('--accent-rgb', button);

  try {
    // secondary_bg_color / bg_color — строковые токены Telegram API
    if (tp.bg_color) {
      tg.setHeaderColor('bg_color');
    }
    if (tp.secondary_bg_color || tp.bg_color) {
      tg.setBackgroundColor(tp.secondary_bg_color || tp.bg_color!);
    }
  } catch {
    /* старые клиенты */
  }
}

/**
 * Инициализация Mini App: expand, тема, safe area, без случайного закрытия свайпом
 */
export function initTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (!tg) return;

  tg.ready();
  tg.expand();

  try {
    tg.disableVerticalSwipes?.();
  } catch {
    /* optional API */
  }

  document.body.classList.add('tg-mini-app');
  document.documentElement.classList.add('tg-mini-app');

  applyTelegramTheme(tg);
  syncTelegramViewportCss(tg);

  const onViewport = () => syncTelegramViewportCss(tg);
  const onTheme = () => applyTelegramTheme(tg);

  tg.onEvent('viewportChanged', onViewport);
  tg.onEvent('themeChanged', onTheme);
  tg.onEvent('safeAreaChanged', onViewport);
  tg.onEvent('contentSafeAreaChanged', onViewport);
}

/** Отметить, что MainButton Telegram открыт — доп. отступ снизу */
export function setTelegramMainButtonOpen(open: boolean): void {
  document.body.classList.toggle('tg-main-button-open', open);
}

export function getTelegramStartParam(): string | null {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.start_param) {
    return tg.initDataUnsafe.start_param;
  }

  const initData = tg?.initData?.trim();
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    return params.get('start_param');
  } catch {
    return null;
  }
}

export function getTelegramLinkToken(): string | null {
  const start = getTelegramStartParam();
  if (!start) return null;
  if (start.startsWith('link_')) return start.slice('link_'.length);
  if (start === 'bind' || start.startsWith('bind_')) return null;
  return null;
}

export function isTelegramLinkFlow(): boolean {
  const start = getTelegramStartParam();
  return !!start && start.startsWith('link_');
}

export function getTelegramUser() {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }

  const initData = tg?.initData?.trim();
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const rawUser = params.get('user');
    if (!rawUser) return null;
    const parsedUser = JSON.parse(rawUser);
    return {
      id: Number(parsedUser.id),
      first_name: parsedUser.first_name ?? '',
      last_name: parsedUser.last_name ?? undefined,
      username: parsedUser.username ?? undefined,
      language_code: parsedUser.language_code ?? undefined,
      photo_url: parsedUser.photo_url ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function openTelegramBindingLink(userId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const rawBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'concurio_bot';
  const botUsername = rawBotUsername.replace(/^@/, '').trim();
  if (!botUsername) {
    return { ok: false, error: 'Не задан username бота' };
  }
  if (!userId) {
    return { ok: false, error: 'Нет user id' };
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { supabase } = await import('@/lib/supabase');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await supabase.from('account_link_tokens').insert({
    token,
    user_id: userId,
    expires_at: expiresAt,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes('account_link_tokens') || error.code === '42P01'
          ? 'Таблица привязки не создана. Примените миграции Supabase.'
          : error.message,
    };
  }

  const webAppLink = `https://t.me/${botUsername}/app?startapp=link_${token}`;

  if (typeof window !== 'undefined') {
    window.open(webAppLink, '_blank', 'noopener,noreferrer');
  }

  return { ok: true };
}

export const haptic = {
  light: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('light'),
  medium: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('medium'),
  heavy: () => getTelegramWebApp()?.HapticFeedback.impactOccurred('heavy'),
  success: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('success'),
  error: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('error'),
  warning: () => getTelegramWebApp()?.HapticFeedback.notificationOccurred('warning'),
  selection: () => getTelegramWebApp()?.HapticFeedback.selectionChanged(),
};
