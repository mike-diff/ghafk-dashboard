import { expect, test } from 'vitest'
import { isValidRepo, parseRepos, reposQuery } from './repos'

function url(search: string): URL {
  return new URL(`https://example.test/${search}`)
}

test('reads every repo parameter in URL order', () => {
  expect(parseRepos(url('?repo=a/b&repo=c/d'))).toEqual(['a/b', 'c/d'])
})

test('drops empty values', () => {
  expect(parseRepos(url('?repo=&repo=%20&repo=a/b'))).toEqual(['a/b'])
})

test('collapses duplicates to the first occurrence', () => {
  expect(parseRepos(url('?repo=a/b&repo=c/d&repo=a/b&repo=c/d'))).toEqual(['a/b', 'c/d'])
})

test('reads no repos without the parameter', () => {
  expect(parseRepos(url('?other=x'))).toEqual([])
})

test('serializes the list into repeated repo parameters', () => {
  expect(reposQuery(['a/b', 'c/d'])).toBe('repo=a/b&repo=c/d')
})

test('encodes values that need escaping', () => {
  expect(reposQuery(['a/b c', 'x&y'])).toBe('repo=a/b%20c&repo=x%26y')
})

test('serializes an empty list to an empty query', () => {
  expect(reposQuery([])).toBe('')
})

test('round trips a list through the query text', () => {
  const repos = ['a/b', 'c/d']
  expect(parseRepos(url(`?${reposQuery(repos)}`))).toEqual(repos)
})

test('accepts a plain owner and name', () => {
  expect(isValidRepo('a/b')).toBe(true)
  expect(isValidRepo('owner/name')).toBe(true)
})

test('accepts dots, hyphens and underscores in each part', () => {
  expect(isValidRepo('a.b-c_d/e.f')).toBe(true)
  expect(isValidRepo('0-1.2_3/4.5-6_7')).toBe(true)
})

test('rejects names outside the owner/name shape', () => {
  expect(isValidRepo('mike-diff/a, mike-diff/b')).toBe(false)
  expect(isValidRepo('a b/c')).toBe(false)
  expect(isValidRepo('a/')).toBe(false)
  expect(isValidRepo('/b')).toBe(false)
  expect(isValidRepo('a/b/c')).toBe(false)
  expect(isValidRepo('')).toBe(false)
})

test('rejects other separator characters', () => {
  expect(isValidRepo('a/b c')).toBe(false)
  expect(isValidRepo('a:b')).toBe(false)
  expect(isValidRepo('a/b/')).toBe(false)
})
