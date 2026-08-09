# Coverage Badges

The README carries four coverage badges (statements, branches, functions, lines).
They are generated from the local coverage report by
[`istanbul-badges-readme`](https://github.com/olavoparno/istanbul-badges-readme)
and committed as plain Markdown, so they render on the GitHub repo page without
any external service, secret, or gist.

## Regenerating the badges

```bash
# Run the test suite with coverage, then rewrite the badges in README.md
npm run badges

# Or, if you already have a fresh ./coverage report, just rewrite the badges
npm run badges:update
```

`npm run badges` is a thin wrapper over `npm run test:coverage &&
istanbul-badges-readme`. Commit the resulting `README.md` change along with the
code that moved the numbers.

## How it works

- `vitest.config.ts` includes `json-summary` in `coverage.reporter`, which writes
  `coverage/coverage-summary.json`.
- `istanbul-badges-readme` reads that file and rewrites the four
  `img.shields.io/badge/...` URLs in `README.md` in place.
- Badge colour is chosen by the tool from the percentage:
  - 🟢 `brightgreen`: ≥ 80%
  - 🟡 `yellow`: 60–80%
  - 🔴 `red`: < 60%

The rewritten table stays Prettier-clean, so `npm run lint` passes immediately
after regenerating.

## Automating it

There is currently no GitHub Actions workflow in this repository, so the badges
only refresh when someone runs `npm run badges` locally and commits the result.

To automate it, add a workflow that runs `npm run badges` on pushes to `main` and
commits the README change back (or fails the build when the badges are stale).
That is a repository-configuration decision and is intentionally left out here.

## Troubleshooting

- **Badges show `0%` or do not change** — make sure `coverage/coverage-summary.json`
  exists. It is only written when `coverage.reporter` in `vitest.config.ts`
  includes `json-summary`.
- **`istanbul-badges-readme` reports it cannot find the readme hashes** — the four
  badge lines must remain in `README.md` in the
  `![Statements](https://img.shields.io/badge/statements-...)` form. Do not remove
  them; the tool rewrites them in place.
- **`npm run test:coverage` fails on thresholds** — coverage thresholds are
  enforced in `vitest.config.ts` (`lines`/`functions`/`statements` 80,
  `branches` 75). Fix coverage first; the badges reflect whatever the run produced.
