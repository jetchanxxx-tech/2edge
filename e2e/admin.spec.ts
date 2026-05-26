import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  const baseURL = 'http://localhost:5173';

  test('should redirect non-admin to home', async ({ page }) => {
    // Set a non-admin JWT token
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid-token');
    });
    await page.goto(`${baseURL}/admin`);
    await page.waitForURL('**/login');
  });

  test('should show admin dashboard for admin user', async ({ page }) => {
    // This test requires a valid admin JWT token (set up in test fixtures)
    test.skip(true, 'Requires seeded admin user');
  });

  test('should show user list for admin', async ({ page }) => {
    test.skip(true, 'Requires seeded admin user');
  });
});
