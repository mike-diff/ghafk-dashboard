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

## Status

Early. The work is tracked in the issues.
