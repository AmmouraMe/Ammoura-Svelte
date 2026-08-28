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

`npm run badges` is a thin wrapper over `npm run test:coverage && npm run
badges:update`, and `badges:update` runs `istanbul-badges-readme` followed by
`prettier --write README.md` — the rewritten badge row changes the Markdown
table's column widths, so it needs the Prettier pass to stay lint-clean. Commit
the resulting `README.md` change along with the code that moved the numbers.

## How it works

- `vitest.config.ts` includes `json-summary` in `coverage.reporter`, which writes
  `coverage/coverage-summary.json`.
- `istanbul-badges-readme` reads that file and rewrites the four
  `img.shields.io/badge/...` URLs in `README.md` in place.
- Badge colour is chosen by the tool from the percentage:
  - 🟢 `brightgreen`: ≥ 80%
  - 🟡 `yellow`: 60–80%
  - 🔴 `red`: < 60%

## CI enforces this

The `checks` job in `.github/workflows/ci.yml` regenerates the badges from its
own coverage run and fails the build when the committed values disagree. The
numbers in `README.md` therefore cannot drift, and hand-editing them is caught
on the next pull request.

When that step fails, run `npm run badges` locally and commit `README.md`. See
[docs/CI.md](docs/CI.md).

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
