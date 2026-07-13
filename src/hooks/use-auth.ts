/**
 * useAuth — авторизация Email + Telegram (+ привязка без создания нового профиля)
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getTelegramLinkToken,
  getTelegramUser,
  isTelegramApp,
  isTelegramLinkFlow,
} from '@/lib/telegram';
import type { AppUser } from '@/types';
import type { User } from '@supabase/supabase-js';
import { VISUAL_MOCK_USER } from '@/lib/visual-mock';

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  error: string | null;
  /** Успешная привязка Telegram к email (показать экран «можно закрыть») */
  linkSuccess: boolean;
  linkMessage: string | null;
}

interface UseAuthReturn extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  signInWithTelegram: () => Promise<boolean>;
  linkTelegramToCurrentAccount: () => Promise<boolean>;
  unlinkTelegramFromCurrentAccount: () => Promise<boolean>;
  setEmailPasswordForCurrentAccount: (password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearLinkState: () => void;
}

function toAppUser(user: User): AppUser {
  const metadata = user.user_metadata ?? {};
  const telegramId = metadata['telegram_id'] as number | undefined;
  const authProvider =
    (metadata['auth_provider'] as AppUser['auth_provider'] | undefined) ||
    (telegramId ? 'telegram' : 'email');

  return {
    id: user.id,
    email: user.email ?? null,
    display_name:
      (metadata['display_name'] as string) ||
      (metadata['first_name'] as string) ||
      user.email ||
      'Пользователь',
    telegram_id: telegramId,
    avatar_url: metadata['avatar_url'] as string | undefined,
    auth_provider: authProvider,
  };
}

async function parseFunctionError(
  functionError: { message?: string; context?: Response } | null,
  data: { error?: string } | null
): Promise<string> {
  let detail =
    data?.error || functionError?.message || 'Ошибка авторизации через Telegram';

  // FunctionsHttpError: body may be in context as Response or already-read clone
  const ctx = functionError?.context as
    Response | { json?: () => Promise<{ error?: string }>; body?: string } | undefined;

  if (ctx) {
    try {
      if (typeof (ctx as Response).json === 'function') {
        const body =
          (await (ctx as Response).clone?.().json?.()) ??
          (await (ctx as Response).json());
        if (body?.error) detail = body.error;
      }
    } catch {
      try {
        if (typeof (ctx as Response).text === 'function') {
          const text =
            (await (ctx as Response).clone?.().text?.()) ??
            (await (ctx as Response).text());
          const parsed = JSON.parse(text);
          if (parsed?.error) detail = parsed.error;
        }
      } catch {
        /* ignore */
      }
    }
  }

  // Частые «пустые» сообщения
  if (detail.includes('non-2xx') || detail.includes('Failed to send')) {
    detail =
      detail +
      ' (проверьте токен бота TELEGRAM_BOT_TOKEN и что Mini App открыт из того же бота)';
  }
  return detail;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    linkSuccess: false,
    linkMessage: null,
  });

  useEffect(() => {
    const loadSession = async () => {
      // Локальный visual-review без подтверждённого email
      if (VISUAL_MOCK_USER) {
        setState((s) => ({
          ...s,
          user: VISUAL_MOCK_USER,
          isLoading: false,
          error: null,
        }));
        return;
      }
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setState((s) => ({
            ...s,
            user: toAppUser(session.user),
            isLoading: false,
            error: null,
          }));
        } else {
          setState((s) => ({ ...s, user: null, isLoading: false, error: null }));
        }
      } catch {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: s.user ? null : 'Ошибка загрузки сессии',
        }));
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setState((s) => ({
          ...s,
          user: toAppUser(session.user),
          isLoading: false,
          error: null,
        }));
        return;
      }
      // Разлогин только при явном SIGNED_OUT — иначе глюки сети «выкидывали» из аккаунта
      if (event === 'SIGNED_OUT') {
        setState((s) => ({
          ...s,
          user: null,
          isLoading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithTelegram = useCallback(async () => {
    const tgUser = getTelegramUser();
    if (!tgUser) {
      setState((s) => ({ ...s, error: 'Telegram пользователь не найден' }));
      return false;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData?.trim();
      if (!initData) throw new Error('Телеграм Mini App не передал initData');

      const { data, error: functionError } = await supabase.functions.invoke<{
        success: boolean;
        auth_method?: 'password' | 'otp';
        email?: string;
        password?: string;
        token_hash?: string;
        credentials?: { email: string; password: string };
        linked?: boolean;
        error?: string;
      }>('telegram-auth', {
        body: { initData },
      });

      if (functionError || !data?.success) {
        throw new Error(await parseFunctionError(functionError, data));
      }

      // OTP (magiclink hash) — для email-аккаунтов, пароль НЕ сбрасываем
      if (data.auth_method === 'otp' && data.token_hash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'email',
        });
        if (otpError) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: otpError.message,
          }));
          return false;
        }
        return true;
      }

      const email = data.credentials?.email || data.email;
      const password = data.credentials?.password || data.password;
      if (!email || !password) {
        throw new Error('Сервер не вернул данные для входа');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: signInError.message,
        }));
        return false;
      }

      return true;
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Ошибка авторизации',
      }));
      return false;
    }
  }, []);

  /**
   * Привязка Telegram к email-аккаунту по одноразовому link-токену из startapp.
   * НЕ создаёт новый профиль и НЕ логинит под tg_*.
   */
  const completeTelegramLinkFromStartParam = useCallback(async () => {
    const linkToken = getTelegramLinkToken();
    if (!linkToken) return false;

    setState((s) => ({
      ...s,
      isLoading: true,
      error: null,
      linkSuccess: false,
      linkMessage: null,
    }));

    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData?.trim();
      if (!initData) throw new Error('Нет initData от Telegram');

      const { data, error: functionError } = await supabase.functions.invoke<{
        success: boolean;
        linked?: boolean;
        error?: string;
        user?: { email?: string; display_name?: string };
      }>('telegram-auth', {
        body: { initData, linkToken },
      });

      if (functionError || !data?.success) {
        throw new Error(await parseFunctionError(functionError, data));
      }

      const email = data.user?.email;
      setState((s) => ({
        ...s,
        isLoading: false,
        error: null,
        linkSuccess: true,
        linkMessage: email
          ? `Telegram привязан к аккаунту ${email}. Можно закрыть Telegram и обновить страницу в браузере.`
          : 'Telegram успешно привязан. Можно закрыть Telegram и обновить страницу в браузере.',
      }));
      useAuth.autoLoginAttempted = true;
      return true;
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        linkSuccess: false,
        error: err instanceof Error ? err.message : 'Не удалось привязать Telegram',
        linkMessage: null,
      }));
      useAuth.autoLoginAttempted = true;
      return false;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((s) => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }
    return true;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
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
      setState((s) => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }
    return true;
  }, []);

  /** Привязка изнутри уже открытого Mini App (если пользователь уже залогинен email) */
  const linkTelegramToCurrentAccount = useCallback(async () => {
    const currentUser = state.user;
    if (!currentUser?.id) {
      setState((s) => ({ ...s, error: 'Сначала войдите в аккаунт' }));
      return false;
    }

    const tgUser = getTelegramUser();
    if (!tgUser) {
      setState((s) => ({ ...s, error: 'Telegram пользователь не найден' }));
      return false;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData?.trim();
      if (!initData) throw new Error('Телеграм Mini App не передал initData');

      // Создаём токен и сразу bind
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const token = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { error: tokenErr } = await supabase.from('account_link_tokens').insert({
        token,
        user_id: currentUser.id,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
      if (tokenErr) throw tokenErr;

      const { data, error: functionError } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>('telegram-auth', {
        body: { initData, linkToken: token },
      });

      if (functionError || !data?.success) {
        throw new Error(await parseFunctionError(functionError, data));
      }

      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
        data: {
          telegram_id: tgUser.id,
          avatar_url: tgUser.photo_url ?? null,
          auth_provider: 'telegram',
        },
      });
      if (updateError) throw updateError;

      if (updatedUser?.user) {
        setState((s) => ({
          ...s,
          user: toAppUser(updatedUser.user),
          isLoading: false,
          error: null,
        }));
      } else {
        setState((s) => ({ ...s, isLoading: false, error: null }));
      }
      return true;
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Не удалось привязать Telegram',
      }));
      return false;
    }
  }, [state.user]);

  const unlinkTelegramFromCurrentAccount = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    // Удаляем identity если есть
    if (state.user?.telegram_id) {
      await supabase
        .from('telegram_identities')
        .delete()
        .eq('telegram_id', state.user.telegram_id);
    }

    const { data: updatedUser, error } = await supabase.auth.updateUser({
      data: {
        telegram_id: null,
        avatar_url: null,
        auth_provider: 'email',
      },
    });

    if (error) {
      setState((s) => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }

    if (updatedUser?.user) {
      setState((s) => ({
        ...s,
        user: toAppUser(updatedUser.user),
        isLoading: false,
        error: null,
      }));
    } else {
      setState((s) => ({ ...s, isLoading: false, error: null }));
    }
    return true;
  }, [state.user?.telegram_id]);

  const setEmailPasswordForCurrentAccount = useCallback(async (password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    const { data: updatedUser, error } = await supabase.auth.updateUser({
      password,
      data: { auth_provider: 'email' },
    });
    if (error) {
      setState((s) => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }
    if (updatedUser?.user) {
      setState((s) => ({
        ...s,
        user: toAppUser(updatedUser.user),
        isLoading: false,
        error: null,
      }));
    } else {
      setState((s) => ({ ...s, isLoading: false, error: null }));
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    useAuth.autoLoginAttempted = true;
    setState({
      user: null,
      isLoading: false,
      error: null,
      linkSuccess: false,
      linkMessage: null,
    });
  }, []);

  const clearLinkState = useCallback(() => {
    setState((s) => ({ ...s, linkSuccess: false, linkMessage: null, error: null }));
  }, []);

  // 1) Сначала привязка по link_TOKEN — без создания нового аккаунта
  useEffect(() => {
    if (!isTelegramApp() || state.isLoading) return;
    if (useAuth.linkAttempted) return;

    if (isTelegramLinkFlow()) {
      useAuth.linkAttempted = true;
      useAuth.autoLoginAttempted = true; // блокируем обычный автологин
      void completeTelegramLinkFromStartParam();
    }
  }, [state.isLoading, completeTelegramLinkFromStartParam]);

  // 2) Обычный автовход Telegram (только если НЕ режим привязки)
  useEffect(() => {
    if (!isTelegramApp() || state.user || state.isLoading) return;
    if (isTelegramLinkFlow() || state.linkSuccess) return;

    const timer = setTimeout(() => {
      if (!useAuth.autoLoginAttempted) {
        useAuth.autoLoginAttempted = true;
        void signInWithTelegram();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [state.user, state.isLoading, state.linkSuccess, signInWithTelegram]);

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithTelegram,
    linkTelegramToCurrentAccount,
    unlinkTelegramFromCurrentAccount,
    setEmailPasswordForCurrentAccount,
    signOut,
    clearLinkState,
  };
}

useAuth.autoLoginAttempted = false;
useAuth.linkAttempted = false;
