/**
 * ContestCreate — страница создания конкурса
 */
import { ContestForm } from '@/components/contest/contest-form';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { isTelegramApp } from '@/lib/telegram';

export function ContestCreate() {
  const navigate = useNavigate();
  const isTg = isTelegramApp();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 min-w-0">
        {!isTg && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight truncate">Новая задача</h1>
      </div>

      <div className="glass p-4 sm:p-8 rounded-2xl sm:rounded-3xl pb-8">
        <ContestForm />
      </div>
    </div>
  );
}
