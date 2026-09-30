/**
 * The message that replaces the eternal "Loading…" on a first visit:
 * ask for the first repository. It shows only while the list is empty;
 * the invalid-repository notice keeps precedence in `renderDetail`.
 */
export function emptyPrompt(repos: string[]): string | null {
  return repos.length === 0 ? 'Enter a repository as owner/name to get started.' : null
}
