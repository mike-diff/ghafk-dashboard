import { expect, test } from 'vitest'
import { formatDuration, issueRows } from './rows'
import type { Card } from './card'
import type { WorkedIssue } from './fetchCards'

const harness = '<harness> <model>'

function makeWorked(number: number, card: Partial<Card> = {}): WorkedIssue {
  return {
    number,
    title: `Issue ${number}`,
    state: 'open',
    card: { number, title: `card ${number}`, phase: 'done', steps: {}, ...card },
  }
}

test('formats durations with leading zero units omitted', () => {
  expect(formatDuration(3_723_000)).toBe('1h 2m 3s')
  expect(formatDuration(123_000)).toBe('2m 3s')
  expect(formatDuration(7_000)).toBe('7s')
  expect(formatDuration(0)).toBe('0s')
})

test('sorts rows by descending issue number', () => {
  const rows = issueRows([makeWorked(3), makeWorked(41), makeWorked(17)], 'owner/name')
  expect(rows.map((row) => row.number)).toEqual([41, 17, 3])
})

test('links each issue number to its issue page', () => {
  const [row] = issueRows([makeWorked(5)], 'owner/name')
  expect(row.url).toBe('https://github.com/owner/name/issues/5')
})

test('takes the title from the issue, not from the card', () => {
  const [row] = issueRows([makeWorked(5, { title: 'card title' })], 'owner/name')
  expect(row.title).toBe('Issue 5')
})

test('sums duration and tokens over the steps that hold them', () => {
  const card: Partial<Card> = {
    phase: 'merged',
    steps: {
      plan: { started: '2025-09-28T08:00:00Z', ended: '2025-09-28T08:02:30Z', harness },
      build: { started: '2025-09-28T08:03:00Z', ended: '2025-09-28T08:04:00Z', tokens: 1200 },
      review: { tokens: 800 },
      idle: { started: '2025-09-28T09:00:00Z' },
    },
    repairs: 2,
  }
  const [row] = issueRows([makeWorked(9, card)], 'owner/name')
  expect(row.phase).toBe('merged')
  expect(row.repairs).toBe(2)
  expect(row.durationMs).toBe(210_000)
  expect(row.duration).toBe('3m 30s')
  expect(row.tokens).toBe(2000)
})

test('shows a dash when no step has both timestamps', () => {
  const card: Partial<Card> = { steps: { plan: { started: '2025-09-28T08:00:00Z' } } }
  const [row] = issueRows([makeWorked(3, card)], 'owner/name')
  expect(row.durationMs).toBeNull()
  expect(row.duration).toBe('-')
  expect(row.tokens).toBe(0)
})

test('counts missing repairs as zero', () => {
  const [row] = issueRows([makeWorked(1)], 'owner/name')
  expect(row.repairs).toBe(0)
})

test('shows the park reason only for a parked card', () => {
  const parked = makeWorked(2, { phase: 'parked', reason: 'waiting for a person' })
  const working = makeWorked(3, { phase: 'working', reason: 'not parked yet' })
  const quiet = makeWorked(4, { phase: 'parked', reason: null })
  const rows = issueRows([parked, working, quiet], 'owner/name')
  expect(rows.map((row) => row.number)).toEqual([4, 3, 2])
  expect(rows[2].parkReason).toBe('waiting for a person')
  expect(rows[1].parkReason).toBe('')
  expect(rows[0].parkReason).toBe('')
})
