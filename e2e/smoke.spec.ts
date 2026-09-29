import { expect, test } from '@playwright/test'

/**
 * One browser smoke test for the built page: enter a repository with the
 * GitHub API stubbed by `page.route` and see the summary and the table.
 * `example/widget` is a fixture, not a real repository.
 */

const REPO = 'example/widget'

interface FixtureIssue {
  number: number
  title: string
  state: 'open' | 'closed'
}

const issues: FixtureIssue[] = [
  { number: 1, title: 'Fix the widget', state: 'closed' },
  { number: 2, title: 'Add a knob', state: 'open' },
]

/**
 * A card comment in the plain-JSON payload form that `readCard` accepts:
 * the marker line, then the state line that carries raw JSON. The cards
 * below never record a real harness or model name.
 */
function cardComment(card: object): { body: string } {
  return { body: `<!-- ghafk:card -->\n<!-- ghafk:state ${JSON.stringify(card)} -->` }
}

/** One merged card with a repair, step tokens and step times. */
const mergedCard = {
  number: 1,
  title: 'Fix the widget',
  phase: 'merged',
  pr: 3,
  repairs: 1,
  steps: {
    plan: {
      status: 'done',
      started: '2025-01-02T09:00:00Z',
      ended: '2025-01-02T09:01:00Z',
      tokens: 1200,
      harness: '<harness> <model>',
    },
    code: {
      status: 'done',
      started: '2025-01-02T09:01:00Z',
      ended: '2025-01-02T09:05:00Z',
      tokens: 3400,
      harness: '<harness> <model>',
    },
  },
  history: [
    { time: '2025-01-02T08:59:00Z', name: 'picked' },
    { time: '2025-01-02T09:06:00Z', name: 'merged' },
  ],
}

/** One parked card with a reason. */
const parkedCard = {
  number: 2,
  title: 'Add a knob',
  phase: 'parked',
  reason: 'waiting for the maintainer',
  steps: {
    plan: {
      status: 'done',
      started: '2025-01-03T10:00:00Z',
      ended: '2025-01-03T10:02:00Z',
      tokens: 800,
      harness: '<harness> <model>',
    },
  },
}

test.beforeEach(async ({ page }) => {
  await page.route(`**/repos/${REPO}/issues?*`, (route) => route.fulfill({ json: issues }))
  await page.route(`**/repos/${REPO}/issues/1/comments?*`, (route) =>
    route.fulfill({ json: [cardComment(mergedCard)] }),
  )
  await page.route(`**/repos/${REPO}/issues/2/comments?*`, (route) =>
    route.fulfill({ json: [cardComment(parkedCard)] }),
  )
})

test('entering a repository shows the summary and the table', async ({ page }) => {
  await page.goto('/ghafk-dashboard/')

  const input = page.locator('#repo')
  await input.fill(REPO)
  await input.press('Enter')

  // The table appears only after the fetch, the card decode and the
  // render, so this wait fails when the table does not render.
  const table = page.locator('#detail table')
  await expect(table).toBeVisible({ timeout: 10_000 })

  await expect(page.locator('#summaries dd')).toHaveText([
    '2', // issues worked
    '1', // merged
    '0', // merged first try
    '1', // parked
    '4600', // median tokens per merged issue
    '6m 0s', // median time from first step to merge
  ])

  const rows = table.locator('tbody tr')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('parked')
  await expect(rows.first()).toContainText('waiting for the maintainer')
})
