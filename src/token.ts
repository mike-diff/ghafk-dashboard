/**
 * The optional GitHub token for private repositories, kept in this
 * browser only. The token never leaves the page except in the
 * `Authorization` header of `api.github.com` requests, and it is never
 * shown, logged, or put in the URL.
 */

/** The part of `localStorage` the token needs, so tests can pass a stub. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** The one `localStorage` key that holds the token, separate from the cache store. */
export const KEY = 'ghafk-dashboard:token:v1'

/** Read the token from `storage`; no stored token reads as undefined. */
export function readToken(storage: StorageLike): string | undefined {
  try {
    return storage.getItem(KEY) ?? undefined
  } catch {
    return undefined
  }
}

/** Save `token` to `storage`. A failing write never breaks the page. */
export function saveToken(storage: StorageLike, token: string): void {
  try {
    storage.setItem(KEY, token)
  } catch {
    // A blocked or full storage only costs the token, not the page.
  }
}

/** Remove the token from `storage`. A failing removal never breaks the page. */
export function removeToken(storage: StorageLike): void {
  try {
    storage.removeItem(KEY)
  } catch {
    // A blocked storage only costs the token, not the page.
  }
}
