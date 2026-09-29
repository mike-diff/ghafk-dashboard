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
    // Run the vite binary directly. `pnpm exec` starts vite in its own
    // process group, so the teardown group kill misses it, the stdio pipe
    // stays open and this runner never exits. The direct binary is one
    // process and dies with the group.
    command: 'node_modules/.bin/vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/ghafk-dashboard/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
