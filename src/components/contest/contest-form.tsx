/**
 * ContestForm — форма создания/редактирования задачи или конкурса
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateContest, useUpdateContest } from '@/hooks/use-contests';
import { useTelegramMainButton, useTelegramBackButton } from '@/hooks/use-telegram';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
} from '@/lib/constants';
import { cn, isValidTelegramLink } from '@/lib/utils';
import type { Contest, ContestInsert, ContestUpdate, TaskPriority, TaskType } from '@/types';

interface ContestFormProps {
  initialData?: Contest;
  isEdit?: boolean;
}

export function ContestForm({ initialData, isEdit = false }: ContestFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createMutation = useCreateContest();
  const updateMutation = useUpdateContest();

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialData?.due_date ? new Date(initialData.due_date) : undefined
  );
  const [status, setStatus] = useState(initialData?.status || 'todo');
  const [taskType, setTaskType] = useState<TaskType>(initialData?.task_type || 'task');
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || 'medium');
  const [links, setLinks] = useState<string[]>(initialData?.telegram_message_links || []);
  const [tagsInput, setTagsInput] = useState((initialData?.tags || []).join(', '));

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isFormValid = title.trim().length > 0;
  const showTelegramLinks = taskType === 'contest';

  useTelegramBackButton(() => navigate(-1));

  const submitLabel = isEdit
    ? 'Сохранить изменения'
    : taskType === 'contest'
      ? 'Создать конкурс'
      : 'Создать задачу';

  useTelegramMainButton(submitLabel, () => handleSubmit(), {
    visible: true,
    disabled: !isFormValid || isSubmitting,
    loading: isSubmitting,
  });

  const parseTags = (raw: string) =>
    raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid) return;

    const validLinks = showTelegramLinks
      ? links.filter((l) => l.trim().length > 0 && isValidTelegramLink(l))
      : [];
    const tags = parseTags(tagsInput);

    try {
      if (isEdit && initialData) {
        const updateData: ContestUpdate & { id: string } = {
          id: initialData.id,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate ? dueDate.toISOString() : null,
          status,
          task_type: taskType,
          priority,
          tags,
          telegram_message_links: validLinks,
        };
        await updateMutation.mutateAsync(updateData);
        toast({ title: 'Изменения сохранены', variant: 'success' });
        navigate(`/contest/${initialData.id}`, { replace: true });
      } else {
        const insertData: ContestInsert = {
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate ? dueDate.toISOString() : null,
          status,
          task_type: taskType,
          priority,
          tags,
          telegram_message_links: validLinks,
          progress: 0,
        };
        const created = await createMutation.mutateAsync(insertData);
        toast({
          title: taskType === 'contest' ? 'Конкурс создан' : 'Задача создана',
          variant: 'success',
        });
        navigate(`/contest/${created.id}`, { replace: true });
      }
    } catch {
      toast({ title: 'Ошибка сохранения', variant: 'error' });
    }
  };

  const addLink = () => setLinks([...links, '']);
  const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index));
  const updateLink = (index: number, val: string) => {
    const next = [...links];
    next[index] = val;
    setLinks(next);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 sm:space-y-6 max-w-2xl mx-auto pb-[max(1rem,var(--tg-main-button-space,0px))]"
    >
      {/* Тип */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Тип</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TASK_TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTaskType(type)}
              className={cn(
                'rounded-xl border px-2 sm:px-3 py-2.5 text-xs sm:text-sm font-medium transition-all min-h-[44px] touch-manipulation',
                taskType === type
                  ? 'border-accent-500 bg-accent-50 text-accent-700 shadow-sm dark:bg-accent-900/30 dark:text-accent-300'
                  : 'border-[rgb(var(--border-default))] text-[rgb(var(--fg-secondary))] hover:bg-[rgb(var(--bg-secondary))]'
              )}
            >
              {TASK_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {taskType === 'contest' ? 'Название конкурса *' : 'Название *'}
        </label>
        <Input
          placeholder={
            taskType === 'contest'
              ? 'Например: Грант Росмолодежи 2026'
              : 'Например: Подготовить презентацию'
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Описание</label>
        <Textarea
          placeholder="Условия, заметки, чек-лист..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Дедлайн</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-10 px-4',
                  !dueDate && 'text-[rgb(var(--fg-muted))]'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate
                  ? format(dueDate, 'd MMMM yyyy', { locale: ru })
                  : 'Выберите дату'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Приоритет</label>
          <Select
            value={priority}
            onValueChange={(val) => setPriority(val as TaskPriority)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Приоритет" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Статус</label>
          <Select value={status} onValueChange={(val: any) => setStatus(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
              <SelectItem value="cancelled">{STATUS_LABELS.cancelled}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Теги</label>
          <Input
            placeholder="грант, срочно, учёба"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <p className="text-xs text-[rgb(var(--fg-muted))]">Через запятую</p>
        </div>
      </div>

      {showTelegramLinks && (
        <div className="space-y-3 pt-2 border-t border-[rgb(var(--border-default))]">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Ссылки на сообщения (Telegram)</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLink}
              className="h-8 px-2 text-accent-500"
            >
              <Plus className="h-4 w-4 mr-1" /> Добавить
            </Button>
          </div>

          {links.length === 0 && (
            <p className="text-sm text-[rgb(var(--fg-muted))] italic">
              Нет прикреплённых ссылок
            </p>
          )}

          <div className="space-y-2">
            {links.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--fg-muted))]" />
                  <Input
                    placeholder="https://t.me/c/..."
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    className={cn(
                      'pl-9',
                      link.length > 0 &&
                        !isValidTelegramLink(link) &&
                        'border-red-500 focus:border-red-500'
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLink(index)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-6 hidden sm:flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
          Отмена
        </Button>
        <Button type="submit" disabled={!isFormValid || isSubmitting}>
          {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
