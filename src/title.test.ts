import { expect, test } from 'vitest'
import { title } from './title'

test('the page has a title', () => {
  expect(title).toBe('ghafk dashboard')
})
