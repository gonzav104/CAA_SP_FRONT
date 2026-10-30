import { defineConfig, devices } from '@playwright/test'

// Real end-to-end checks against the isolated QA stack (qa/qa.sh up + seed): real backend, real
// PostgreSQL, no mocks. Serial on purpose: the scenarios share one seeded database and some are one-way
// (an accepted invitation, a consumed reset token). Reset the QA data before every full run.
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  outputDir: './.work/e2e-results',
  use: {
    baseURL: 'http://localhost:5174',
    locale: 'es-AR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
