import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command: 'cd ../workers && npx wrangler dev --port 8787',
      port: 8787,
      timeout: 30000,
    },
    {
      command: 'cd ../frontend && npm run dev',
      port: 5173,
      timeout: 30000,
    },
  ],
});
