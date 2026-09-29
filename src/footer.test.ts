import { expect, test } from 'vitest'
import { footer } from './footer'

test('the footer links to the ghafk repository', () => {
  expect(footer()).toContain('<a href="https://github.com/mike-diff/ghafk">ghafk</a>')
})

test('the footer states the data source', () => {
  expect(footer()).toContain('Data comes from the GitHub API.')
})
