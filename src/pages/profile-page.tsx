import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { isTelegramApp, openTelegramBindingLink } from '@/lib/telegram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Link2, Unlink2, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    signOut,
    linkTelegramToCurrentAccount,
    unlinkTelegramFromCurrentAccount,
    setEmailPasswordForCurrentAccount,
    isLoading,
    error,
  } = useAuth();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  if (!user) {
    return null;
  }

  const isTelegramLinked = Boolean(user.telegram_id);
  const authMethodLabel = user.auth_provider === 'telegram' || isTelegramLinked ? 'Telegram' : 'Email';
  const isInTelegram = isTelegramApp();

  const runAction = async (action: () => Promise<boolean>, successText: string) => {
    setBusy(true);
    setMessage(null);
    const ok = await action();
    setBusy(false);
    if (ok) {
      setMessage(successText);
    }
  };

  const handleLinkTelegram = async () => {
    if (!isInTelegram) {
      setBusy(true);
      setMessage('Открываю Telegram Mini App для привязки…');
      const opened = openTelegramBindingLink();
      setBusy(false);
      if (!opened) {
        setMessage('Не удалось открыть Telegram Mini App. Проверьте настройки бота.');
      }
      return;
    }

    await runAction(linkTelegramToCurrentAccount, 'Telegram успешно привязан к аккаунту');
  };

  const handleUnlinkTelegram = async () => {
    await runAction(unlinkTelegramFromCurrentAccount, 'Telegram успешно отвязан');
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length < 6) {
      setMessage('Минимум 6 символов для пароля');
      return;
    }

    setBusy(true);
    setMessage(null);
    const ok = await setEmailPasswordForCurrentAccount(password);
    setBusy(false);
    if (ok) {
      setMessage('Пароль для входа по email установлен');
      setPassword('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        {!isTelegramApp() && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Профиль</h1>
      </div>

      <div className="glass p-6 sm:p-8 rounded-3xl space-y-6">
        <div className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))]/70 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Текущий способ входа</p>
              <p className="text-sm text-[rgb(var(--fg-secondary))]">{authMethodLabel}</p>
            </div>
            <div className="rounded-full bg-accent-100/70 px-3 py-1 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
              {user.email ?? 'Аккаунт'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[rgb(var(--border-default))] pt-3">
            <span className="text-sm text-[rgb(var(--fg-secondary))]">Telegram</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isTelegramLinked ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
              {isTelegramLinked ? 'Привязан' : 'Не привязан'}
            </span>
          </div>
        </div>

        {(message || error) && (
          <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-700 dark:border-accent-900/40 dark:bg-accent-950/30 dark:text-accent-300">
            {message || error}
          </div>
        )}

        <div className="space-y-3">
          <Button type="button" className="w-full justify-start gap-2" onClick={handleLinkTelegram} disabled={busy || isLoading}>
            <Link2 className="h-4 w-4" />
            {isTelegramLinked ? 'Перепривязать Telegram' : 'Привязать Telegram'}
          </Button>

          {isTelegramLinked && (
            <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={handleUnlinkTelegram} disabled={busy || isLoading}>
              <Unlink2 className="h-4 w-4" />
              Отвязать Telegram
            </Button>
          )}

          <form onSubmit={handleSetPassword} className="space-y-3 rounded-2xl border border-[rgb(var(--border-default))] p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Вход по email и паролю
            </div>
            <p className="text-sm text-[rgb(var(--fg-secondary))]">
              Установите пароль, чтобы позже входить через email даже если аккаунт был создан через Telegram.
            </p>
            <Input
              type="password"
              placeholder="Придумайте пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || isLoading}
            />
            <Button type="submit" variant="outline" className="w-full gap-2" disabled={busy || isLoading}>
              <ShieldCheck className="h-4 w-4" />
              Установить пароль
            </Button>
          </form>
        </div>

        <Button type="button" variant="destructive" className="w-full gap-2" onClick={handleSignOut} disabled={busy || isLoading}>
          <LogOut className="h-4 w-4" />
          Выйти из профиля
        </Button>
      </div>
    </div>
  );
}
