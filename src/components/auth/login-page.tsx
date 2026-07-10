/**
 * LoginPage — Email / Telegram + экран успешной привязки
 */
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { isTelegramApp, isTelegramLinkFlow } from '@/lib/telegram';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, Mail, Lock, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function LoginPage() {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithTelegram,
    isLoading,
    error,
    linkSuccess,
    linkMessage,
  } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authInProgress, setAuthInProgress] = useState(false);

  const isTg = isTelegramApp();
  const isLinkFlow = isTelegramLinkFlow();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthInProgress(true);
    try {
      if (isLogin) await signInWithEmail(email, password);
      else await signUpWithEmail(email, password);
    } finally {
      setAuthInProgress(false);
    }
  };

  const handleTelegramAuth = async () => {
    setAuthInProgress(true);
    await signInWithTelegram();
    setAuthInProgress(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      return;
    }
    setAuthInProgress(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL || '/'}`,
        }
      );
      if (resetError) {
        // показываем через alert — useAuth error может не обновиться
        alert(resetError.message);
      } else {
        alert(
          'Если аккаунт с таким email есть, письмо для сброса пароля отправлено. Проверьте почту (и спам).'
        );
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  // Экран успешной / идущей привязки
  if (isTg && (linkSuccess || isLinkFlow)) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="glass max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            {isLoading && !linkSuccess ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-accent-500 mx-auto" />
                <h2 className="text-xl font-bold">Привязываем Telegram…</h2>
                <p className="text-sm text-[rgb(var(--fg-secondary))]">
                  Не закрывайте окно, идёт привязка к email-аккаунту из браузера.
                </p>
              </>
            ) : linkSuccess ? (
              <>
                <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
                <h2 className="text-xl font-bold">Готово!</h2>
                <p className="text-sm text-[rgb(var(--fg-secondary))]">
                  {linkMessage || 'Telegram привязан. Вернитесь в браузер и обновите страницу.'}
                </p>
              </>
            ) : error ? (
              <>
                <h2 className="text-xl font-bold text-red-500">Ошибка привязки</h2>
                <p className="text-sm text-[rgb(var(--fg-secondary))]">{error}</p>
                <p className="text-xs text-[rgb(var(--fg-muted))]">
                  Вернитесь в браузер и нажмите «Привязать Telegram» ещё раз (ссылка одноразовая, 15 мин).
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-[rgb(var(--bg-primary))] to-[rgb(var(--bg-secondary))]">
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-accent-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass border-[rgb(var(--border-strong))] shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-lg mb-4">
              <CheckSquare className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Concurio</CardTitle>
            <CardDescription className="text-base mt-2">
              Трекер задач и конкурсов
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            {error && !isLinkFlow && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-medium dark:bg-red-900/20 dark:border-red-800/50">
                {error}
              </div>
            )}

            {isTg ? (
              <div className="space-y-4">
                <Button
                  className="w-full h-12 text-base gap-2 bg-[#2AABEE] hover:bg-[#229ED9] text-white"
                  onClick={handleTelegramAuth}
                  disabled={authInProgress || isLoading}
                >
                  {authInProgress || isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  Войти через Telegram
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--fg-muted))]" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-[rgb(var(--bg-secondary))]/50"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--fg-muted))]" />
                    <Input
                      type="password"
                      placeholder="Пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 bg-[rgb(var(--bg-secondary))]/50"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={authInProgress || isLoading}>
                    {authInProgress || isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isLogin ? (
                      'Войти'
                    ) : (
                      'Создать аккаунт'
                    )}
                  </Button>
                </form>

                {isLogin && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={authInProgress || !email.trim()}
                      className="text-sm text-accent-500 hover:underline disabled:opacity-50"
                    >
                      Забыли пароль? Сбросить по email
                    </button>
                    <p className="text-[11px] text-[rgb(var(--fg-muted))] mt-2 px-2">
                      Если раньше входили через Telegram, старый пароль мог сброситься —
                      восстановите по email или войдите из Mini App бота @concurio_bot.
                    </p>
                  </div>
                )}

                <div className="text-center text-sm">
                  <span className="text-[rgb(var(--fg-muted))]">
                    {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-1 font-medium text-accent-500 hover:underline"
                  >
                    {isLogin ? 'Зарегистрироваться' : 'Войти'}
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
