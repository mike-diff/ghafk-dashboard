/**
 * The repository list of the page lives in the URL as repeated `repo`
 * parameters, for example `?repo=a/b&repo=c/d`, so a view can be shared
 * by link.
 */

/** Read every `repo` parameter of `url`, in URL order. */
export function parseRepos(url: URL): string[] {
  const repos: string[] = []
  for (const value of url.searchParams.getAll('repo')) {
    const repo = value.trim()
    if (repo === '' || repos.includes(repo)) continue
    repos.push(repo)
  }
  return repos
}

/** The `owner/name` shape: one slash, and each part holds only allowed characters. */
const REPO_SHAPE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/

/** Tell whether `repo` is one `owner/name` of the allowed shape. */
export function isValidRepo(repo: string): boolean {
  return REPO_SHAPE.test(repo)
}

/** Serialize `repos` into query text like `repo=a/b&repo=c/d`. */
export function reposQuery(repos: string[]): string {
  return repos.map((repo) => `repo=${encodeValue(repo)}`).join('&')
}

/** Encode one value; a slash stays literal because a query may hold it. */
function encodeValue(repo: string): string {
  return encodeURIComponent(repo).replaceAll('%2F', '/')
}
