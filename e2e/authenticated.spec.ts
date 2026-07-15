import { test, expect } from '@playwright/test';

/**
 * Опциональный smoke с реальным Supabase.
 * Запуск:
 *   E2E_EMAIL=... E2E_PASSWORD=... VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run test:e2e
 */
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasCreds = Boolean(email && password);

test.describe('Authenticated smoke', () => {
  test.skip(!hasCreds, 'Set E2E_EMAIL and E2E_PASSWORD to run');

  test('login and open main views', async ({ page }) => {
    await page.goto('./');
    await page.getByPlaceholder('Email').fill(email!);
    await page.getByPlaceholder('Пароль').fill(password!);
    await page.getByRole('button', { name: /войти/i }).click();

    // После входа — дашборд
    await expect(
      page.getByRole('heading', { name: /главная|задачи|мои задачи/i }).first()
    ).toBeVisible({ timeout: 30_000 });

    // Канбан
    await page.goto('./kanban');
    await expect(page.getByRole('heading', { name: /канбан/i })).toBeVisible();

    // Календарь
    await page.goto('./calendar');
    await expect(page.getByRole('heading', { name: /календар/i })).toBeVisible();

    // Профиль
    await page.goto('./profile');
    await expect(page.getByRole('heading', { name: /профиль/i })).toBeVisible();
  });
});
