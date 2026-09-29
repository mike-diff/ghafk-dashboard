# ghafk dashboard

A static web page that shows how [ghafk](https://github.com/mike-diff/ghafk)
worked the issues of a repository: which issues merged on the first try,
how many repair rounds they needed, where they parked and why, how long
each step took and how many tokens it used.

The published dashboard lives at
https://mike-diff.github.io/ghafk-dashboard/.

ghafk keeps its state for each issue in a card comment on the issue (a
hidden `<!-- ghafk:state ... -->` line with gzip-compressed, base64-encoded
JSON). The dashboard reads those cards from the GitHub API in the browser.
There is no server.

## Goals

- A single static page that GitHub Pages can host.
- Works for any public repository without a token; a token is optional,
  kept in the browser only, and needed for private repositories.
- No chart library: charts are plain inline SVG.

## Develop

```sh
pnpm install
pnpm dev
pnpm test
```

## Test

`pnpm test` runs the vitest unit tests and then one Playwright smoke
test (`test:e2e` runs it alone). The smoke test builds the page, serves
`dist` with `vite preview`, stubs the GitHub API with `page.route`,
enters a repository and checks that the summary and the table render.

The smoke test drives the system Chrome headless, so Chrome must be
installed. It downloads no browser, and GitHub Actions runners ship
Chrome.

## Status

Early. The work is tracked in the issues.
