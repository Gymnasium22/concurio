# Architecture — Concurio

Современный трекер задач и конкурсов: React + Vite + Supabase + Telegram Mini App.

## Слои

```
UI (pages / components)
  → hooks (TanStack Query + Zustand UI-state)
    → services (contestService, attachmentService)
      → Supabase Client (Postgres + Storage + Auth)
      → Edge Functions (telegram-auth, public-share, share-preview)
```

| Слой | Ответственность |
|------|-----------------|
| **Zustand** (`app-store`) | Только UI: тема, фильтры, mobile menu, isTelegramApp |
| **TanStack Query** | Серверные данные: contests, attachments, share, checklist |
| **Services** | Чистые async-функции к Supabase, без React |
| **Edge Functions** | Telegram auth (HMAC), публичный share, OG preview |

## Данные

- **contests** — задачи/конкурсы (`task_type`, `priority`, `parent_id`, `recurrence`)
- **attachments** — метаданные файлов; байты в Storage bucket `attachments`
- **checklist_items**, **task_comments**, **activity_log**
- **share_links** — токен, `expires_at`, `revoked_at`
- **telegram_identities**, **account_link_tokens**

Подзадачи: `contests.parent_id → contests.id`. В списках по умолчанию `parent_id IS NULL`.

## Auth

1. Email/password через Supabase Auth  
2. Telegram Mini App → `telegram-auth` Edge Function (валидация `initData` + rate limit)

## Публичный share

1. Владелец создаёт `share_links` (срок + revoke в UI)  
2. Гость открывает `/share/:token` или `share-preview` (OG)  
3. RPC `get_public_share` / Edge `public-share` (SECURITY DEFINER)

## Deploy

- Frontend: GitHub Pages (`base: /concurio/`)  
- Backend: Supabase project (migrations в `supabase/migrations/`)

## Именование

Исторически сущность называется **Contest** в коде и таблице `contests`. В UI — «задача/конкурс». Тип-алиас: `Task = Contest`.
