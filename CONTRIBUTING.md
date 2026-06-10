# Contributing to TestSeed

Thank you for helping improve TestSeed. This guide covers how to set up the project, where code belongs, and what we expect in pull requests.

## Code of Conduct

Be respectful in issues and reviews. Focus feedback on the code and the problem being solved.

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- OpenAI API key and MongoDB for full local testing
- Optional: Docker for `npm run dev:docker`

## Getting Started

```sh
git clone https://github.com/hanaessam/testseed.git
cd testseed
npm run setup:dev
```

Copy environment values from `.env.example` into `.env` at the repository root. Do not commit secrets.

Start the development stack:

```sh
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

Run the full project check before opening a PR:

```sh
npx turbo build lint test
```

## Branch Strategy

| Branch | Purpose |
| --- | --- |
| `main` | Stable, reviewed work |
| `develop` | Integration branch for completed features |
| `feature/NN-name` | One feature per branch (`NN` = task number) |

## Pull Request Guidelines

1. **One feature per PR** — keep diffs reviewable.
2. **Explain the layer** — note whether changes touch `types`, `db`, `core`, `api`, or `web`.
3. **Pass CI checks** — `npx turbo build lint test` must succeed.
4. **Update docs** — change `README.md`, `.env.example`, or feature docs when setup or behavior changes.
5. **No secrets** — never commit `.env`, tokens, connection strings, or API keys.

### UI changes

Read [docs/ui-design.md](docs/ui-design.md) before changing layouts or styling. Use semantic tokens (`bg-surface`, `text-muted`, `bg-accent`) rather than raw palette colors.

Brand assets live in `apps/web/public/`:

- `logo-light.svg` — sidebar and auth wordmark in light mode
- `logo-dark.svg` — sidebar and auth wordmark in dark mode

## Where Code Belongs

| Layer | Location | May import |
| --- | --- | --- |
| Contracts | `packages/types` | nothing from `@testseed/*` |
| Data access | `packages/db` | `@testseed/types` |
| Business logic | `packages/core` | `@testseed/types` |
| HTTP adapter | `apps/api` | `@testseed/types`, `@testseed/db`, `@testseed/core` |
| UI | `apps/web` | `@testseed/types` only |

**Reject in review:**

- Business logic in `apps/`
- `@testseed/core` or `@testseed/db` imports in `apps/web`
- Relative cross-package imports (use `@testseed/*` workspace packages)
- Stored MongoDB connection strings
- Module-level singletons in `packages/db`

## AI-Assisted Workflow

For larger features, the team uses Spec Kit:

```text
/speckit-specify
/speckit-tasks
/speckit-implement
```

Read the relevant `AGENTS.md` before changing a layer:

- Repository root: `AGENTS.md`
- `apps/api/AGENTS.md`
- `apps/web/AGENTS.md`

## Deployment Notes

Vercel projects `testseed-web` and `testseed-api` map to `apps/web` and `apps/api`. Deployment workflows live in `.github/workflows/`. Contributors do not need Vercel access for most PRs — maintainers handle production env sync.

## Questions

Open a GitHub issue for bugs, feature ideas, or setup problems. Include reproduction steps and relevant logs when reporting bugs.
