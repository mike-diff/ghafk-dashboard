import type { Card } from './card'
import type { WorkedIssue } from './fetchCards'

/** One stored repository result: when it was fetched, in epoch milliseconds, and its raw issues. */
export interface CacheEntry {
  fetchedAt: number
  worked: WorkedIssue[]
}

/** Every stored result, keyed by `owner/name`. */
export interface CacheStore {
  [repo: string]: CacheEntry
}

/** The part of `localStorage` the cache needs, so tests can pass a stub. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/** The one `localStorage` key that holds the whole cached store. */
export const KEY = 'ghafk-dashboard:cache:v1'

/**
 * Read the store from `storage`. Corrupt JSON and entries of the wrong
 * shape are ignored: they never break the page and the next successful
 * fetch overwrites them.
 */
export function readCache(storage: StorageLike): CacheStore {
  let raw: string | null
  try {
    raw = storage.getItem(KEY)
  } catch {
    return {}
  }
  if (raw === null) return {}
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return {}
  const store: CacheStore = {}
  for (const [repo, value] of Object.entries(json)) {
    if (isCacheEntry(value)) store[repo] = value
  }
  return store
}

/** Write the whole store to `storage`. A failing write never breaks the page. */
export function writeCache(storage: StorageLike, store: CacheStore): void {
  try {
    storage.setItem(KEY, JSON.stringify(store))
  } catch {
    // A blocked or full storage only costs the cache, not the page.
  }
}

function isCacheEntry(value: unknown): value is CacheEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.fetchedAt === 'number' &&
    Number.isFinite(entry.fetchedAt) &&
    Array.isArray(entry.worked) &&
    entry.worked.every(isWorkedIssue)
  )
}

function isWorkedIssue(value: unknown): value is WorkedIssue {
  if (typeof value !== 'object' || value === null) return false
  const issue = value as Record<string, unknown>
  return (
    typeof issue.number === 'number' &&
    typeof issue.title === 'string' &&
    (issue.state === 'open' || issue.state === 'closed') &&
    isCard(issue.card)
  )
}

/** A loose card check: the fields that `summarize` and `issueRows` read. */
function isCard(value: unknown): value is Card {
  if (typeof value !== 'object' || value === null) return false
  const card = value as Record<string, unknown>
  return (
    typeof card.number === 'number' &&
    typeof card.title === 'string' &&
    typeof card.phase === 'string' &&
    typeof card.steps === 'object' &&
    card.steps !== null &&
    !Array.isArray(card.steps)
  )
}
