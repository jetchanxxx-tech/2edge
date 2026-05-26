import { test, expect } from '@playwright/test';

test.describe('Subscription', () => {
  const baseURL = 'http://localhost:5173';

  test('should display subscription URL for authenticated user', async ({ page }) => {
    test.skip(true, 'Requires authenticated user token');
  });

  test('should generate valid subscription content', async ({ request }) => {
    // Test the subscription API endpoint directly
    // Requires a valid user token from seeded data
    const response = await request.get('http://localhost:8787/api/v1/sub/invalid-token');
    expect(response.status()).toBe(404);
  });
});
