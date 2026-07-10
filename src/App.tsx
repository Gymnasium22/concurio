/**
 * App — роутинг, auth, публичный share без входа
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { initTelegramApp, isTelegramApp } from '@/lib/telegram';
import { useAppStore } from '@/stores/app-store';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/components/auth/login-page';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

import { Dashboard } from '@/pages/dashboard';
import { ContestCreate } from '@/pages/contest-create';
import { ContestEdit } from '@/pages/contest-edit';
import { ContestDetailPage } from '@/pages/contest-detail-page';
import { ProfilePage } from '@/pages/profile-page';
import { KanbanPage } from '@/pages/kanban-page';
import { CalendarPage } from '@/pages/calendar-page';
import { PublicSharePage } from '@/pages/public-share-page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
    },
  },
});

function isPublicPath(pathname: string): boolean {
  return pathname.startsWith('/share/');
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const { setIsTelegramApp } = useAppStore();
  const location = useLocation();
  const publicRoute = isPublicPath(location.pathname);

  useEffect(() => {
    if (isTelegramApp()) {
      setIsTelegramApp(true);
      initTelegramApp();
    }
  }, [setIsTelegramApp]);

  // Публичный share — без логина
  if (publicRoute) {
    return (
      <Routes>
        <Route path="/share/:token" element={<PublicSharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[rgb(var(--bg-primary))]">
        <Loader2 className="h-10 w-10 animate-spin text-accent-500 mb-4" />
        <p className="text-sm text-[rgb(var(--fg-muted))] animate-pulse">
          Загрузка приложения...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contests" element={<Dashboard />} />
        <Route path="/kanban" element={<KanbanPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/create" element={<ContestCreate />} />
        <Route path="/contest/:id" element={<ContestDetailPage />} />
        <Route path="/contest/:id/edit" element={<ContestEdit />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/share/:token" element={<PublicSharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/concurio/">
        <AppRouter />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
