/**
 * Валидация env-переменных Vite (fail soft в dev, warn)
 */
export interface AppEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_PUBLIC_APP_URL?: string;
  VITE_TELEGRAM_BOT_USERNAME?: string;
}

function required(name: keyof AppEnv, value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing env: ${name}`);
  }
  return value.trim();
}

export function getAppEnv(): AppEnv {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  try {
    return {
      VITE_SUPABASE_URL: required('VITE_SUPABASE_URL', url),
      VITE_SUPABASE_ANON_KEY: required('VITE_SUPABASE_ANON_KEY', key),
      VITE_PUBLIC_APP_URL: (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim(),
      VITE_TELEGRAM_BOT_USERNAME: (
        import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined
      )?.trim(),
    };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(
        '[env]',
        e instanceof Error ? e.message : e,
        '— скопируйте .env.example → .env'
      );
    }
    return {
      VITE_SUPABASE_URL: url?.trim() || '',
      VITE_SUPABASE_ANON_KEY: key?.trim() || '',
      VITE_PUBLIC_APP_URL: (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim(),
      VITE_TELEGRAM_BOT_USERNAME: (
        import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined
      )?.trim(),
    };
  }
}

export const appEnv = getAppEnv();
