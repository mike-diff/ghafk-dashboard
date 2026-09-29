import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Print every test name, also when the output is piped (for example to
    // grep), so a log or CI summary can point at a single test.
    reporters: ['verbose'],
    // The Playwright spec under e2e/ is not a vitest file.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
