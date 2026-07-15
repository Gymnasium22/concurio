/**
 * Готовые шаблоны задач/конкурсов (этап 2 «супераппа»)
 * Сроки считаются от «сегодня» + dueDaysFromNow / daysFromStart
 */
import type { TaskPriority, TaskType } from '@/types';

export interface TemplateStage {
  title: string;
  /** Дней от «сегодня» до дедлайна этапа */
  daysFromStart: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  hint: string;
  task_type: TaskType;
  priority: TaskPriority;
  /** Общий дедлайн родителя (дней от сегодня); null = как у последнего этапа */
  dueDaysFromNow: number | null;
  titlePlaceholder: string;
  descriptionHint?: string;
  stages: TemplateStage[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'blank',
    name: 'С нуля',
    hint: 'Пустая форма',
    task_type: 'task',
    priority: 'medium',
    dueDaysFromNow: null,
    titlePlaceholder: 'Название…',
    stages: [],
  },
  {
    id: 'contest-3',
    name: 'Конкурс · 3 этапа',
    hint: 'Подача → отбор → финал',
    task_type: 'contest',
    priority: 'high',
    dueDaysFromNow: 30,
    titlePlaceholder: 'Название конкурса…',
    descriptionHint: 'Этапы и даты можно потом поменять.',
    stages: [
      { title: 'Подача заявки', daysFromStart: 10 },
      { title: 'Отбор / проверка', daysFromStart: 20 },
      { title: 'Финал / сдача', daysFromStart: 30 },
    ],
  },
  {
    id: 'contest-2',
    name: 'Конкурс · 2 этапа',
    hint: 'Заявка и результат',
    task_type: 'contest',
    priority: 'high',
    dueDaysFromNow: 21,
    titlePlaceholder: 'Название конкурса…',
    stages: [
      { title: 'Подача', daysFromStart: 10 },
      { title: 'Итоги', daysFromStart: 21 },
    ],
  },
  {
    id: 'hackathon',
    name: 'Хакатон',
    hint: 'Старт → mid → демо',
    task_type: 'contest',
    priority: 'urgent',
    dueDaysFromNow: 3,
    titlePlaceholder: 'Хакатон…',
    stages: [
      { title: 'Старт / идея', daysFromStart: 0 },
      { title: 'Прототип', daysFromStart: 1 },
      { title: 'Демо / сдача', daysFromStart: 3 },
    ],
  },
  {
    id: 'coursework',
    name: 'Курсовая / проект',
    hint: 'План → черновик → сдача',
    task_type: 'task',
    priority: 'high',
    dueDaysFromNow: 45,
    titlePlaceholder: 'Тема работы…',
    stages: [
      { title: 'План и источники', daysFromStart: 7 },
      { title: 'Черновик', daysFromStart: 28 },
      { title: 'Финальная сдача', daysFromStart: 45 },
    ],
  },
  {
    id: 'weekly',
    name: 'Неделя дел',
    hint: 'Простая задача на 7 дней',
    task_type: 'task',
    priority: 'medium',
    dueDaysFromNow: 7,
    titlePlaceholder: 'Что сделать за неделю…',
    stages: [],
  },
  {
    id: 'personal',
    name: 'Личное',
    hint: 'Без этапов',
    task_type: 'personal',
    priority: 'low',
    dueDaysFromNow: 3,
    titlePlaceholder: 'Личная задача…',
    stages: [],
  },
];

export function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find((t) => t.id === id);
}
