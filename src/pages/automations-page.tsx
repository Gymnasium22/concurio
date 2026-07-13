import { useState } from 'react';
import {
  useAutomationRules,
  useCreateAutomationRule,
  useDeleteAutomationRule,
} from '@/hooks/use-platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Zap, Trash2 } from 'lucide-react';
import type { ContestStatus, TaskPriority, TaskType } from '@/types';

export function AutomationsPage() {
  const { data: rules } = useAutomationRules();
  const create = useCreateAutomationRule();
  const remove = useDeleteAutomationRule();
  const { toast } = useToast();

  const [name, setName] = useState('Автотег');
  const [titleContains, setTitleContains] = useState('');
  const [addTag, setAddTag] = useState('');
  const [setStatus, setSetStatus] = useState<ContestStatus | ''>('');
  const [setPriority, setSetPriority] = useState<TaskPriority | ''>('');
  const [taskType, setTaskType] = useState<TaskType | ''>('');

  const save = async () => {
    await create.mutateAsync({
      name: name.trim() || 'Правило',
      enabled: true,
      trigger_on: 'on_create',
      workspace_id: null,
      conditions: {
        title_contains: titleContains.trim() || undefined,
        task_type: taskType || undefined,
      },
      actions: {
        add_tags: addTag.trim() ? [addTag.trim()] : undefined,
        set_status: setStatus || undefined,
        set_priority: setPriority || undefined,
      },
    });
    setTitleContains('');
    setAddTag('');
    toast({ title: 'Правило создано', variant: 'success' });
  };

  return (
    <div className="space-y-5 max-w-2xl animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-accent-500" />
          Автоправила
        </h1>
        <p className="text-sm text-[rgb(var(--fg-muted))] mt-0.5">
          Автотеги и автостатус при создании задачи
        </p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3 border border-[rgb(var(--border-default))]">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название правила"
        />
        <Input
          value={titleContains}
          onChange={(e) => setTitleContains(e.target.value)}
          placeholder="Если название содержит…"
        />
        <Select
          value={taskType || 'any'}
          onValueChange={(v) => setTaskType(v === 'any' ? '' : (v as TaskType))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Тип (любой)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любой тип</SelectItem>
            <SelectItem value="contest">Конкурс</SelectItem>
            <SelectItem value="task">Задача</SelectItem>
            <SelectItem value="personal">Личное</SelectItem>
            <SelectItem value="reminder">Напоминание</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={addTag}
          onChange={(e) => setAddTag(e.target.value)}
          placeholder="Добавить тег"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={setStatus || 'none'}
            onValueChange={(v) => setSetStatus(v === 'none' ? '' : (v as ContestStatus))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Не менять статус</SelectItem>
              <SelectItem value="todo">Не начат</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="review">На проверке</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={setPriority || 'none'}
            onValueChange={(v) => setSetPriority(v === 'none' ? '' : (v as TaskPriority))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Приоритет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Не менять</SelectItem>
              <SelectItem value="low">Низкий</SelectItem>
              <SelectItem value="medium">Средний</SelectItem>
              <SelectItem value="high">Высокий</SelectItem>
              <SelectItem value="urgent">Срочно</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full"
          disabled={create.isPending}
          onClick={() => void save()}
        >
          Сохранить правило
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--fg-muted))]">
          Активные правила
        </p>
        {!rules?.length && (
          <div className="rounded-2xl border border-dashed border-[rgb(var(--border-default))] p-8 text-center text-sm text-[rgb(var(--fg-muted))]">
            Пока нет правил. Пример: название содержит «отчёт» → тег «документы».
          </div>
        )}
        <ul className="space-y-2">
          {(rules ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-2 rounded-xl border border-[rgb(var(--border-default))] p-3 bg-[rgb(var(--bg-card))]"
            >
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-[rgb(var(--fg-muted))] mt-0.5">
                  при создании
                  {r.conditions.title_contains
                    ? ` · «${r.conditions.title_contains}»`
                    : ''}
                  {r.actions.add_tags?.length
                    ? ` → теги: ${r.actions.add_tags.join(', ')}`
                    : ''}
                  {r.actions.set_status ? ` → ${r.actions.set_status}` : ''}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-red-500 shrink-0"
                aria-label="Удалить правило"
                onClick={() => remove.mutate(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
