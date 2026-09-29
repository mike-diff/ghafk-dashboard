import { expect, test } from 'vitest'
import { barChart, timeBars, tokenBars, type Bar } from './chart'
import { issueRows } from './rows'
import type { Card } from './card'
import type { WorkedIssue } from './fetchCards'

const harness = '<harness> <model>'

interface ParsedBar {
  y: number
  height: number
  parked: boolean
  title: string
}

/** Read the bars of a chart string: the rect attributes and the title text. */
function parseBars(svg: string): ParsedBar[] {
  return [...svg.matchAll(/<rect([^>]*)><title>([^<]*)<\/title><\/rect>/g)].map((match) => {
    const attrs = new Map(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(
        (attribute): [string, string] => [attribute[1], attribute[2]],
      ),
    )
    return {
      y: Number(attrs.get('y')),
      height: Number(attrs.get('height')),
      parked: attrs.get('class')?.split(' ').includes('parked') ?? false,
      title: match[2],
    }
  })
}

/** The plot height of a chart, read from its `viewBox`. */
function plotHeight(svg: string): number {
  const match = /viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)
  return match === null ? 0 : Number(match[1])
}

const bars: Bar[] = [
  { issue: 12, value: 2000, parked: false, label: '2000' },
  { issue: 14, value: 1000, parked: true, label: '1000' },
  { issue: 17, value: 500, parked: false, label: '500' },
]

test('renders one bar per issue', () => {
  expect(parseBars(barChart(bars))).toHaveLength(3)
})

test('scales bar heights relative to the maximum', () => {
  const svg = barChart(bars)
  const [largest, half, quarter] = parseBars(svg)
  const plot = plotHeight(svg)
  expect(largest.height).toBe(plot)
  expect(half.height).toBe(plot / 2)
  expect(quarter.height).toBe(plot / 4)
  expect(largest.y + largest.height).toBe(plot)
})

test('gives every bar a zero height when the maximum is zero', () => {
  const zeroMax: Bar[] = [
    { issue: 1, value: 0, parked: false, label: '0' },
    { issue: 2, value: null, parked: false, label: '-' },
  ]
  for (const bar of parseBars(barChart(zeroMax))) expect(bar.height).toBe(0)
})

test('renders a null value as a zero-height bar on the baseline', () => {
  const withNull: Bar[] = [
    { issue: 3, value: 800, parked: false, label: '800' },
    { issue: 5, value: null, parked: false, label: '-' },
  ]
  const svg = barChart(withNull)
  const [full, empty] = parseBars(svg)
  expect(full.height).toBe(plotHeight(svg))
  expect(empty.height).toBe(0)
  expect(empty.y).toBe(plotHeight(svg))
})

test('shows the issue number and value on hover', () => {
  const [largest] = parseBars(barChart(bars))
  expect(largest.title).toBe('#12 2000')
})

test('marks parked bars with their own class', () => {
  const [plain, parked] = parseBars(barChart(bars))
  expect(plain.parked).toBe(false)
  expect(parked.parked).toBe(true)
})

test('returns no markup without bars', () => {
  expect(barChart([])).toBe('')
})

function makeWorked(number: number, card: Partial<Card> = {}): WorkedIssue {
  return {
    number,
    title: `Issue ${number}`,
    state: 'open',
    card: { number, title: `card ${number}`, phase: 'done', steps: {}, ...card },
  }
}

test('builds chart bars from the rows in ascending issue order', () => {
  const worked = [
    makeWorked(17, { steps: { build: { tokens: 500, harness } } }),
    makeWorked(12, {
      phase: 'parked',
      reason: 'waiting for a person',
      steps: {
        plan: { started: '2025-09-28T08:00:00Z', ended: '2025-09-28T09:02:03Z', tokens: 2000, harness },
      },
    }),
    makeWorked(14, { steps: { plan: { tokens: 1000, harness } } }),
  ]
  const rows = issueRows(worked, 'owner/name')
  expect(rows.map((row) => row.number)).toEqual([17, 14, 12])
  expect(tokenBars(rows).map((bar) => bar.issue)).toEqual([12, 14, 17])
  expect(timeBars(rows).map((bar) => bar.issue)).toEqual([12, 14, 17])
})

test('labels the bars with the table numbers', () => {
  const worked = [
    makeWorked(12, {
      steps: {
        plan: { started: '2025-09-28T08:00:00Z', ended: '2025-09-28T09:02:03Z', tokens: 2000, harness },
      },
    }),
    makeWorked(14, {
      phase: 'parked',
      reason: 'waiting for a person',
      steps: { plan: { tokens: 1000, harness } },
    }),
  ]
  const rows = issueRows(worked, 'owner/name')
  const tokens = parseBars(barChart(tokenBars(rows)))
  expect(tokens.map((bar) => bar.title)).toEqual(['#12 2000', '#14 1000'])
  expect(tokens[1].parked).toBe(true)
  const time = parseBars(barChart(timeBars(rows)))
  expect(time.map((bar) => bar.title)).toEqual(['#12 1h 2m 3s', '#14 -'])
  expect(time[0].height).toBe(plotHeight(barChart(timeBars(rows))))
  expect(time[1].height).toBe(0)
})
