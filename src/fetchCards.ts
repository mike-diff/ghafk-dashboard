import { readCard, type Card } from './card'

export interface WorkedIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  card: Card
}

interface IssueItem {
  number: number
  title: string
  state: 'open' | 'closed'
  pull_request?: unknown
}

interface CommentItem {
  body: string
}

const API_ROOT = 'https://api.github.com'

/**
 * Fetch every issue of `owner/name` (open and closed) and keep each issue
 * whose comments hold a ghafk card. Pull requests are skipped. The token
 * is optional; without it the public API is used. When several comments
 * of one issue decode, the last card wins as the latest state.
 */
export async function fetchWorkedCards(repo: string, token?: string): Promise<WorkedIssue[]> {
  const slash = repo.indexOf('/')
  if (slash < 1 || slash === repo.length - 1) {
    throw new Error(`Invalid repository "${repo}", expected "owner/name"`)
  }
  const owner = repo.slice(0, slash)
  const name = repo.slice(slash + 1)
  const issuesUrl = `${API_ROOT}/repos/${owner}/${name}/issues?state=all&per_page=100`
  const worked: WorkedIssue[] = []
  for (const issue of await listAll(issuesUrl, token, isIssueItem)) {
    if ('pull_request' in issue) continue
    const commentsUrl = `${API_ROOT}/repos/${owner}/${name}/issues/${issue.number}/comments?per_page=100`
    const comments = await listAll(commentsUrl, token, isCommentItem)
    let card: Card | undefined
    for (const comment of comments) {
      card = (await readCard(comment.body)) ?? card
    }
    if (card !== undefined) {
      worked.push({ number: issue.number, title: issue.title, state: issue.state, card })
    }
  }
  return worked
}

/** Get every page of `url`, then keep only the items that pass `isItem`. */
async function listAll<T>(
  url: string,
  token: string | undefined,
  isItem: (value: unknown) => value is T,
): Promise<T[]> {
  const items: T[] = []
  let next: string | undefined = url
  while (next !== undefined) {
    const page = await getJson(next, token)
    for (const value of page.json) {
      if (isItem(value)) items.push(value)
    }
    next = nextLink(page.link)
  }
  return items
}

async function getJson(
  url: string,
  token: string | undefined,
): Promise<{ json: unknown[]; link: string | null }> {
  const response = await fetch(url, { headers: requestHeaders(token) })
  if (!response.ok) {
    throw new Error(`GitHub API request to ${url} failed with status ${response.status}`)
  }
  const json: unknown = await response.json()
  return { json: Array.isArray(json) ? json : [], link: response.headers.get('Link') }
}

function requestHeaders(token: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** Return the URL of the `rel="next"` link, when the header has one. */
function nextLink(link: string | null): string | undefined {
  if (link === null) return undefined
  for (const part of link.split(',')) {
    const match = /^<([^>]+)>;\s*rel="next"$/.exec(part.trim())
    if (match) return match[1]
  }
  return undefined
}

function isIssueItem(value: unknown): value is IssueItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.number === 'number' &&
    typeof item.title === 'string' &&
    (item.state === 'open' || item.state === 'closed')
  )
}

function isCommentItem(value: unknown): value is CommentItem {
  if (typeof value !== 'object' || value === null) return false
  return typeof (value as Record<string, unknown>).body === 'string'
}
