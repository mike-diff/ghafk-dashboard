import type { Card } from './card'
import type { WorkedIssue } from './fetchCards'

export interface IssueRow {
  number: number
  url: string
  title: string
  phase: string
  repairs: number
  durationMs: number | null
  duration: string
  tokens: number
  parkReason: string
}

/**
 * Turn worked issues of `owner/name` into table rows. Rows are sorted by
 * descending issue number, so the newest issue comes first.
 */
export function issueRows(worked: WorkedIssue[], repo: string): IssueRow[] {
  return worked
    .map((issue) => row(issue, repo))
    .sort((a, b) => b.number - a.number)
}

function row(issue: WorkedIssue, repo: string): IssueRow {
  const durationMs = totalDurationMs(issue.card)
  return {
    number: issue.number,
    url: `https://github.com/${repo}/issues/${issue.number}`,
    title: issue.title,
    phase: issue.card.phase,
    repairs: issue.card.repairs ?? 0,
    durationMs,
    duration: durationMs === null ? '-' : formatDuration(durationMs),
    tokens: totalTokens(issue.card),
    parkReason: parkReason(issue.card),
  }
}

/** Sum `ended - started` over the steps that have both timestamps. */
function totalDurationMs(card: Card): number | null {
  let total: number | null = null
  for (const step of Object.values(card.steps)) {
    if (step.started === undefined || step.ended === undefined) continue
    const started = Date.parse(step.started)
    const ended = Date.parse(step.ended)
    if (!Number.isFinite(started) || !Number.isFinite(ended)) continue
    total = (total ?? 0) + ended - started
  }
  return total
}

/** Sum the tokens of all steps; a missing value counts as `0`. */
function totalTokens(card: Card): number {
  let total = 0
  for (const step of Object.values(card.steps)) total += step.tokens ?? 0
  return total
}

/** The park reason counts only for a parked card with a non-empty reason. */
function parkReason(card: Card): string {
  return card.phase === 'parked' && typeof card.reason === 'string' && card.reason !== ''
    ? card.reason
    : ''
}

/** Format milliseconds as `1h 2m 3s`, with leading zero units omitted. */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (hours > 0 || minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds % 60}s`)
  return parts.join(' ')
}
