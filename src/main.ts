import './style.css'
import { title } from './title'
import { fetchWorkedCards } from './fetchCards'
import { issueRows, type IssueRow } from './rows'
import { summarize, type Summary } from './summary'
import { barChart, timeBars, tokenBars } from './chart'
import { parseRepos, reposQuery } from './repos'
import { readCache, writeCache, type CacheStore } from './cache'
import { repoState, type RepoData, type RepoState } from './state'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>${title}</h1>
  <form id="repo-form">
    <input id="repo" type="text" placeholder="owner/name" autocomplete="off" />
  </form>
  <div id="summaries"></div>
  <div id="detail"></div>
`

const form = app.querySelector<HTMLFormElement>('#repo-form')!
const input = app.querySelector<HTMLInputElement>('#repo')!
const summaries = app.querySelector<HTMLDivElement>('#summaries')!
const detail = app.querySelector<HTMLDivElement>('#detail')!

let repos: string[] = parseRepos(new URL(window.location.href))
let selected: string | undefined = repos[0]
let notice: string | null = null
const cache = new Map<string, RepoData>()
const store: CacheStore = readCache(window.localStorage)

/** Repositories with stored data render at once, without a network call. */
for (const repo of repos) {
  const entry = store[repo]
  if (entry === undefined) continue
  cache.set(repo, {
    summary: summarize(entry.worked),
    rows: issueRows(entry.worked, repo),
    fetchedAt: entry.fetchedAt,
    refreshing: false,
  })
}

render()
for (const repo of repos) {
  if (!cache.has(repo)) void refresh(repo)
}

/** Rewrite the `repo` parameters of the page URL for the current list. */
function writeUrl(): void {
  const query = reposQuery(repos)
  history.replaceState(null, '', query === '' ? window.location.pathname : `?${query}`)
}

/**
 * Fetch and summarize `repo`, then re-render and store the result. The
 * previous data stays visible while the fetch runs; a failed fetch keeps
 * it and only shows the error. Nothing is stored on failure.
 */
async function refresh(repo: string): Promise<void> {
  if (cache.get(repo)?.refreshing === true) return
  cache.set(repo, { ...cache.get(repo), refreshing: true })
  render()
  try {
    const worked = await fetchWorkedCards(repo)
    const fetchedAt = Date.now()
    store[repo] = { fetchedAt, worked }
    writeCache(window.localStorage, store)
    cache.set(repo, {
      summary: summarize(worked),
      rows: issueRows(worked, repo),
      fetchedAt,
      refreshing: false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    cache.set(repo, { ...cache.get(repo), error: message, refreshing: false })
  }
  render()
}

/** Render every summary block, then the detail area of the selection. */
function render(): void {
  if (selected !== undefined && !repos.includes(selected)) selected = repos[0]
  summaries.innerHTML = repos.map(summaryBlock).join('')
  renderDetail()
}

function renderDetail(): void {
  if (notice !== null) {
    detail.innerHTML = `<p class="error">${escapeHtml(notice)}</p>`
    return
  }
  const data = selected === undefined ? undefined : cache.get(selected)
  const state = repoState(data)
  const rows = data?.rows
  if (rows === undefined || rows.length === 0) {
    detail.innerHTML = state === null ? '' : stateLine(state)
    return
  }
  detail.innerHTML = `${charts(rows)}${table(rows)}`
}

/**
 * Render the summary block of one repository. With several repositories
 * the block carries its `owner/name`, a remove control and works as the
 * click target that selects the repository; with one it renders bare, as
 * before.
 */
function summaryBlock(repo: string): string {
  const data = cache.get(repo)
  const parts: string[] = []
  const state = repoState(data)
  if (state !== null) parts.push(stateLine(state))
  if (data?.summary !== undefined) parts.push(summaryList(data.summary))
  parts.push(metaLine(repo))
  const body = parts.join('')
  if (repos.length < 2) return body
  const cls = repo === selected ? 'repo selected' : 'repo'
  return (
    `<section class="${cls}" data-repo="${escapeHtml(repo)}">` +
    `<h2>${escapeHtml(repo)}<button class="remove" type="button" aria-label="Remove ${escapeHtml(repo)}">×</button></h2>` +
    `${body}</section>`
  )
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const repo = input.value.trim()
  if (!validRepo(repo)) {
    notice = `Invalid repository "${repo}", expected "owner/name"`
    renderDetail()
    return
  }
  notice = null
  if (!repos.includes(repo)) repos.push(repo)
  selected = repo
  writeUrl()
  render()
  if (!cache.has(repo)) void refresh(repo)
})

summaries.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const refreshButton = target.closest<HTMLButtonElement>('button.refresh')
  if (refreshButton?.dataset.repo !== undefined) {
    void refresh(refreshButton.dataset.repo)
    return
  }
  const remove = target.closest<HTMLButtonElement>('button.remove')
  if (remove !== null) {
    const block = remove.closest<HTMLElement>('[data-repo]')
    if (block?.dataset.repo !== undefined) removeRepo(block.dataset.repo)
    return
  }
  const block = target.closest<HTMLElement>('[data-repo]')
  if (block?.dataset.repo !== undefined) {
    selected = block.dataset.repo
    notice = null
    render()
  }
})

/** Remove `repo` from the list and fall back to the first repository. */
function removeRepo(repo: string): void {
  repos = repos.filter((entry) => entry !== repo)
  if (selected === repo) selected = repos[0]
  notice = null
  writeUrl()
  render()
}

/** The `owner/name` shape that `fetchWorkedCards` also expects. */
function validRepo(repo: string): boolean {
  const slash = repo.indexOf('/')
  return slash > 0 && slash < repo.length - 1
}

const HEADERS = ['Issue', 'Title', 'Phase', 'Repairs', 'Duration', 'Tokens', 'Park reason']

/**
 * Render one repository state: "Loading…" while a fetch runs with no
 * rows in view, the error after a failed fetch, or "No ghafk cards
 * found" after a successful fetch that returned none.
 */
function stateLine(state: RepoState): string {
  const cls = state.kind === 'error' ? 'error' : 'meta'
  return `<p class="${cls}">${escapeHtml(state.message)}</p>`
}

/** The fetch time of one repository and its Refresh control. */
function metaLine(repo: string): string {
  const data = cache.get(repo)
  const fetched =
    data?.fetchedAt === undefined ? '' : `Fetched ${new Date(data.fetchedAt).toLocaleString()}`
  const disabled = data?.refreshing === true ? ' disabled' : ''
  return (
    `<p class="meta"><span class="fetched">${fetched}</span>` +
    `<button class="refresh" type="button" data-repo="${escapeHtml(repo)}"${disabled}>Refresh</button></p>`
  )
}

/** Render the summary terms that sit above the table. */
function summaryList(summary: Summary): string {
  const items: [string, string | number][] = [
    ['Issues worked', summary.issuesWorked],
    ['Merged', summary.merged],
    ['Merged first try', summary.mergedFirstTry],
    ['Parked', summary.parked],
    ['Median tokens per merged issue', summary.medianTokensLabel],
    ['Median time from first step to merge', summary.medianMergeLabel],
  ]
  const terms = items.map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`)
  return `<dl class="summary">${terms.join('')}</dl>`
}

/** Render the per-issue charts that sit between the summary and the table. */
function charts(rows: IssueRow[]): string {
  if (rows.length === 0) return ''
  return (
    `<h2>Tokens per issue</h2>${barChart(tokenBars(rows))}` +
    `<h2>Time per issue</h2>${barChart(timeBars(rows))}`
  )
}

function table(rows: IssueRow[]): string {
  const head = HEADERS.map((header) => `<th>${header}</th>`).join('')
  const body = rows
    .map((row) => {
      const cells = [
        `<td><a href="${row.url}" target="_blank" rel="noreferrer">${row.number}</a></td>`,
        `<td>${escapeHtml(row.title)}</td>`,
        `<td>${escapeHtml(row.phase)}</td>`,
        `<td>${row.repairs}</td>`,
        `<td>${row.duration}</td>`,
        `<td>${row.tokens}</td>`,
        `<td>${escapeHtml(row.parkReason)}</td>`,
      ]
      return `<tr>${cells.join('')}</tr>`
    })
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
