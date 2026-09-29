const CARD_MARKER = '<!-- ghafk:card -->'
const STATE_PREFIX = '<!-- ghafk:state '
const STATE_SUFFIX = ' -->'

export interface CardStep {
  status?: string
  started?: string
  ended?: string
  tokens?: number
  harness?: string
}

export interface CardHistoryEntry {
  time: string
  name: string
  reason?: string
}

export interface Card {
  number: number
  title: string
  phase: string
  steps: Record<string, CardStep>
  pr?: number | null
  reason?: string | null
  repairs?: number
  contract?: string
  approved?: boolean
  items?: string[]
  history?: CardHistoryEntry[]
}

/**
 * Decode the ghafk card from a comment body.
 *
 * The body is a card when its first line is `<!-- ghafk:card -->` and its
 * next line is `<!-- ghafk:state PAYLOAD -->`. PAYLOAD is base64 of gzip
 * JSON, or plain JSON when it starts with `{`. Returns undefined when the
 * body is not a card or any decode step throws.
 */
export async function readCard(body: string): Promise<Card | undefined> {
  const lines = body.split(/\r?\n/)
  if (lines[0] !== CARD_MARKER) return undefined
  const state = lines[1]
  if (state === undefined || !state.startsWith(STATE_PREFIX) || !state.endsWith(STATE_SUFFIX)) {
    return undefined
  }
  const payload = state.slice(STATE_PREFIX.length, -STATE_SUFFIX.length).trim()
  try {
    const json = payload.startsWith('{') ? payload : await inflate(payload)
    const value: unknown = JSON.parse(json)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    return value as Card
  } catch {
    return undefined
  }
}

async function inflate(payload: string): Promise<string> {
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}
