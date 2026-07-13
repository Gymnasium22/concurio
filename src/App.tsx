/**
 * App — роутинг, auth, публичный share без входа
 * Lazy-load тяжёлых страниц; ErrorBoundary; toast на ошибки Query
 */
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { initTelegramApp, isTelegramApp } from '@/lib/telegram';
import { useAppStore } from '@/stores/app-store';
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/components/auth/login-page';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/error-boundary';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import '@/lib/env';

const Dashboard = lazy(() =>
  import('@/pages/dashboard').then((m) => ({ default: m.Dashboard }))
);
const ContestCreate = lazy(() =>
  import('@/pages/contest-create').then((m) => ({ default: m.ContestCreate }))
);
const ContestEdit = lazy(() =>
  import('@/pages/contest-edit').then((m) => ({ default: m.ContestEdit }))
);
const ContestDetailPage = lazy(() =>
  import('@/pages/contest-detail-page').then((m) => ({
    default: m.ContestDetailPage,
  }))
);
const ProfilePage = lazy(() =>
  import('@/pages/profile-page').then((m) => ({ default: m.ProfilePage }))
);
const KanbanPage = lazy(() =>
  import('@/pages/kanban-page').then((m) => ({ default: m.KanbanPage }))
);
const CalendarPage = lazy(() =>
  import('@/pages/calendar-page').then((m) => ({ default: m.CalendarPage }))
);
const PublicSharePage = lazy(() =>
  import('@/pages/public-share-page').then((m) => ({ default: m.PublicSharePage }))
);
const GalleryPage = lazy(() =>
  import('@/pages/gallery-page').then((m) => ({ default: m.GalleryPage }))
);

function notifyError(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Неизвестная ошибка запроса';
  // Не спамим сетевыми шумовыми ошибками
  if (/abort|cancel/i.test(message)) return;
  toast({
    title: 'Ошибка',
    description: message,
    variant: 'error',
  });
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => notifyError(error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => notifyError(error),
  }),
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

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-[rgb(var(--fg-muted))]">
      <Loader2 className="h-8 w-8 animate-spin text-accent-500 mb-3" />
      <p className="text-sm">Загрузка...</p>
    </div>
  );
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

  if (publicRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/share/:token" element={<PublicSharePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contests" element={<Dashboard />} />
          <Route path="/kanban" element={<KanbanPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/create" element={<ContestCreate />} />
          <Route path="/contest/:id" element={<ContestDetailPage />} />
          <Route path="/contest/:id/edit" element={<ContestEdit />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/share/:token" element={<PublicSharePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/concurio/">
          <AppRouter />
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
