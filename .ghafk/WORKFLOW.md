---
label: agent
egress: cdn.playwright.dev playwright.download.prss.microsoft.com
checks: pnpm install --frozen-lockfile && pnpm test && pnpm build
---

Rules for this repository:
- TypeScript, strict. No `any`.
- No runtime dependencies. Charts are inline SVG built from strings.
  Ask before adding any dependency; dev dependencies for tests are fine.
- Keep DOM code thin. Put parsing, fetching and summarizing in small
  modules under `src/` with vitest tests next to them (`*.test.ts`).
- Test fixtures must never contain a real harness or model name. Use
  `<harness> <model>` where a card records one.
- Keep `pnpm-lock.yaml` in sync when `package.json` changes.
