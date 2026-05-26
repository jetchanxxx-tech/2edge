import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const baseURL = 'http://localhost:5173';
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpass123';

  test('should show login page', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await expect(page.locator('h1')).toHaveText('2Edge');
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
  });

  test('should show register page', async ({ page }) => {
    await page.goto(`${baseURL}/register`);
    await expect(page.locator('h1')).toHaveText(/注册/);
    await expect(page.locator('input[id="email"]')).toBeVisible();
  });

  test('should redirect to login when accessing protected page', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForURL('**/login');
  });
});
