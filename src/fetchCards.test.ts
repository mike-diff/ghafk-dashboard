import { afterEach, expect, test, vi } from 'vitest'
import type { Card } from './card'
import { fetchWorkedCards } from './fetchCards'

const harness = '<harness>'
const repo = 'example/widget'
const issuesPage1 = `https://api.github.com/repos/${repo}/issues?state=all&per_page=100`

const sampleCard: Card = {
  number: 7,
  title: 'Add the export button',
  phase: 'merged',
  steps: { build: { status: 'passed', harness } },
}

const calls: { url: string; headers: Record<string, string> }[] = []

/** Stub the global fetch with a URL to response map; record every call. */
function stubRoutes(routes: Record<string, () => Response>): void {
  calls.length = 0
  const stub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    calls.push({ url, headers: Object.fromEntries(new Headers(init?.headers)) })
    const route = routes[url]
    if (route === undefined) throw new Error(`no route for ${url}`)
    return route()
  }
  vi.stubGlobal('fetch', stub)
}

function page(body: unknown, link?: string): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (link !== undefined) headers.set('Link', link)
  return new Response(JSON.stringify(body), { status: 200, headers })
}

function cardBody(card: Card): string {
  const payload = JSON.stringify(card).replace(/--/g, '-\\u002d')
  return `<!-- ghafk:card -->\n<!-- ghafk:state ${payload} -->`
}

function commentsUrl(number: number): string {
  return `https://api.github.com/repos/${repo}/issues/${number}/comments?per_page=100`
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('follows pagination across issue and comment pages', async () => {
  const issuesPage2 = `${issuesPage1}&page=2`
  const comments1Page2 = `${commentsUrl(1)}&page=2`
  stubRoutes({
    [issuesPage1]: () =>
      page([{ number: 1, title: 'One', state: 'open' }], `<${issuesPage2}>; rel="next"`),
    [issuesPage2]: () => page([{ number: 2, title: 'Two', state: 'closed' }]),
    [commentsUrl(1)]: () => page([{ body: 'part one' }], `<${comments1Page2}>; rel="next"`),
    [comments1Page2]: () => page([{ body: cardBody({ ...sampleCard, number: 1 }) }]),
    [commentsUrl(2)]: () => page([{ body: cardBody({ ...sampleCard, number: 2 }) }]),
  })
  const worked = await fetchWorkedCards(repo)
  expect(worked.map((issue) => issue.number)).toEqual([1, 2])
  expect(calls.map((call) => call.url)).toEqual([
    issuesPage1,
    issuesPage2,
    commentsUrl(1),
    comments1Page2,
    commentsUrl(2),
  ])
})

test('skips pull requests', async () => {
  stubRoutes({
    [issuesPage1]: () =>
      page([
        { number: 3, title: 'Edit the readme', state: 'open', pull_request: { url: 'pr' } },
        { number: 7, title: sampleCard.title, state: 'open' },
      ]),
    [commentsUrl(7)]: () => page([{ body: cardBody(sampleCard) }]),
  })
  const worked = await fetchWorkedCards(repo)
  expect(worked.map((issue) => issue.number)).toEqual([7])
  expect(calls.map((call) => call.url)).toEqual([issuesPage1, commentsUrl(7)])
})

test('keeps a worked issue with the latest decoded card', async () => {
  const olderCard: Card = { ...sampleCard, phase: 'parked' }
  stubRoutes({
    [issuesPage1]: () => page([{ number: 7, title: sampleCard.title, state: 'closed' }]),
    [commentsUrl(7)]: () =>
      page([{ body: 'a plain comment' }, { body: cardBody(olderCard) }, { body: cardBody(sampleCard) }]),
  })
  expect(await fetchWorkedCards(repo)).toEqual([
    { number: 7, title: sampleCard.title, state: 'closed', card: sampleCard },
  ])
})

test('excludes an issue whose comments hold no card', async () => {
  stubRoutes({
    [issuesPage1]: () => page([{ number: 9, title: 'Rewrite the parser', state: 'open' }]),
    [commentsUrl(9)]: () => page([{ body: 'work started' }]),
  })
  expect(await fetchWorkedCards(repo)).toEqual([])
})

test('sends the bearer token and the API headers only when a token is given', async () => {
  stubRoutes({
    [issuesPage1]: () => page([{ number: 7, title: sampleCard.title, state: 'open' }]),
    [commentsUrl(7)]: () => page([{ body: cardBody(sampleCard) }]),
  })
  await fetchWorkedCards(repo, 'token-123')
  await fetchWorkedCards(repo)
  expect(calls.length).toBe(4)
  for (const call of calls) {
    expect(call.headers.accept).toBe('application/vnd.github+json')
    expect(call.headers['x-github-api-version']).toBe('2022-11-28')
  }
  expect(calls[0].headers.authorization).toBe('Bearer token-123')
  expect(calls[1].headers.authorization).toBe('Bearer token-123')
  expect(calls[2].headers.authorization).toBeUndefined()
  expect(calls[3].headers.authorization).toBeUndefined()
})

test('a 404 throws an error that says the repository does not exist or is private', async () => {
  stubRoutes({
    [issuesPage1]: () => new Response('not found', { status: 404 }),
  })
  await expect(fetchWorkedCards(repo)).rejects.toThrow(/does not exist or is private/)
})

test('a 403 with an exhausted rate limit says when it resets', async () => {
  stubRoutes({
    [issuesPage1]: () =>
      new Response('rate limited', {
        status: 403,
        headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '1730000000' },
      }),
  })
  await expect(fetchWorkedCards(repo)).rejects.toThrow(/rate limit hit/)
  await expect(fetchWorkedCards(repo)).rejects.toThrow(/it resets at 03:33:20 UTC/)
})

test('throws an error that names the status', async () => {
  stubRoutes({
    [issuesPage1]: () => new Response('rate limited', { status: 403 }),
  })
  await expect(fetchWorkedCards(repo)).rejects.toThrow(/403/)
})
