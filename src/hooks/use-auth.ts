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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithTelegram: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Преобразовать Supabase User в AppUser
 */
function toAppUser(user: User): AppUser {
  return {
    id: user.id,
    email: user.email ?? null,
    display_name: user.user_metadata?.['display_name'] as string
      || user.user_metadata?.['first_name'] as string
      || user.email
      || 'Пользователь',
    telegram_id: user.user_metadata?.['telegram_id'] as number | undefined,
    avatar_url: user.user_metadata?.['avatar_url'] as string | undefined,
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
      return;
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
      }
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Ошибка авторизации',
      }));
    }
  }, []);

  /** Вход через Email */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setState(s => ({ ...s, isLoading: false, error: error.message }));
    }
  }, []);

  /** Регистрация через Email */
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: email.split('@')[0] },
      },
    });

    if (error) {
      setState(s => ({ ...s, isLoading: false, error: error.message }));
    }
  }, []);

  /** Выход */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
    signOut,
  };
}

// Флаг для предотвращения повторного автологина
useAuth.autoLoginAttempted = false;
