import { expect, test } from 'vitest'
import { KEY, readToken, removeToken, saveToken } from './token'

/** A `localStorage` stand-in that keeps its values in a map. */
class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

/** A storage whose every method throws, like a blocked `localStorage`. */
class ThrowingStorage {
  getItem(): string | null {
    throw new Error('storage blocked')
  }

  setItem(): void {
    throw new Error('storage blocked')
  }

  removeItem(): void {
    throw new Error('storage blocked')
  }
}

test('saves a token and reads it back under its own key', () => {
  const storage = new MemoryStorage()
  saveToken(storage, 'token-123')
  expect(storage.getItem(KEY)).toBe('token-123')
  expect(readToken(storage)).toBe('token-123')
})

test('removes a saved token', () => {
  const storage = new MemoryStorage()
  saveToken(storage, 'token-123')
  removeToken(storage)
  expect(readToken(storage)).toBeUndefined()
})

test('a storage without a token reads as undefined', () => {
  expect(readToken(new MemoryStorage())).toBeUndefined()
})

test('a storage that throws reads as no token', () => {
  expect(readToken(new ThrowingStorage())).toBeUndefined()
})

test('a storage that throws never breaks save and remove', () => {
  const storage = new ThrowingStorage()
  saveToken(storage, 'token-123')
  removeToken(storage)
})
