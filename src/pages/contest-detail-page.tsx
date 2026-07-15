/**
 * ContestDetailPage — страница задачи
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContest, useDeleteContest } from '@/hooks/use-contests';
import { ContestDetail } from '@/components/contest/contest-detail';
import { ArrowLeft, Edit, Trash2, Loader2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isTelegramApp } from '@/lib/telegram';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/contest/status-badge';
import { cn } from '@/lib/utils';

export function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isTg = isTelegramApp();
  const { toast } = useToast();

  const { data: contest, isLoading, error } = useContest(id);
  const deleteMutation = useDeleteContest();

  useTelegramBackButton(() => navigate(-1));

  const handleDelete = async () => {
    if (!confirm('Переместить задачу в корзину? Позже можно восстановить.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id!);
      toast({
        title: 'В корзине',
        description: 'Можно восстановить в Профиль → Корзина',
        variant: 'success',
      });
      navigate('/', { replace: true });
    } catch {
      toast({ title: 'Ошибка удаления', variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="text-center p-12">
        <p className="text-red-500 mb-4">Задача не найдена или удалена</p>
        <Button onClick={() => navigate('/')}>На главную</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Компактная шапка */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          {!isTg && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 h-9 w-9 mt-0.5"
              aria-label="Назад"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <StatusBadge status={contest.status} className="text-[10px] px-2 py-0.5" />
              {contest.parent_id && (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[rgb(var(--fg-muted))]">
                  Подзадача
                </span>
              )}
            </div>
            <h1
              className={cn(
                'text-xl sm:text-2xl font-bold tracking-tight',
                'line-clamp-2 sm:line-clamp-3'
              )}
              title={contest.title}
            >
              {contest.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex gap-1.5">
            <Link to={`/contest/${contest.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5 min-h-[36px]">
                <Edit className="h-4 w-4" />
                <span className="hidden md:inline">Редактировать</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 min-h-[36px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => void handleDelete()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden md:inline">В корзину</span>
            </Button>
          </div>

          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Меню">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    to={`/contest/${contest.id}/edit`}
                    className="w-full flex items-center"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Редактировать
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void handleDelete()}
                  disabled={deleteMutation.isPending}
                  className="text-red-500 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> В корзину
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ContestDetail contest={contest} />
    </div>
  );
}
