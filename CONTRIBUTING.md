# Contributing — Concurio

## Быстрый старт

```bash
npm ci
cp .env.example .env   # заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm run dev
```

## Миграции Supabase

SQL в `supabase/migrations/` применяйте в SQL Editor проекта (по порядку номеров) или через Supabase CLI:

```bash
supabase db push
```

Новая миграция `006_subtasks_recurrence.sql` — подзадачи и recurrence.

## Скрипты

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Vite dev-server |
| `npm run type-check` | `tsc --noEmit` |
| `npm run build` | production build + 404.html |
| `npm run deploy` | build + gh-pages |

## Правила кода

1. **Серверные данные** — только через TanStack Query + `src/services/*`.  
2. **Zustand** — UI/фильтры, не кэш API.  
3. Ошибки Supabase — `throw new Error(message)`; глобальные toasts в `App.tsx`.  
4. Новые файлы вложений — MIME в `ACCEPTED_FILE_TYPES` (`constants.ts`).  
5. Не коммитьте `.env` и секреты Edge Functions.

## PR

- Короткий conventional commit: `feat:`, `fix:`, `chore:`  
- CI: type-check + build (`.github/workflows/ci.yml`)  
- Скрин/описание для UI-изменений приветствуется

## Структура

```
src/
  components/   UI
  hooks/        React Query + domain hooks
  services/     Supabase API
  pages/        route screens
  lib/          utils, env, telegram, supabase client
  stores/       Zustand
  types/        TypeScript models
supabase/
  migrations/
  functions/
```
