/**
 * useAuth — хук авторизации
 *
 * Поддерживает:
 * - Автологин через Telegram (создаёт пользователя по Telegram ID)
 * - Email/Password (fallback для веб-версии)
 * - Выход из аккаунта
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getTelegramUser, isTelegramApp } from '@/lib/telegram';
import type { AppUser } from '@/types';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  signInWithTelegram: () => Promise<boolean>;
  linkTelegramToCurrentAccount: () => Promise<boolean>;
  unlinkTelegramFromCurrentAccount: () => Promise<boolean>;
  setEmailPasswordForCurrentAccount: (password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

/**
 * Преобразовать Supabase User в AppUser
 */
function toAppUser(user: User): AppUser {
  const metadata = user.user_metadata ?? {};
  const telegramId = metadata['telegram_id'] as number | undefined;
  const authProvider = (metadata['auth_provider'] as AppUser['auth_provider'] | undefined)
    || (telegramId ? 'telegram' : 'email');

  return {
    id: user.id,
    email: user.email ?? null,
    display_name: metadata['display_name'] as string
      || metadata['first_name'] as string
      || user.email
      || 'Пользователь',
    telegram_id: telegramId,
    avatar_url: metadata['avatar_url'] as string | undefined,
    auth_provider: authProvider,
  };
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  // Загрузить текущую сессию при монтировании
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setState({ user: toAppUser(session.user), isLoading: false, error: null });
        } else {
          setState({ user: null, isLoading: false, error: null });
        }
      } catch {
        setState({ user: null, isLoading: false, error: 'Ошибка загрузки сессии' });
      }
    };

    loadSession();

    // Подписка на изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setState({ user: toAppUser(session.user), isLoading: false, error: null });
        } else {
          setState({ user: null, isLoading: false, error: null });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Вход через Telegram
   * Создаёт виртуальный email из Telegram ID и логинится
   */
  const signInWithTelegram = useCallback(async () => {
    const tgUser = getTelegramUser();
    if (!tgUser) {
      setState(s => ({ ...s, error: 'Telegram пользователь не найден' }));
      return false;
    }

    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData?.trim();

      if (!initData) {
        throw new Error('Телеграм Mini App не передал initData');
      }

      const { data, error: functionError } = await supabase.functions.invoke<{
        success: boolean;
        credentials?: { email: string; password: string };
        error?: string;
      }>('telegram-auth', {
        body: { initData },
      });

      if (functionError || !data?.success || !data.credentials) {
        throw new Error(data?.error || functionError?.message || 'Ошибка авторизации через Telegram');
      }

      const { email, password } = data.credentials;
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setState(s => ({ ...s, isLoading: false, error: signInError.message }));
        return false;
      }

      return true;
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Ошибка авторизации',
      }));
      return false;
    }
  }, []);

  /** Вход через Email */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }

    return true;
  }, []);

  /** Регистрация через Email */
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: email.split('@')[0],
          auth_provider: 'email',
        },
      },
    });

    if (error) {
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }

    return true;
  }, []);

  const linkTelegramToCurrentAccount = useCallback(async () => {
    const currentUser = state.user;
    if (!currentUser?.id) {
      setState(s => ({ ...s, error: 'Сначала войдите в аккаунт' }));
      return false;
    }

    const tgUser = getTelegramUser();
    if (!tgUser) {
      setState(s => ({ ...s, error: 'Telegram пользователь не найден' }));
      return false;
    }

    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData?.trim();

      if (!initData) {
        throw new Error('Телеграм Mini App не передал initData');
      }

      const { data, error: functionError } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('telegram-auth', {
        body: { initData, bindToUserId: currentUser.id },
      });

      if (functionError || !data?.success) {
        throw new Error(data?.error || functionError?.message || 'Не удалось привязать Telegram');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          telegram_id: tgUser.id,
          avatar_url: tgUser.photo_url ?? null,
          auth_provider: 'telegram',
        },
      });

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Не удалось привязать Telegram',
      }));
      return false;
    }
  }, [state.user]);

  const unlinkTelegramFromCurrentAccount = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    const { error } = await supabase.auth.updateUser({
      data: {
        telegram_id: null,
        avatar_url: null,
        auth_provider: 'email',
      },
    });

    if (error) {
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }

    return true;
  }, []);

  const setEmailPasswordForCurrentAccount = useCallback(async (password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        auth_provider: 'email',
      },
    });

    if (error) {
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }

    return true;
  }, []);

  /** Выход */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    useAuth.autoLoginAttempted = true;
    setState({ user: null, isLoading: false, error: null });
  }, []);

  // Автовход из Telegram при первом рендере
  useEffect(() => {
    if (isTelegramApp() && !state.user && !state.isLoading) {
      // Небольшая задержка, чтобы не конфликтовать с загрузкой сессии
      const timer = setTimeout(() => {
        if (!useAuth.autoLoginAttempted) {
          useAuth.autoLoginAttempted = true;
          signInWithTelegram();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.user, state.isLoading, signInWithTelegram]);

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithTelegram,
    linkTelegramToCurrentAccount,
    unlinkTelegramFromCurrentAccount,
    setEmailPasswordForCurrentAccount,
    signOut,
  };
}

// Флаг для предотвращения повторного автологина
useAuth.autoLoginAttempted = false;
