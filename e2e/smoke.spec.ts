import { expect, test, type Route } from '@playwright/test'

/**
 * Browser tests for the built page: the GitHub API is stubbed by
 * `page.route`. `example/widget` and `example/secret` are fixtures, not
 * real repositories.
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

const PRIVATE_REPO = 'example/secret'

/** A dummy token; no real token is ever committed. */
const TOKEN = 'token-123'

const privateIssues: FixtureIssue[] = [{ number: 5, title: 'Fix the secret part', state: 'open' }]

/** One merged card with a single step. */
const privateCard = {
  number: 5,
  title: 'Fix the secret part',
  phase: 'merged',
  pr: 8,
  steps: {
    code: {
      status: 'done',
      started: '2025-02-01T09:00:00Z',
      ended: '2025-02-01T09:04:00Z',
      tokens: 1500,
      harness: '<harness> <model>',
    },
  },
  history: [
    { time: '2025-02-01T08:59:00Z', name: 'picked' },
    { time: '2025-02-01T09:05:00Z', name: 'merged' },
  ],
}

/** Serve `body` only when the request carries the bearer token; otherwise 404. */
function servePrivate(route: Route, body: unknown): void {
  const auth = route.request().headers()['authorization']
  if (auth === `Bearer ${TOKEN}`) route.fulfill({ json: body })
  else route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' })
}

test('a saved token loads a private repository and removing it fails again', async ({ page }) => {
  await page.route(`**/repos/${PRIVATE_REPO}/issues?*`, (route) =>
    servePrivate(route, privateIssues),
  )
  await page.route(`**/repos/${PRIVATE_REPO}/issues/5/comments?*`, (route) =>
    servePrivate(route, [cardComment(privateCard)]),
  )

  await page.goto('/ghafk-dashboard/')

  // Without a token the stub answers 404, so the known message appears.
  await page.locator('#repo').fill(PRIVATE_REPO)
  await page.locator('#repo').press('Enter')
  const error = page.locator('p.error').first()
  await expect(error).toContainText('does not exist or is private and no token was given')

  // Saving the token clears every stored result and refetches, so the
  // private repository loads; the input is cleared after the save.
  await page.locator('#token').fill(TOKEN)
  await page.locator('#token-save').click()
  await expect(page.locator('#detail table')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('#token')).toHaveValue('')
  await expect(page.locator('#token-status')).toHaveText('Token saved')

  // The token value appears neither in the page text nor in the URL.
  await expect(page.locator('body')).not.toContainText(TOKEN)
  expect(page.url()).not.toContain(TOKEN)

  // Removing the token makes the same repository fail with the same message.
  await page.locator('#token-remove').click()
  await expect(error).toContainText('does not exist or is private and no token was given', {
    timeout: 10_000,
  })
  await expect(page.locator('#token-status')).toHaveText('No token saved')
  await expect(page.locator('body')).not.toContainText(TOKEN)
  expect(page.url()).not.toContain(TOKEN)
})
