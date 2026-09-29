import type { IssueRow } from './rows'

/** One bar of a chart: its issue, its value, its tooltip text and its parked flag. */
export interface Bar {
  issue: number
  value: number | null
  parked: boolean
  label: string
}

const PLOT_HEIGHT = 100
const BAR_WIDTH = 24
const BAR_GAP = 4

/**
 * Build an inline SVG bar chart from `bars`. Each bar height is the value
 * over the maximum of all values, so the largest bar fills the plot. A
 * null value, like a maximum of zero, gives a zero-height bar. Every bar
 * carries a `title` with the issue number and the value, and a parked bar
 * carries the extra `parked` class.
 */
export function barChart(bars: Bar[]): string {
  if (bars.length === 0) return ''
  const max = Math.max(0, ...bars.map((bar) => bar.value ?? 0))
  const rects = bars.map((bar, index) => {
    const height = max === 0 ? 0 : ((bar.value ?? 0) / max) * PLOT_HEIGHT
    const cls = bar.parked ? 'bar parked' : 'bar'
    return (
      `<rect class="${cls}" x="${index * (BAR_WIDTH + BAR_GAP)}" y="${PLOT_HEIGHT - height}"` +
      ` width="${BAR_WIDTH}" height="${height}">` +
      `<title>#${bar.issue} ${bar.label}</title></rect>`
    )
  })
  const width = bars.length * BAR_WIDTH + (bars.length - 1) * BAR_GAP
  return (
    `<svg class="chart" width="${width}" height="${PLOT_HEIGHT}"` +
    ` viewBox="0 0 ${width} ${PLOT_HEIGHT}" role="img">${rects.join('')}</svg>`
  )
}

/** Bars for the tokens chart, one per row in ascending issue order. */
export function tokenBars(rows: IssueRow[]): Bar[] {
  return ascending(rows).map((row) => ({
    issue: row.number,
    value: row.tokens,
    parked: row.phase === 'parked',
    label: `${row.tokens}`,
  }))
}

/** Bars for the time chart, one per row in ascending issue order. */
export function timeBars(rows: IssueRow[]): Bar[] {
  return ascending(rows).map((row) => ({
    issue: row.number,
    value: row.durationMs,
    parked: row.phase === 'parked',
    label: row.duration,
  }))
}

/** A copy of `rows` in ascending issue order, the reverse of the table order. */
function ascending(rows: IssueRow[]): IssueRow[] {
  return [...rows].sort((a, b) => a.number - b.number)
}
