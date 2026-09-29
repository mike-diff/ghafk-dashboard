import type { IssueRow } from './rows'

const HEADERS = ['Issue', 'Title', 'Phase', 'Repairs', 'Duration', 'Tokens', 'Park reason']

/**
 * Render the issues table. A parked row carries its full park reason in
 * the `title` attribute of its `<tr>`, so hovering any cell of the row
 * shows the reason that the column truncates.
 */
export function table(rows: IssueRow[]): string {
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
      const open = row.parkReason === '' ? '<tr>' : `<tr title="${escapeHtml(row.parkReason)}">`
      return `${open}${cells.join('')}</tr>`
    })
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

/** Escape `text` so it can sit inside element content or an attribute value. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
