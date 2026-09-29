import { expect, test } from 'vitest'
import { apiErrorMessage } from './apiError'

const url = 'https://api.github.com/repos/example/widget/issues?state=all&per_page=100'
const reset = '1730000000'

function headers(values: Record<string, string>): Headers {
  return new Headers(values)
}

test('a 404 names both causes: the repository does not exist, or it is private without a token', () => {
  const message = apiErrorMessage(url, 404, headers({}))!
  expect(message).toMatch(/the repository does not exist/)
  expect(message).toMatch(/is private and no token was given/)
})

test('a 403 with an exhausted rate limit says when it resets', () => {
  const message = apiErrorMessage(url, 403, headers({ 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': reset }))!
  expect(message).toMatch(/rate limit hit/)
  expect(message).toMatch(/it resets at 03:33:20 UTC/)
})

test('a 429 with an exhausted rate limit says when it resets', () => {
  const message = apiErrorMessage(url, 429, headers({ 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': reset }))!
  expect(message).toMatch(/rate limit hit/)
  expect(message).toMatch(/it resets at 03:33:20 UTC/)
})

test('a missing reset header gives the rate limit message without a time', () => {
  const message = apiErrorMessage(url, 403, headers({ 'X-RateLimit-Remaining': '0' }))!
  expect(message).toMatch(/rate limit hit/)
  expect(message).not.toMatch(/resets/)
})

test('a 403 that still has requests left keeps the generic status message', () => {
  expect(apiErrorMessage(url, 403, headers({ 'X-RateLimit-Remaining': '12' }))).toBeNull()
  expect(apiErrorMessage(url, 403, headers({}))).toBeNull()
})

test('any other status keeps the generic status message', () => {
  expect(apiErrorMessage(url, 500, headers({}))).toBeNull()
  expect(apiErrorMessage(url, 401, headers({}))).toBeNull()
})
