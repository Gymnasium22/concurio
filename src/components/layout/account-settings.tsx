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
          className="h-9 w-9 xl:w-auto xl:px-3 p-0 xl:gap-2 shrink-0"
          aria-label="Настройки"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden xl:inline">Настройки</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className={
          'sm:max-w-2xl md:max-w-3xl w-full ' +
          'max-h-[min(94dvh,var(--tg-viewport-stable-height,94dvh))] ' +
          'sm:max-h-[min(88vh,720px)] ' +
          'flex flex-col gap-0 overflow-hidden p-0 sm:p-0'
        }
      >
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3 sm:px-6 sm:pt-6 pr-12">
          <DialogTitle className="text-xl">Настройки аккаунта</DialogTitle>
          <DialogDescription className="text-sm">
            Привязка Telegram не создаёт второй профиль — добавляет вход к текущему email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-5 sm:pb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))]/70 p-4 space-y-2">
              <p className="text-sm font-medium">Способ входа</p>
              <p className="text-sm text-[rgb(var(--fg-secondary))]">{authMethodLabel}</p>
              <p className="text-xs text-[rgb(var(--fg-muted))] truncate">
                {user.email ?? user.display_name ?? 'Аккаунт'}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))]/70 p-4 flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between">
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
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleLinkTelegram}
                  disabled={busy || isLoading}
                >
                  <Link2 className="h-4 w-4" />
                  {isTelegramLinked ? 'Перепривязать' : 'Привязать Telegram'}
                </Button>
                {isTelegramLinked && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleUnlinkTelegram}
                    disabled={busy || isLoading}
                  >
                    <Unlink2 className="h-4 w-4" />
                    Отвязать
                  </Button>
                )}
              </div>
            </div>
          </div>

          {(message || error) && (
            <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-700 dark:border-accent-900/40 dark:bg-accent-950/30 dark:text-accent-300">
              {message || error}
            </div>
          )}

          <form
            onSubmit={handleSetPassword}
            className="space-y-3 rounded-2xl border border-[rgb(var(--border-default))] p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Вход по email и паролю
            </div>
            <p className="text-sm text-[rgb(var(--fg-secondary))]">
              Пароль нужен, чтобы входить с браузера.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="password"
                placeholder="Придумайте пароль (мин. 6 символов)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy || isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                variant="outline"
                className="gap-2 shrink-0 sm:min-w-[11rem]"
                disabled={busy || isLoading}
              >
                <ShieldCheck className="h-4 w-4" />
                Установить
              </Button>
            </div>
          </form>

          <Button
            type="button"
            variant="destructive"
            className="w-full gap-2 min-h-[44px]"
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
