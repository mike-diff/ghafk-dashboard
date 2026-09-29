/** The part of `Headers` that the error message reads. */
export interface HeaderLookup {
  get(name: string): string | null
}

/**
 * Build the error message for a failed GitHub API response. A `404` names
 * both causes: the repository does not exist, or it is private and no
 * token was given. A `403` or `429` with `X-RateLimit-Remaining: 0` says
 * that the rate limit was hit and when `X-RateLimit-Reset` says it
 * resets. Any other response returns null, so the caller keeps its
 * generic status message.
 */
export function apiErrorMessage(url: string, status: number, headers: HeaderLookup): string | null {
  if (status === 404) {
    return (
      `GitHub API request to ${url} failed: the repository does not exist ` +
      'or is private and no token was given'
    )
  }
  if ((status === 403 || status === 429) && headers.get('X-RateLimit-Remaining') === '0') {
    const reset = resetTime(headers.get('X-RateLimit-Reset'))
    return reset === null
      ? `GitHub API rate limit hit for ${url}`
      : `GitHub API rate limit hit for ${url}; it resets at ${reset} UTC`
  }
  return null
}

/** Format the epoch-second reset time as `HH:MM:SS`; a missing or bad value is null. */
function resetTime(reset: string | null): string | null {
  if (reset === null) return null
  const seconds = Number(reset)
  if (!Number.isFinite(seconds) || seconds < 0) return null
  return new Date(seconds * 1000).toISOString().slice(11, 19)
}
