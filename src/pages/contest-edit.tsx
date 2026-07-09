/**
 * ContestEdit — страница редактирования конкурса
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useContest } from '@/hooks/use-contests';
import { ContestForm } from '@/components/contest/contest-form';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isTelegramApp } from '@/lib/telegram';

export function ContestEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isTg = isTelegramApp();
  
  const { data: contest, isLoading, error } = useContest(id);

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
        <p className="text-red-500 mb-4">Конкурс не найден или удалён</p>
        <Button onClick={() => navigate(-1)}>Назад</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        {!isTg && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Редактирование</h1>
      </div>
      
      <div className="glass p-6 sm:p-8 rounded-3xl">
        <ContestForm initialData={contest} isEdit />
      </div>
    </div>
  );
}
