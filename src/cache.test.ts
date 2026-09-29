import { expect, test } from 'vitest'
import type { Card } from './card'
import type { WorkedIssue } from './fetchCards'
import { KEY, readCache, writeCache } from './cache'

/** A `localStorage` stand-in that keeps its values in a map. */
class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const harness = '<harness> <model>'

const card: Card = {
  number: 7,
  title: 'Add the export button',
  phase: 'merged',
  steps: { build: { status: 'passed', harness } },
}

const worked: WorkedIssue[] = [{ number: 7, title: card.title, state: 'open', card }]

test('round-trips the store through storage', () => {
  const storage = new MemoryStorage()
  const store = { 'example/widget': { fetchedAt: 1730000000000, worked } }
  writeCache(storage, store)
  expect(readCache(storage)).toEqual(store)
})

test('ignores corrupt stored JSON and lets the next write replace it', () => {
  const storage = new MemoryStorage()
  storage.setItem(KEY, '{not json')
  expect(readCache(storage)).toEqual({})
  const store = { 'example/widget': { fetchedAt: 1730000000000, worked } }
  writeCache(storage, store)
  expect(readCache(storage)).toEqual(store)
})

test('ignores stored values of the wrong shape', () => {
  const storage = new MemoryStorage()
  storage.setItem(
    KEY,
    JSON.stringify({ 'example/widget': { fetchedAt: 'yesterday' }, 'other/proj': 'nope' }),
  )
  expect(readCache(storage)).toEqual({})
})

test('keeps the valid entries next to the wrong-shape ones', () => {
  const storage = new MemoryStorage()
  const entry = { fetchedAt: 1730000000000, worked }
  storage.setItem(KEY, JSON.stringify({ 'example/widget': entry, 'other/proj': 42 }))
  expect(readCache(storage)).toEqual({ 'example/widget': entry })
})

test('an empty storage reads as an empty store', () => {
  expect(readCache(new MemoryStorage())).toEqual({})
})
