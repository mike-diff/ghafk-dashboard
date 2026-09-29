import { expect, test } from 'vitest'
import type { IssueRow } from './rows'
import { table } from './table'

const parked: IssueRow = {
  number: 7,
  url: 'https://github.com/example/widget/issues/7',
  title: 'A title',
  phase: 'parked',
  repairs: 1,
  durationMs: null,
  duration: '-',
  tokens: 0,
  parkReason: 'a very long park reason that the column truncates',
}

const done: IssueRow = {
  ...parked,
  number: 8,
  url: 'https://github.com/example/widget/issues/8',
  phase: 'done',
  repairs: 0,
  parkReason: '',
}

test('shows the full park reason when hovering a parked row', () => {
  const html = table([parked])
  expect(html).toContain('<tr title="a very long park reason that the column truncates">')
})

test('adds no title to a row without a park reason', () => {
  const html = table([done])
  expect(html).toContain('<tr>')
  expect(html).not.toContain('title=')
})
