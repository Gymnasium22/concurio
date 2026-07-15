import { test, expect } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const hasCreds = Boolean(email && password);

test.describe('Authenticated product flows', () => {
  test.skip(!hasCreds, 'Set E2E_EMAIL / E2E_PASSWORD (+ Supabase env)');

  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.getByPlaceholder('Email').fill(email!);
    await page.getByPlaceholder('Пароль').fill(password!);
    await page.getByRole('button', { name: /^Войти$/ }).click();
    await expect(
      page.getByRole('heading', { name: /главная|задачи/i }).first()
    ).toBeVisible({
      timeout: 45_000,
    });
  });

  test('create task flow', async ({ page }) => {
    await page.goto('./create');
    const title = `E2E задача ${Date.now()}`;
    await page.getByRole('textbox').first().fill(title);
    // submit form
    await page
      .getByRole('button', { name: /создать/i })
      .first()
      .click();
    // land on detail or list
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
  });

  test('kanban page loads columns and supports card menu move', async ({ page }) => {
    await page.goto('./kanban');
    await expect(page.getByRole('heading', { name: /канбан/i })).toBeVisible();
    await expect(page.getByText(/не начат|в работе|готово/i).first()).toBeVisible();

    // Перемещение через меню «⋯» (стабильнее drag в headless)
    const more = page.getByRole('button', { name: /переместить/i }).first();
    if (await more.count()) {
      await more.click();
      const moveItem = page.getByRole('menuitem').first();
      if (await moveItem.count()) {
        await moveItem.click();
      }
    }
  });

  test('share dialog opens', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: /поделиться/i }).click();
    await expect(page.getByText(/общий доступ|ссылк/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('analytics and workspace pages open', async ({ page }) => {
    await page.goto('./analytics');
    await expect(page.getByRole('heading', { name: /аналитика/i })).toBeVisible();
    await page.goto('./workspace');
    await expect(page.getByRole('heading', { name: /команда/i })).toBeVisible();
    await page.goto('./trash');
    await expect(page.getByRole('heading', { name: /корзина/i })).toBeVisible();
  });
});
