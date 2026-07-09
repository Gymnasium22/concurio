/**
 * LoginPage — страница авторизации (Telegram / Email)
 */
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { isTelegramApp } from '@/lib/telegram';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Mail, Lock, Loader2, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithTelegram, isLoading, error } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authInProgress, setAuthInProgress] = useState(false);

  const isTg = isTelegramApp();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setAuthInProgress(true);
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  const handleTelegramAuth = async () => {
    setAuthInProgress(true);
    await signInWithTelegram();
    setAuthInProgress(false);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-[rgb(var(--bg-primary))] to-[rgb(var(--bg-secondary))]">
      {/* Декоративные круги */}
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
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Добро пожаловать в Concurio</CardTitle>
            <CardDescription className="text-base mt-2">
              Ваш персональный трекер конкурсов и заданий
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            {error && (
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
                <p className="text-center text-xs text-[rgb(var(--fg-muted))] mt-4">
                  Авторизация происходит автоматически и безопасно через ваш Telegram аккаунт.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--fg-muted))]" />
                      <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-9 bg-[rgb(var(--bg-secondary))]/50"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--fg-muted))]" />
                      <Input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="pl-9 bg-[rgb(var(--bg-secondary))]/50"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={authInProgress || isLoading}>
                    {authInProgress || isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      isLogin ? 'Войти' : 'Создать аккаунт'
                    )}
                  </Button>
                </form>

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
