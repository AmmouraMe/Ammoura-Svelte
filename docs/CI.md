# CI and deployment

Two workflows live in `.github/workflows`.

| Workflow            | Trigger                        | What it does                                |
| ------------------- | ------------------------------ | ------------------------------------------- |
| `ci.yml` — `checks` | Every PR to `main`, and pushes | Lint, `svelte-check`, tests with coverage   |
| `ci.yml` — `deploy` | Push to `main`, after `checks` | Build, migrate production D1, deploy Worker |
| `preview.yml`       | Manual (`workflow_dispatch`)   | Deploy a branch to the `hermes-preview` env |

Node version comes from `.nvmrc`. Change it in one place and both jobs follow.

## Pull request checks

`checks` runs four things:

1. `npm run lint` — `prettier --check .` then `eslint .`.
2. `npm run check` — `svelte-check` against `tsconfig.json`.
3. `npm run test:coverage` — Vitest. Coverage thresholds are enforced in
   `vitest.config.ts` and fail the run on their own.
4. A badge freshness check. See below.

Draft PRs run the checks too. That is the point of opening a draft early
(`CLAUDE.md`, Contribution Workflow).

A new commit cancels the running check for that PR. Pushes to `main` queue
instead, so two deploys never overlap.

### The badge freshness check

The four coverage badges in `README.md` are generated, not hand-written. CI
regenerates them from its own coverage run and fails if the committed values
differ.

When this step fails, run `npm run badges` and commit the `README.md` change.
See [COVERAGE_BADGE_SETUP.md](../COVERAGE_BADGE_SETUP.md).

The badges are rounded to whole percent on purpose. V8 counts branches slightly
differently between Node versions, and at two decimal places that difference
made this check unsatisfiable from any machine not running the runner's Node.

## Deploy

`deploy` runs only on a push to `main`, and only after `checks` passes. It
builds, applies production D1 migrations, then runs `wrangler deploy`.

**Production migrations run here and nowhere else.** Do not run `npm run
db:migrate` against production from a laptop. If the migration step fails, the
job stops before `wrangler deploy` and the Worker already in production keeps
serving.

## Required secrets

Both jobs read repository secrets. Add them under
**Settings → Secrets and variables → Actions**:

| Secret                  | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | API token with `Workers Scripts:Edit` and `D1:Edit`            |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account id that owns `hermes-db` and the Worker |

Create the token at **Cloudflare → My Profile → API Tokens → Create Token**,
starting from the "Edit Cloudflare Workers" template and adding D1 edit rights.
Scope it to the one account. Never put either value in a workflow file.

## Preview deploys

`preview.yml` is manual. Open **Actions → Preview deploy → Run workflow**, pick
the branch, and optionally give a PR number to comment the URL on.

It is manual because the preview environment is shared: it overwrites the
`hermes-preview` Worker and migrates the shared preview D1, so the last branch
to run wins. See [PREVIEW_DATABASE_QUICKREF.md](../PREVIEW_DATABASE_QUICKREF.md).

Fork branches cannot be dispatched this way. Review the code, then run the
preview from a branch in this repository.

## Branch protection

`main` is protected:

- Changes reach it through a pull request. Direct pushes are rejected.
- The **Lint, check and test** status must pass before merge.
- The branch must be up to date with `main` before merging.
- No approving review is required — this is a small team — but the check is.
- Administrators are not exempt, and force pushes and deletion are off.

If the job is renamed in `ci.yml`, update the required status check under
**Settings → Branches** to match the new name. A required check that names a job
nobody runs blocks every merge; a check that names nothing enforces nothing.
