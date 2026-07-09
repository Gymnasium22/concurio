import { useState } from 'react';
import { Settings, LogOut, Link2, Unlink2, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
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

  if (!user) {
    return null;
  }

  const isTelegramLinked = Boolean(user.telegram_id);
  const authMethodLabel = user.auth_provider === 'telegram' || isTelegramLinked ? 'Telegram' : 'Email';

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
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Настройки</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки аккаунта</DialogTitle>
          <DialogDescription>
            Управляйте способом входа и безопасностью профиля.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))]/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Текущий способ входа</p>
                <p className="text-sm text-[rgb(var(--fg-secondary))]">{authMethodLabel}</p>
              </div>
              <div className="rounded-full bg-accent-100/70 px-3 py-1 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                {user.email ?? 'Аккаунт'}
              </div>
            </div>
          </div>

          {(message || error) && (
            <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-700 dark:border-accent-900/40 dark:bg-accent-950/30 dark:text-accent-300">
              {message || error}
            </div>
          )}

          <div className="space-y-2">
            {isTelegramLinked ? (
              <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={handleUnlinkTelegram} disabled={busy || isLoading}>
                <Unlink2 className="h-4 w-4" />
                Отвязать Telegram
              </Button>
            ) : (
              <Button type="button" className="w-full justify-start gap-2" onClick={handleLinkTelegram} disabled={busy || isLoading}>
                <Link2 className="h-4 w-4" />
                Привязать Telegram
              </Button>
            )}

            <form onSubmit={handleSetPassword} className="space-y-2 rounded-2xl border border-[rgb(var(--border-default))] p-4">
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
      </DialogContent>
    </Dialog>
  );
}
