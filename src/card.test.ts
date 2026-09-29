import { expect, test } from 'vitest'
import { readCard, type Card } from './card'

const harness = '<harness>'

const sampleCard: Card = {
  number: 7,
  title: 'Fix the leak -- again',
  phase: 'merged',
  steps: {
    build: {
      status: 'passed',
      started: '2025-09-28T08:00:00Z',
      ended: '2025-09-28T08:01:00Z',
      tokens: 1200,
      harness,
    },
  },
  pr: 42,
  reason: null,
  repairs: 0,
  approved: true,
  items: ['read the card', 'paint the board'],
  history: [{ time: '2025-09-28T08:02:00Z', name: 'merged', reason: 'done' }],
}

async function compressToBase64(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

test('reads a compressed card', async () => {
  const payload = await compressToBase64(JSON.stringify(sampleCard))
  const body = [
    '<!-- ghafk:card -->',
    `<!-- ghafk:state ${payload} -->`,
    '',
    'Everything after the payload line is ignored.',
  ].join('\r\n')
  expect(await readCard(body)).toEqual(sampleCard)
})

test('reads a plain JSON card', async () => {
  // Older cards hold plain JSON and write `--` as `-\u002d`.
  const body = [
    '<!-- ghafk:card -->',
    '<!-- ghafk:state {"number":7,"title":"Fix the leak -\\u002d again","phase":"parked"} -->',
  ].join('\n')
  const card = await readCard(body)
  expect(card?.title).toBe('Fix the leak -- again')
})

test('returns nothing for a non-card comment', async () => {
  expect(await readCard('<!-- ghafk:state e30= -->\nNo card marker on the first line.')).toBeUndefined()
  expect(await readCard('A plain comment.')).toBeUndefined()
})

test('returns nothing for a broken payload', async () => {
  // Valid base64 of bytes that are not gzip.
  const body = '<!-- ghafk:card -->\n<!-- ghafk:state bm90IGd6aXA= -->'
  expect(await readCard(body)).toBeUndefined()
})
