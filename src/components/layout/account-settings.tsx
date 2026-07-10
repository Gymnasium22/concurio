import { useState } from 'react';
import { Settings, LogOut, Link2, Unlink2, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { isTelegramApp, openTelegramBindingLink } from '@/lib/telegram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function AccountSettings() {
  const {
    user,
    signOut,
    linkTelegramToCurrentAccount,
    unlinkTelegramFromCurrentAccount,
    setEmailPasswordForCurrentAccount,
    isLoading,
    error,
  } = useAuth();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  if (!user) return null;

  const isTelegramLinked = Boolean(user.telegram_id);
  const authMethodLabel =
    user.auth_provider === 'telegram' || isTelegramLinked ? 'Telegram + Email' : 'Email';
  const isInTelegram = isTelegramApp();

  const runAction = async (action: () => Promise<boolean>, successText: string) => {
    setBusy(true);
    setMessage(null);
    const ok = await action();
    setBusy(false);
    if (ok) setMessage(successText);
  };

  const handleLinkTelegram = async () => {
    if (!isInTelegram) {
      setBusy(true);
      setMessage(null);
      // Одноразовый токен + открытие Mini App — НЕ создаёт новый профиль
      const result = await openTelegramBindingLink(user.id);
      setBusy(false);
      if (result.ok) {
        setMessage(
          'Откройте Telegram Mini App и подтвердите привязку. Затем обновите эту страницу — Telegram появится как «Привязан».'
        );
      } else {
        setMessage(result.error || 'Не удалось открыть привязку');
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
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 sm:w-auto sm:px-3 p-0 sm:gap-2 shrink-0"
          aria-label="Настройки"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Настройки</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки аккаунта</DialogTitle>
          <DialogDescription>
            Привязка Telegram не создаёт второй профиль — добавляет вход к текущему email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))]/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Текущий способ входа</p>
                <p className="text-sm text-[rgb(var(--fg-secondary))]">{authMethodLabel}</p>
              </div>
              <div className="rounded-full bg-accent-100/70 px-3 py-1 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 max-w-[50%] truncate">
                {user.email ?? 'Аккаунт'}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[rgb(var(--border-default))] pt-2">
              <span className="text-sm text-[rgb(var(--fg-secondary))]">Telegram</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  isTelegramLinked
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {isTelegramLinked ? 'Привязан' : 'Не привязан'}
              </span>
            </div>
          </div>

          {(message || error) && (
            <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-700 dark:border-accent-900/40 dark:bg-accent-950/30 dark:text-accent-300">
              {message || error}
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              className="w-full justify-start gap-2"
              onClick={handleLinkTelegram}
              disabled={busy || isLoading}
            >
              <Link2 className="h-4 w-4" />
              {isTelegramLinked ? 'Перепривязать Telegram' : 'Привязать Telegram'}
            </Button>

            {isTelegramLinked && (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleUnlinkTelegram}
                disabled={busy || isLoading}
              >
                <Unlink2 className="h-4 w-4" />
                Отвязать Telegram
              </Button>
            )}

            <form
              onSubmit={handleSetPassword}
              className="space-y-2 rounded-2xl border border-[rgb(var(--border-default))] p-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Вход по email и паролю
              </div>
              <p className="text-sm text-[rgb(var(--fg-secondary))]">
                Пароль нужен, чтобы входить с браузера.
              </p>
              <Input
                type="password"
                placeholder="Придумайте пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy || isLoading}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full gap-2"
                disabled={busy || isLoading}
              >
                <ShieldCheck className="h-4 w-4" />
                Установить пароль
              </Button>
            </form>
          </div>

          <Button
            type="button"
            variant="destructive"
            className="w-full gap-2"
            onClick={handleSignOut}
            disabled={busy || isLoading}
          >
            <LogOut className="h-4 w-4" />
            Выйти из профиля
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
