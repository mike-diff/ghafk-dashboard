import { expect, test } from 'vitest'
import type { IssueRow } from './rows'
import { repoState, type RepoData } from './state'

const row: IssueRow = {
  number: 7,
  url: 'https://github.com/example/widget/issues/7',
  title: 'Add the export button',
  phase: 'merged',
  repairs: 0,
  durationMs: 1000,
  duration: '1s',
  tokens: 10,
  parkReason: '',
}

test('data that never arrived is loading', () => {
  expect(repoState(undefined)).toEqual({ kind: 'loading', message: 'Loading…' })
})

test('a running fetch with no rows in view is loading', () => {
  const data: RepoData = { refreshing: true }
  expect(repoState(data)).toEqual({ kind: 'loading', message: 'Loading…' })
})

test('cached rows stay visible during a background refresh', () => {
  const data: RepoData = { rows: [row], fetchedAt: 1730000000000, refreshing: true }
  expect(repoState(data)).toBeNull()
})

test('a failed fetch shows its error', () => {
  const data: RepoData = {
    refreshing: false,
    error: 'GitHub API request failed: the repository does not exist or is private',
  }
  expect(repoState(data)).toEqual({ kind: 'error', message: data.error })
})

test('a successful fetch that returned no cards is empty', () => {
  const data: RepoData = { rows: [], refreshing: false }
  expect(repoState(data)).toEqual({ kind: 'empty', message: 'No ghafk cards found' })
})

test('a repository with rows shows no state message', () => {
  const data: RepoData = { rows: [row], refreshing: false }
  expect(repoState(data)).toBeNull()
})
