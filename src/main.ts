import './style.css'
import { title } from './title'
import { fetchWorkedCards } from './fetchCards'
import { issueRows, type IssueRow } from './rows'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>${title}</h1>
  <form id="repo-form">
    <input id="repo" type="text" placeholder="owner/name" autocomplete="off" />
  </form>
  <div id="result"></div>
`

const form = app.querySelector<HTMLFormElement>('#repo-form')!
const input = app.querySelector<HTMLInputElement>('#repo')!
const result = app.querySelector<HTMLDivElement>('#result')!

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const repo = input.value.trim()
  try {
    const worked = await fetchWorkedCards(repo)
    result.innerHTML = table(issueRows(worked, repo))
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : String(error)
  }
})

const HEADERS = ['Issue', 'Title', 'Phase', 'Repairs', 'Duration', 'Tokens', 'Park reason']

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
