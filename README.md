<div align="center">
  <table>
    <tr>
      <td align="right" valign="middle">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/logo-dark.svg">
          <img src="apps/web/public/logo-light.svg" alt="" width="32" height="64" />
        </picture>
      </td>
      <td align="left" valign="middle">
        <h1 style="margin: 0; padding-left: 12px; font-size: 2.25rem; font-weight: 600; letter-spacing: -0.02em; border: none;">
          Test<span style="color: #16a34a;">Seed</span>
        </h1>
      </td>
    </tr>
  </table>
</div>

**Generate realistic, schema-aware MongoDB seed data with AI — preview it, refine it, version it, export it, or insert it with rollback support.**

TestSeed helps backend and full-stack developers, QA engineers, and student teams skip hand-written seed scripts. Paste a Mongoose schema or discover structure from a live database, generate relational records in dependency order, chat with AI to refine results, then export JSON or a runnable seed script — or insert directly into MongoDB with batch rollback.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Team](#team)

## Features

- **Account workspace** — Register, log in, and keep projects, generations, and seed batches tied to your user.
- **Schema input** — Paste Mongoose schemas manually or discover collections and fields from an existing MongoDB database.
- **AI generation** — OpenAI-powered seed data that respects types, enums, uniqueness, nesting, and ObjectId references.
- **Generation workbench** — Per-collection counts, table preview, **immutable dataset versions**, inline editing, and streamed refinement chat.
- **Dataset version history** — Every generate, refine, and save creates a labeled version; load any version or **re-seed** it to MongoDB after confirmation.
- **Export** — Download JSON or a ready-to-run JavaScript seed script.
- **Direct seeding & rollback** — Insert tagged batches into MongoDB; roll back by `seedBatchId` or apply a different dataset version via re-seed.
- **GitHub context** — Optional repository summaries to improve domain-aware generation.
- **Branded UI** — Theme-aware logos (`logo-light.svg` / `logo-dark.svg`) in the app shell, auth screens, and browser favicon.

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB (local, Atlas, or Docker Compose)
- OpenAI API key

### Install and run

```sh
git clone https://github.com/hanaessam/testseed.git
cd testseed
npm run setup:dev
npm run dev
```

`npm run setup:dev` installs workspace packages and creates `.env` from `.env.example` when it does not already exist. Fill in secrets before starting the app.

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:3001 |

## Development

### Monorepo commands

```sh
npm run dev          # Hot reload for API and web
npm run build        # Build all packages
npm run lint         # Lint all packages
npm test             # Test all packages
npx turbo build lint test   # Full CI check
```

### Docker

Start MongoDB, Mailpit, the API, and the web app in containers:

```sh
npm run dev:docker
docker compose down   # stop
```

### Project layout

```text
apps/
  api/     Express HTTP adapter
  web/     Next.js UI
packages/
  types/   Shared contracts
  db/      Mongoose models and repositories
  core/    Business use cases
```

Dependency direction: `types → db → core → api → web` (web imports `@testseed/types` only).

## Environment Variables

Copy `.env.example` to `.env` at the repository root. Never commit real secrets.

**Core application**

```env
OPENAI_API_KEY=
MONGODB_URI=
JWT_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING=true
NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true
WEB_APP_URL=http://localhost:3000
```

**Email OTP (registration, password reset, email change)**

```env
REDIS_URL=https://your-upstash-redis-url.upstash.io
REDIS_TOKEN=
OTP_TTL_SECONDS=600
OTP_MAX_ATTEMPTS=5
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="TestSeed <no-reply@testseed.local>"
```

**GitHub OAuth (optional)**

Register one OAuth app named **TestSeed** (not “TestSeed Local”) at [GitHub Developer Settings](https://github.com/settings/developers).

| Environment | Homepage URL | Authorization callback URL |
| --- | --- | --- |
| Local | `http://localhost:3000` | `http://localhost:3001/auth/github/callback` |
| Production | `https://testseed-web.vercel.app` | `https://testseed-api.vercel.app/auth/github/callback` |

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
```

The OAuth app **name and callback URLs** are configured in GitHub — not in this repo. Production `GITHUB_CALLBACK_URL` and `WEB_APP_URL` must match on the **API** Vercel project; `NEXT_PUBLIC_API_URL` must match on **Web**.

The web app reads `NEXT_PUBLIC_*` values from the root `.env` through `apps/web/next.config.js`.

## Architecture

TestSeed is a Turborepo monorepo with a strict layered architecture:

- **`@testseed/types`** — Zod schemas and shared API contracts.
- **`@testseed/db`** — MongoDB connection factories and repositories.
- **`@testseed/core`** — Pure business logic; no Express or Mongoose imports.
- **`@testseed/api`** — Express routes, validation, and auth middleware.
- **`@testseed/web`** — Next.js App Router UI; calls the API through `src/lib/api-client.ts`.

Sensitive MongoDB connection strings submitted for discovery or direct seeding are transient — they are used for the active operation only and are not stored.

### Key API surfaces

| Area | Endpoints |
| --- | --- |
| Auth | `/auth/*` |
| Schema discovery | `POST /schemas/mongodb/test-connection`, `POST /schemas/mongodb/discover` |
| Generation | `POST /projects/:id/generations`, refinements, regenerate, saved datasets (versions) |
| Direct seeding | `POST /projects/:id/direct-seeding` (links `savedDatasetId` to seed batch) |
| Rollback | Project-scoped seed batch rollback and apply-version routes |

## Deployment

TestSeed deploys as two Vercel projects from this monorepo:

| Project | Root directory |
| --- | --- |
| Web (`testseed-web` or your project name) | `apps/web` |
| API (`testseed-api` or your project name) | `apps/api` |

Each app has a `vercel.json` with monorepo install and Turbo build commands. GitHub Actions workflows in `.github/workflows/` run `build`, `lint`, and `test` on every push/PR; production deploys use the Vercel CLI with prebuilt output.

Link each app locally (values are written to `apps/*/.vercel/project.json`, which is gitignored):

```sh
cd apps/web && npx vercel link
cd ../api && npx vercel link
```

Keep **local** URLs in `.env` (`localhost:3000` / `localhost:3001`). Use a separate **production** file for deploy sync:

```sh
# 1. Link Vercel projects (once)
cd apps/web && npx vercel link
cd ../api && npx vercel link

# 2. Build .env.production from .env + production URLs + linked project IDs
npm run env:production:init

# 3. Add your Vercel token to .env.production
#    VERCEL_TOKEN=...   (from https://vercel.com/account/tokens)

# 4. Push app secrets to Vercel and deploy secrets to GitHub Actions
npm run env:production:sync

# Optional: also sync preview/development on Vercel
node scripts/sync-production-env.mjs --all-environments

# Audit Vercel env var names (no values printed)
node scripts/audit-vercel-env.mjs
```

Copy `.env.production.example` to `.env.production` if you prefer to fill production values manually instead of `env:production:init`.

Remove secrets that were copied to the wrong Vercel project:

```sh
node scripts/sync-vercel-env.mjs --env-file=.env.production --prune-misplaced
```

**GitHub repository secrets** (set automatically by `env:production:sync` when `gh` is authenticated):

| Secret | Description |
| --- | --- |
| `VERCEL_TOKEN` | Vercel personal or team token |
| `VERCEL_ORG_ID` | Team or user ID from `apps/web/.vercel/project.json` (`orgId`) |
| `VERCEL_WEB_PROJECT_ID` | Web project ID from `apps/web/.vercel/project.json` (`projectId`) |
| `VERCEL_API_PROJECT_ID` | API project ID from `apps/api/.vercel/project.json` (`projectId`) |

App secrets (`MONGODB_URI`, `JWT_SECRET`, `GITHUB_*`, etc.) go to **Vercel** only — not GitHub Actions.

## Documentation

- [**Shipped features**](docs/shipped-features.md) — complete inventory of ready capabilities
- [Contributing guide](CONTRIBUTING.md)
- [Requirements & design](docs/requirements.md)
- [**Shipped features**](docs/shipped-features.md) — complete feature inventory
- [Dataset version history](docs/dataset-version-history.md) (planned design)
- [UI design system](docs/ui-design.md)
- [GitHub auth design](docs/github-auth-design.md)
- [Email OTP auth](docs/auth-email-otp.md)
- [Dataset version history](docs/dataset-version-history.md)
- [Architecture decisions](docs/adr/)
- [Product design notes](DESIGN.md)

## Contributing

We welcome issues, bug reports, and pull requests. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for branch strategy, layer boundaries, and the required check:

```sh
npx turbo build lint test
```

Before opening a PR:

1. Create a feature branch from `main` (e.g. `feature/NN-short-name`).
2. Keep changes focused on one feature or fix.
3. Match existing code style and package dependency rules.
4. Update README or docs when setup, env vars, or user-visible behavior changes.

## Team

Built by Hana, Mariam, Hassan, and Mazen.
