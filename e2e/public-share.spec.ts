import { test, expect } from '@playwright/test';

test.describe('Public share', () => {
  test('invalid token shows error state', async ({ page }) => {
    await page.goto('./share/invalid-token-xx');
    // Публичный layout (не login)
    await expect(page.getByText('Публичный просмотр')).toBeVisible();
    // Ошибка RPC/сети или not_found — любой error state
    await expect(
      page
        .getByText(
          /не найдена|некорректн|недоступно|ошибка|нет токена|failed to fetch|typeerror|отозвана|истёк/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/попросите владельца/i)).toBeVisible();
  });

  test('short token still loads share route (not login)', async ({ page }) => {
    await page.goto('./share/ab');
    // Не должны видеть форму email-логина
    await expect(page.getByPlaceholder('Email')).toHaveCount(0);
  });
});
