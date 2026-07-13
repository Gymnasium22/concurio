/**
 * Onboarding ~60 сек + примеры
 */
import { useMemo, useState } from 'react';
import { usePreferences, useSavePreferences } from '@/hooks/use-platform';
import { useCreateContest } from '@/hooks/use-contests';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles } from 'lucide-react';

const STEPS = [
  {
    title: 'Добро пожаловать в Concurio',
    body: 'Трекер задач и конкурсов: список, канбан, календарь, файлы и команды.',
  },
  {
    title: 'Три способа работать',
    body: 'Список — для дня, Канбан — для статусов, Календарь — для дедлайнов. Создавайте через «+».',
  },
  {
    title: 'Поделитесь прогрессом',
    body: 'Кнопка «Поделиться» — публичная ссылка только для просмотра, с сроком действия.',
  },
];

export function OnboardingModal() {
  const { data: prefs, isLoading } = usePreferences();
  const save = useSavePreferences();
  const create = useCreateContest();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('concurio-onboarding-done') === '1'
  );

  const open = useMemo(() => {
    if (dismissed || isLoading) return false;
    if (prefs && prefs.onboarding_done) return false;
    // show if prefs loaded and not done, or prefs missing (new user)
    return !isLoading;
  }, [dismissed, isLoading, prefs]);

  const finish = async (withSamples: boolean) => {
    if (withSamples) {
      try {
        await create.mutateAsync({
          title: 'Пример: подготовить презентацию',
          task_type: 'contest',
          priority: 'high',
          status: 'todo',
          tags: ['пример'],
          description: 'Демо-задача. Можно удалить.',
        });
        await create.mutateAsync({
          title: 'Пример: личные дела',
          task_type: 'personal',
          priority: 'low',
          status: 'in_progress',
          tags: ['пример'],
        });
        toast({ title: 'Добавлены примеры задач', variant: 'success' });
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem('concurio-onboarding-done', '1');
    setDismissed(true);
    try {
      await save.mutateAsync({ onboarding_done: true });
    } catch {
      /* table may be missing */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && void finish(false)}>
      <DialogContent className="sm:max-w-md" aria-describedby="onboarding-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-500" aria-hidden />
            {STEPS[step]?.title}
          </DialogTitle>
          <DialogDescription id="onboarding-desc">{STEPS[step]?.body}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1.5 py-2" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? 'bg-accent-500' : 'bg-[rgb(var(--bg-secondary))]'
              }`}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Далее</Button>
          ) : (
            <>
              <Button onClick={() => void finish(true)}>Добавить примеры и начать</Button>
              <Button variant="outline" onClick={() => void finish(false)}>
                Начать без примеров
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
