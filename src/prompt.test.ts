import { expect, test } from 'vitest'
import { emptyPrompt } from './prompt'

test('prompts to enter a repository while the list is empty', () => {
  expect(emptyPrompt([])).toBe('Enter a repository as owner/name to get started.')
})

test('returns null once the list holds a repository', () => {
  expect(emptyPrompt(['example/widget'])).toBeNull()
})

test('returns null for any non-empty list', () => {
  expect(emptyPrompt(['a/b', 'c/d'])).toBeNull()
})
