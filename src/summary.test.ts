import { expect, test } from 'vitest'
import { summarize } from './summary'
import type { Card } from './card'
import type { WorkedIssue } from './fetchCards'

const harness = '<harness> <model>'

function makeWorked(number: number, card: Partial<Card> = {}): WorkedIssue {
  return {
    number,
    title: `Issue ${number}`,
    state: 'closed',
    card: { number, title: `card ${number}`, phase: 'done', steps: {}, ...card },
  }
}

const firstTry = makeWorked(1, {
  phase: 'merged',
  steps: {
    plan: { started: '2025-09-28T08:00:00Z', ended: '2025-09-28T08:01:00Z', tokens: 1000, harness },
    build: { started: '2025-09-28T08:02:00Z', ended: '2025-09-28T08:12:00Z', tokens: 3000, harness },
  },
  history: [
    { name: 'started', time: '2025-09-28T08:00:00Z' },
    { name: 'merged', time: '2025-09-28T08:20:00Z' },
  ],
})

const afterRepair = makeWorked(2, {
  phase: 'merged',
  repairs: 1,
  steps: {
    plan: { started: '2025-09-29T10:00:00Z', ended: '2025-09-29T10:02:00Z', tokens: 500, harness },
    build: { started: '2025-09-29T10:03:00Z', ended: '2025-09-29T10:20:00Z', tokens: 1500, harness },
  },
  history: [
    { name: 'merged', time: '2025-09-29T10:35:00Z' },
    { name: 'repair', time: '2025-09-29T10:36:00Z' },
    { name: 'merged', time: '2025-09-29T10:40:00Z' },
  ],
})

const parked = makeWorked(3, {
  phase: 'parked',
  reason: 'waiting for a person',
  steps: {
    plan: { started: '2025-09-30T09:00:00Z', ended: '2025-09-30T09:05:00Z', tokens: 700, harness },
  },
  history: [{ name: 'parked', time: '2025-09-30T09:06:00Z' }],
})

const working = makeWorked(4, {
  phase: 'working',
  steps: {
    plan: { started: '2025-10-01T07:00:00Z', ended: '2025-10-01T07:03:00Z', tokens: 900, harness },
  },
})

test('summarizes counts and medians over the worked issues', () => {
  const summary = summarize([firstTry, afterRepair, parked, working])
  expect(summary.issuesWorked).toBe(4)
  expect(summary.merged).toBe(2)
  expect(summary.mergedFirstTry).toBe(1)
  expect(summary.parked).toBe(1)
  expect(summary.medianTokens).toBe(3000)
  expect(summary.medianTokensLabel).toBe('3000')
  expect(summary.medianMergeMs).toBe(1_800_000)
  expect(summary.medianMergeLabel).toBe('30m 0s')
})

test('shows dashes for an empty repository', () => {
  expect(summarize([])).toEqual({
    issuesWorked: 0,
    merged: 0,
    mergedFirstTry: 0,
    parked: 0,
    medianTokens: null,
    medianMergeMs: null,
    medianTokensLabel: '-',
    medianMergeLabel: '-',
  })
})

test('falls back to the latest step end without a merged history entry', () => {
  const card = makeWorked(5, {
    phase: 'merged',
    repairs: 0,
    steps: {
      plan: { started: '2025-10-02T08:00:00Z', ended: '2025-10-02T08:05:00Z', tokens: 400, harness },
      build: { started: '2025-10-02T08:06:00Z', ended: '2025-10-02T08:30:00Z', tokens: 600, harness },
    },
  })
  const summary = summarize([card])
  expect(summary.mergedFirstTry).toBe(1)
  expect(summary.medianTokens).toBe(1000)
  expect(summary.medianTokensLabel).toBe('1000')
  expect(summary.medianMergeMs).toBe(1_800_000)
  expect(summary.medianMergeLabel).toBe('30m 0s')
})

test('excludes a merged card without a merge endpoint from the duration', () => {
  const card = makeWorked(6, {
    phase: 'merged',
    steps: { plan: { started: '2025-10-02T08:00:00Z', tokens: 100, harness } },
  })
  const summary = summarize([card])
  expect(summary.merged).toBe(1)
  expect(summary.medianTokens).toBe(100)
  expect(summary.medianMergeMs).toBeNull()
  expect(summary.medianMergeLabel).toBe('-')
})

test('skips steps whose timestamps do not parse', () => {
  const card = makeWorked(7, {
    phase: 'merged',
    steps: {
      bad: { started: 'not a date', ended: 'not a date', harness },
      plan: { started: '2025-10-03T08:00:00Z', ended: '2025-10-03T08:10:00Z', harness },
    },
    history: [{ name: 'merged', time: '2025-10-03T08:25:00Z' }],
  })
  const summary = summarize([card])
  expect(summary.medianMergeMs).toBe(1_500_000)
})

test('rounds a fractional token median to an integer', () => {
  const low = makeWorked(8, { phase: 'merged', steps: { plan: { tokens: 1000, harness } } })
  const high = makeWorked(9, { phase: 'merged', steps: { plan: { tokens: 1001, harness } } })
  const summary = summarize([low, high])
  expect(summary.medianTokens).toBe(1000.5)
  expect(summary.medianTokensLabel).toBe('1001')
})
