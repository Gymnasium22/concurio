# Concurio

Современное веб-приложение и Telegram Mini App для трекинга конкурсов и заданий.

## 🚀 Стек технологий

- **Фронтенд:** React 19 + TypeScript + Vite 6
- **Стилизация:** Tailwind CSS 4 + shadcn/ui + Framer Motion
- **Стейт-менеджмент:** Zustand + TanStack Query
- **Бэкенд & БД:** Supabase (PostgreSQL, Auth, Storage)
- **Деплой:** GitHub Pages
- **Интеграция:** `@telegram-apps/sdk-react`

## 🛠 Установка и локальный запуск

1. Установите зависимости:
   ```bash
   npm install
   ```

2. Настройте переменные окружения:
   Скопируйте `.env.example` в `.env.local` и вставьте данные вашего Supabase проекта:
   ```bash
   cp .env.example .env.local
   ```

3. Запустите dev-сервер:
   ```bash
   npm run dev
   ```

## 🗄 Настройка Supabase

1. Создайте проект на [Supabase](https://supabase.com).
2. Перейдите в SQL Editor и выполните скрипт инициализации БД из файла:
   `supabase/migrations/001_initial_schema.sql`
3. Убедитесь, что бакет `attachments` создан в разделе Storage.
4. Скопируйте URL и `anon key` в ваш `.env.local`.

## 🌐 Деплой на GitHub Pages

1. В файле `vite.config.ts` и `src/App.tsx` убедитесь, что `base` / `basename` совпадает с именем вашего репозитория (по умолчанию `/Concurio/`).
2. Выполните сборку и деплой одной командой (требуется пакет `gh-pages`):
   ```bash
   npm run deploy
   ```
   *(Команда `npm run deploy` запускает сборку и пушит папку `dist` в ветку `gh-pages`)*.
3. В настройках репозитория на GitHub перейдите в **Settings** -> **Pages**, выберите источник **Deploy from a branch** и ветку `gh-pages`.

## 📱 Подключение к Telegram (Mini App)

1. Откройте Telegram и найдите бота [@BotFather](https://t.me/BotFather).
2. Создайте нового бота командой `/newbot` или выберите существующего.
3. Выполните команду `/newapp`.
4. Следуйте инструкциям, в качестве URL укажите ссылку на ваш GitHub Pages (например, `https://username.github.io/Concurio/`).
5. Теперь приложение доступно прямо внутри Telegram!
