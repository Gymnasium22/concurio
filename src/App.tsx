/**
 * App — корневой компонент приложения
 * Роутинг, провайдеры, проверка авторизации
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { initTelegramApp, isTelegramApp } from '@/lib/telegram';
import { useAppStore } from '@/stores/app-store';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/components/auth/login-page';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

// Pages
import { Dashboard } from '@/pages/dashboard';
import { ContestCreate } from '@/pages/contest-create';
import { ContestEdit } from '@/pages/contest-edit';
import { ContestDetailPage } from '@/pages/contest-detail-page';

// Инициализация React Query клиента
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

function AppRouter() {
  const { user, isLoading } = useAuth();
  const { setIsTelegramApp } = useAppStore();

  useEffect(() => {
    // Инициализация Telegram Mini App
    if (isTelegramApp()) {
      setIsTelegramApp(true);
      initTelegramApp();
    }
  }, [setIsTelegramApp]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[rgb(var(--bg-primary))]">
        <Loader2 className="h-10 w-10 animate-spin text-accent-500 mb-4" />
        <p className="text-sm text-[rgb(var(--fg-muted))] animate-pulse">Загрузка приложения...</p>
      </div>
    );
  }

  // Если не авторизован — показываем страницу логина
  if (!user) {
    return <LoginPage />;
  }

  // Основной роутинг
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contests" element={<Dashboard />} /> {/* Пока алиас на дашборд */}
        <Route path="/create" element={<ContestCreate />} />
        <Route path="/contest/:id" element={<ContestDetailPage />} />
        <Route path="/contest/:id/edit" element={<ContestEdit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  // basename нужен для GitHub Pages
  // Замените '/Concurio/' на имя вашего репозитория при деплое
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/Concurio/">
        <AppRouter />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
