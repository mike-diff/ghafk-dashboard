import type { Card } from './card'
import type { WorkedIssue } from './fetchCards'
import { formatDuration } from './rows'

export interface Summary {
  issuesWorked: number
  merged: number
  mergedFirstTry: number
  parked: number
  medianTokens: number | null
  medianMergeMs: number | null
  medianTokensLabel: string
  medianMergeLabel: string
}

/** Summarize the worked issues of a repository into counts and medians. */
export function summarize(worked: WorkedIssue[]): Summary {
  const merged = worked.map((issue) => issue.card).filter((card) => card.phase === 'merged')
  const medianTokens = median(merged.map(totalTokens))
  const medianMergeMs = median(merged.map(mergeDurationMs).filter(isFiniteNumber))
  return {
    issuesWorked: worked.length,
    merged: merged.length,
    mergedFirstTry: merged.filter((card) => (card.repairs ?? 0) === 0).length,
    parked: worked.filter((issue) => issue.card.phase === 'parked').length,
    medianTokens,
    medianMergeMs,
    medianTokensLabel: medianTokens === null ? '-' : `${Math.round(medianTokens)}`,
    medianMergeLabel: medianMergeMs === null ? '-' : formatDuration(medianMergeMs),
  }
}

/** Sum the tokens of all steps; a missing value counts as `0`. */
function totalTokens(card: Card): number {
  let total = 0
  for (const step of Object.values(card.steps)) total += step.tokens ?? 0
  return total
}

/** Milliseconds from the earliest step start to the merge time, or null. */
function mergeDurationMs(card: Card): number | null {
  const start = earliestStart(card)
  const merge = mergeTime(card)
  return start === null || merge === null ? null : merge - start
}

/** The earliest `started` timestamp over all steps that parses. */
function earliestStart(card: Card): number | null {
  let first: number | null = null
  for (const step of Object.values(card.steps)) {
    if (step.started === undefined) continue
    const started = Date.parse(step.started)
    if (!Number.isFinite(started)) continue
    if (first === null || started < first) first = started
  }
  return first
}

/**
 * The `time` of the last `merged` history entry. Without one, the latest
 * step `ended` that parses.
 */
function mergeTime(card: Card): number | null {
  const merged = (card.history ?? []).filter((entry) => entry.name === 'merged')
  const last = merged[merged.length - 1]
  if (last !== undefined) {
    const time = Date.parse(last.time)
    return Number.isFinite(time) ? time : null
  }
  return latestEnded(card)
}

/** The latest `ended` timestamp over all steps that parses. */
function latestEnded(card: Card): number | null {
  let latest: number | null = null
  for (const step of Object.values(card.steps)) {
    if (step.ended === undefined) continue
    const ended = Date.parse(step.ended)
    if (!Number.isFinite(ended)) continue
    if (latest === null || ended > latest) latest = ended
  }
  return latest
}

/**
 * Median of `values`: the middle of the sorted list for an odd count,
 * the mean of the two middle values for an even count. An empty set is
 * null.
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function isFiniteNumber(value: number | null): value is number {
  return value !== null
}
