import { defineConfig } from '@playwright/test'

/**
 * The smoke test drives the system Chrome (`channel: 'chrome'`) instead
 * of a downloaded Playwright browser, because the Playwright CDN is not
 * reachable from every environment. GitHub Actions runners ship Chrome.
 */
export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'chrome',
    headless: true,
  },
  webServer: {
    command: 'pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/ghafk-dashboard/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
