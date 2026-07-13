import { test, expect } from '@playwright/test';

test.describe('Login / shell', () => {
  test('shows Concurio login when not authenticated', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Concurio' })).toBeVisible();
    await expect(page.getByText(/трекер задач/i)).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Пароль')).toBeVisible();
  });

  test('login form validates empty submit (native required)', async ({ page }) => {
    await page.goto('./');
    const email = page.getByPlaceholder('Email');
    await expect(email).toHaveAttribute('required', '');
    const password = page.getByPlaceholder('Пароль');
    await expect(password).toHaveAttribute('required', '');
  });

  test('can switch to sign-up mode', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page.getByRole('button', { name: 'Создать аккаунт' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
  });
});
