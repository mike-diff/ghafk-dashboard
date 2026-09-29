import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Print every test name, also when the output is piped (for example to
    // grep), so a log or CI summary can point at a single test.
    reporters: ['verbose'],
  },
})
