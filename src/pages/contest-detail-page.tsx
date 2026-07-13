/**
 * ContestDetailPage — страница детализации конкурса
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
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Шапка страницы */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isTg && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight line-clamp-1"
            title={contest.title}
          >
            {contest.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop actions */}
          <div className="hidden sm:flex gap-2">
            <Link to={`/contest/${contest.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" /> Редактировать
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" /> Удалить
            </Button>
          </div>

          {/* Mobile actions (dropdown) */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
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
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-red-500 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <ContestDetail contest={contest} />
    </div>
  );
}
