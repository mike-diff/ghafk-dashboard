import type { IssueRow } from './rows'
import type { Summary } from './summary'

/** One repository: its summary, its rows, its fetch time, or the error of its fetch. */
export interface RepoData {
  summary?: Summary
  rows?: IssueRow[]
  error?: string
  fetchedAt?: number
  refreshing: boolean
}

/** The state of one repository and the message that shows it. */
export interface RepoState {
  kind: 'loading' | 'error' | 'empty'
  message: string
}

/**
 * Pick the state of one repository. Data that never arrived, or a fetch
 * in flight with no rows in view, is loading. A failed fetch shows its
 * error. A successful fetch without cards is empty. Cached rows stay
 * visible during a background refresh, so a repository with rows has no
 * state to show.
 */
export function repoState(data: RepoData | undefined): RepoState | null {
  if (data === undefined) return { kind: 'loading', message: 'Loading…' }
  const rowsVisible = data.rows !== undefined && data.rows.length > 0
  if (data.refreshing && !rowsVisible) return { kind: 'loading', message: 'Loading…' }
  if (data.error !== undefined) return { kind: 'error', message: data.error }
  if (data.rows !== undefined && data.rows.length === 0) {
    return { kind: 'empty', message: 'No ghafk cards found' }
  }
  return null
}
