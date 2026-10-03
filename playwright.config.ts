import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const SOFTWARE_GL = Boolean(process.env.E2E_SOFTWARE_GL);
const CI = Boolean(process.env.CI);
const softwareArgs = SOFTWARE_GL
  ? ['--disable-gpu', '--use-gl=angle', '--use-angle=swiftshader']
  : [];

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  workers: CI || SOFTWARE_GL ? 1 : 2,
  timeout: CI || SOFTWARE_GL ? 180_000 : 45_000,
  expect: { timeout: CI || SOFTWARE_GL ? 60_000 : 5_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm dev --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'desktop-1440',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: { args: softwareArgs },
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'tablet-768',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: { args: softwareArgs },
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
});
