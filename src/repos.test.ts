import { expect, test } from 'vitest'
import { parseRepos, reposQuery } from './repos'

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
