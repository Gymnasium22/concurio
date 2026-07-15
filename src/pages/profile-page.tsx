import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { isTelegramApp, openTelegramBindingLink } from '@/lib/telegram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LogOut,
  Link2,
  Unlink2,
  Mail,
  ShieldCheck,
  ArrowLeft,
  FolderOpen,
  BarChart3,
  Users,
  Zap,
  Archive,
  LayoutGrid,
  Bell,
  Send,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { usePreferences, useSavePreferences } from '@/hooks/use-platform';
import { requestTelegramDigest } from '@/services/preferencesService';
import { cn } from '@/lib/utils';

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
  const { data: prefs } = usePreferences();
  const savePrefs = useSavePreferences();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [digestBusy, setDigestBusy] = useState(false);

  if (!user) {
    return null;
  }

  const isTelegramLinked = Boolean(user.telegram_id);
  const authMethodLabel =
    user.auth_provider === 'telegram' || isTelegramLinked ? 'Telegram' : 'Email';
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
      const result = await openTelegramBindingLink(user.id);
      setBusy(false);
      if (result.ok) {
        setMessage(
          'Откройте Telegram Mini App и подтвердите привязку. Затем обновите эту страницу.'
        );
      } else {
        setMessage(result.error || 'Не удалось открыть Telegram Mini App.');
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

  const notifyOn = prefs?.tg_notify_enabled !== false;

  const toggleNotify = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await savePrefs.mutateAsync({ tg_notify_enabled: !notifyOn });
      setMessage(
        !notifyOn ? 'Дайджест в Telegram включён' : 'Дайджест в Telegram выключен'
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const sendTestDigest = async () => {
    setDigestBusy(true);
    setMessage(null);
    try {
      await requestTelegramDigest();
      setMessage('Дайджест отправлен в Telegram. Проверьте чат с ботом.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setDigestBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        {!isTelegramApp() && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Профиль</h1>
      </div>

      <div className="glass p-6 sm:p-8 rounded-3xl space-y-6">
        <div className="rounded-2xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-secondary))]/70 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Способ входа</p>
              <p className="text-sm text-[rgb(var(--fg-secondary))]">{authMethodLabel}</p>
            </div>
            <div
              className="rounded-full bg-accent-100/70 px-3 py-1.5 text-xs font-medium text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 truncate max-w-full sm:max-w-[55%] self-start sm:self-auto"
              title={user.display_name || user.email || undefined}
            >
              {user.display_name || user.email || 'Аккаунт'}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[rgb(var(--border-default))] pt-3">
            <span className="text-sm text-[rgb(var(--fg-secondary))]">Telegram</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${isTelegramLinked ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {isTelegramLinked ? 'Привязан' : 'Не привязан'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--fg-muted))]">
            Разделы
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['/gallery', 'Файлы', FolderOpen],
                ['/analytics', 'Аналитика', BarChart3],
                ['/workspace', 'Команда', Users],
                ['/automations', 'Автоправила', Zap],
                ['/trash', 'Корзина', Archive],
                ['/kanban', 'Канбан', LayoutGrid],
              ] as const
            ).map(([to, label, Icon]) => (
              <Button
                key={to}
                asChild
                variant="outline"
                className="h-12 justify-start gap-2 px-3"
              >
                <Link to={to}>
                  <Icon className="h-4 w-4 text-accent-500 shrink-0" />
                  <span className="truncate text-sm">{label}</span>
                </Link>
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[rgb(var(--border-default))] px-3 h-12 mt-1">
            <span className="text-sm text-[rgb(var(--fg-secondary))] shrink-0">Тема</span>
            <ThemeToggle />
          </div>
        </div>

        {(message || error) && (
          <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-700 dark:border-accent-900/40 dark:bg-accent-950/30 dark:text-accent-300">
            {message || error}
          </div>
        )}

        {/* Этап 4: уведомления бота */}
        <div className="rounded-2xl border border-[rgb(var(--border-default))] p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-accent-500" />
            Telegram-бот
          </div>
          <p className="text-sm text-[rgb(var(--fg-secondary))] leading-relaxed">
            Бот @{import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'concurio_bot'} отвечает
            на /today и может присылать дайджест «что горит». Нужна привязка Telegram к
            аккаунту.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[rgb(var(--bg-secondary))] px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Авто-дайджест</p>
              <p className="text-[11px] text-[rgb(var(--fg-muted))]">
                Раз в сутки в выбран час (сервер проверяет каждый час)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifyOn}
              disabled={busy || savePrefs.isPending}
              onClick={() => void toggleNotify()}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                notifyOn ? 'bg-accent-500' : 'bg-[rgb(var(--border-strong))]'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                  notifyOn && 'translate-x-5'
                )}
              />
            </button>
          </div>

          {notifyOn && (
            <div className="space-y-1.5">
              <label
                htmlFor="digest-hour"
                className="text-xs font-medium text-[rgb(var(--fg-secondary))]"
              >
                Во сколько присылать (по Москве)
              </label>
              <select
                id="digest-hour"
                className={cn(
                  'w-full rounded-xl border border-[rgb(var(--border-default))]',
                  'bg-[rgb(var(--bg-secondary))] px-3 py-2.5 text-sm min-h-[44px]',
                  'touch-manipulation'
                )}
                value={String(prefs?.tg_digest_hour ?? 9)}
                disabled={busy || savePrefs.isPending}
                onChange={(e) => {
                  const hour = Number(e.target.value);
                  void savePrefs
                    .mutateAsync({ tg_digest_hour: hour })
                    .then(() =>
                      setMessage(`Дайджест около ${hour + 3}:00 МСК (час UTC ${hour})`)
                    )
                    .catch((err: unknown) =>
                      setMessage(err instanceof Error ? err.message : 'Не сохранилось')
                    );
                }}
              >
                {/* value = UTC hour; label = МСК (UTC+3) */}
                <option value="3">06:00 МСК</option>
                <option value="6">09:00 МСК</option>
                <option value="9">12:00 МСК (по умолчанию)</option>
                <option value="12">15:00 МСК</option>
                <option value="15">18:00 МСК</option>
                <option value="18">21:00 МСК</option>
              </select>
              {prefs?.tg_last_digest_at && (
                <p className="text-[11px] text-[rgb(var(--fg-muted))]">
                  Последняя отправка:{' '}
                  {new Date(prefs.tg_last_digest_at).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 min-h-[44px]"
            onClick={() => void sendTestDigest()}
            disabled={digestBusy || busy || !isTelegramLinked}
          >
            <Send className="h-4 w-4" />
            {digestBusy ? 'Отправляю…' : 'Прислать дайджест сейчас'}
          </Button>
          {!isTelegramLinked && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Сначала привяжите Telegram ниже — иначе бот не знает, кому писать.
            </p>
          )}
        </div>

        <div className="space-y-3">
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
            className="space-y-3 rounded-2xl border border-[rgb(var(--border-default))] p-5"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4" />
              Вход по email и паролю
            </div>
            <p className="text-sm text-[rgb(var(--fg-secondary))]">
              Установите пароль, чтобы позже входить через email даже если аккаунт был
              создан через Telegram.
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
    </div>
  );
}
