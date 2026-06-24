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
- [System Dependencies](#system-dependencies)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [API Reference](#api-reference)
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

### Setup Instructions

Install the system dependencies listed below, then clone and prepare the workspace:

```sh
git clone https://github.com/hanaessam/testseed.git
cd testseed
npm run setup:dev
```

`npm run setup:dev` installs workspace packages and creates `.env` from `.env.example` when it does not already exist. Fill in the required secrets before starting the app; never commit real values.

At minimum, set these values in `.env` for the full local app:

```env
OPENAI_API_KEY=sk-your-openai-key
MONGODB_URI=mongodb://localhost:27017/testseed
JWT_SECRET=replace-with-a-long-random-string
NEXT_PUBLIC_API_URL=http://localhost:3001
WEB_APP_URL=http://localhost:3000
```

### How to Run the System

Run the app directly on your machine:

```sh
npm run dev
```

Or run the full local stack in Docker:

```sh
OPENAI_API_KEY=sk-your-openai-key npm run dev:docker
```

On Windows PowerShell, set the key before starting Docker:

```powershell
$env:OPENAI_API_KEY="sk-your-openai-key"
npm run dev:docker
```

The Docker stack starts MongoDB, Mailpit, the API, and the web app with lockfile-based `npm ci` installs.

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:3001 |
| API health check | http://localhost:3001/health |
| Mailpit inbox | http://localhost:8025 |
| MongoDB | `mongodb://localhost:27017/testseed` |

Stop Docker services with:

```sh
docker compose down
```

## System Dependencies

- Node.js 20+
- npm 10+
- Docker Desktop with Compose v2, if using `npm run dev:docker`
- MongoDB 7 locally, MongoDB Atlas, or the Docker Compose `mongo` service
- OpenAI API key for AI generation and refinement
- Redis-compatible HTTP endpoint and token for OTP flows; Upstash Redis is the expected production option
- SMTP server for OTP, password reset, and email-change messages; Docker uses Mailpit locally
- GitHub OAuth app credentials only when GitHub login or repository context is enabled

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

Start MongoDB, Mailpit, the API, and the web app in containers. Compose uses the checked-in lockfile through `npm ci`, named `node_modules` volumes, and health checks so every developer starts the same local stack.

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

## API Reference

Base URL for local development: `http://localhost:3001`.

All endpoints except `GET /health` and authentication entry points expect:

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Health

Code locations: `apps/api/src/index.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Confirms the API process is running. |

Example:

```sh
curl http://localhost:3001/health
```

### Account Management

Code locations: `apps/api/src/routes/auth.ts`, `apps/api/src/middleware/auth.ts`, `packages/core/src/auth/`, `packages/db/src/repositories/user-repository.ts`, `apps/web/src/lib/auth-session.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/auth/github` | Starts GitHub OAuth login. |
| `GET` | `/auth/github/callback?code=<code>&state=<state>` | Completes GitHub OAuth login or repository-context authorization. |
| `POST` | `/auth/register/request-otp` | Starts email/password registration and sends an OTP. |
| `POST` | `/auth/register/verify-otp` | Verifies registration OTP and creates the user. |
| `POST` | `/auth/login` | Logs in with email/password and returns a JWT. |
| `POST` | `/auth/logout` | Returns a logout response for client session cleanup. |
| `GET` | `/auth/me` | Reads the current account profile. |
| `PATCH` | `/auth/me` | Updates display name or starts email-change verification. |
| `POST` | `/auth/me/email/verify` | Confirms a pending account email change. |
| `POST` | `/auth/me/password` | Changes the current user's password. |
| `DELETE` | `/auth/me` | Deactivates the account after password and phrase confirmation. |
| `POST` | `/auth/password/forgot` | Sends a password reset OTP. |
| `POST` | `/auth/password/reset` | Completes password reset with OTP. |

Example login:

```sh
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"correct-horse-battery-staple"}'
```

### Project Context Setup

Code locations: `apps/api/src/routes/projects.ts`, `packages/core/src/projects/`, `packages/db/src/repositories/project-repository.ts`, `apps/web/src/lib/api-client.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/projects?includeArchived=false` | Lists the authenticated user's projects. |
| `POST` | `/projects` | Creates a project. |
| `GET` | `/projects/:projectId` | Reads project detail and active schema metadata. |
| `PATCH` | `/projects/:projectId` | Updates project name or description. |
| `DELETE` | `/projects/:projectId` | Archives or hard-deletes a project. |
| `PATCH` | `/projects/:projectId/restore` | Restores an archived project. |
| `PUT` | `/projects/:projectId/context` | Updates plain-language project context or clears repository context. |
| `POST` | `/projects/:projectId/context/github/authorize` | Starts GitHub repository-context authorization. |
| `GET` | `/projects/:projectId/context/github/callback?code=<code>&state=<state>` | Completes repository-context authorization. |
| `DELETE` | `/projects/:projectId/context/github` | Removes saved repository context from a project. |

Example project creation:

```sh
curl -X POST http://localhost:3001/projects \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bookstore API","description":"MongoDB app with users, books, carts, and orders"}'
```

### Manual Schema Input

Code locations: `apps/api/src/routes/schema.ts`, `apps/api/src/routes/projects.ts`, `packages/core/src/schema/`, `packages/core/src/projects/`, `packages/db/src/repositories/project-repository.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/schemas/parse` | Parses pasted schema text or uploaded schema files. |
| `PUT` | `/projects/:projectId/schema` | Saves a reviewed parsed schema snapshot to a project. |
| `DELETE` | `/projects/:projectId/schema` | Archives or hard-deletes the active project schema. |
| `PATCH` | `/projects/:projectId/schema/restore` | Restores the latest archived schema snapshot. |

Example schema parse:

```sh
curl -X POST http://localhost:3001/schemas/parse \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"schemaText":"const UserSchema = new Schema({ email: { type: String, required: true, unique: true } });"}'
```

### MongoDB Schema Discovery

Code locations: `apps/api/src/routes/schema.ts`, `packages/core/src/schema/mongodb-discovery.ts`, `packages/db/src/schema-discovery.ts`, `apps/web/src/lib/api-client.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/schemas/mongodb/test-connection` | Tests a transient MongoDB connection string. |
| `POST` | `/schemas/mongodb/discover` | Inspects collections and samples documents to infer a schema. |

Example discovery:

```sh
curl -X POST http://localhost:3001/schemas/mongodb/discover \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"connectionString":"mongodb://localhost:27017/shop","sampleSize":10}'
```

### AI Seed Generation

Code locations: `apps/api/src/routes/generation.ts`, `packages/core/src/generation/`, `packages/core/src/generation/generate-seed-data.ts`, `packages/core/src/generation/generate-seed-data-progressive.ts`, `apps/web/src/lib/generation-stream.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/projects/:projectId/generation-plan?collectionCounts=<json>` | Computes dependency order and total requested records. |
| `POST` | `/projects/:projectId/generations` | Generates a complete dataset and saves the initial version. |
| `POST` | `/projects/:projectId/generations/stream` | Streams generation progress with Server-Sent Events. |

Example generation:

```sh
curl -X POST http://localhost:3001/projects/<projectId>/generations \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"collectionCounts":{"users":3,"orders":5},"projectContext":"Canadian ecommerce demo data"}'
```

### Feedback-Based Regeneration

Code locations: `apps/api/src/routes/generation.ts`, `packages/core/src/generation/regenerate-with-feedback.ts`, `packages/core/src/generation/refine-generated-dataset.ts`, `packages/core/src/generation/build-refinement-prompt.ts`, `apps/web/src/lib/generation-stream.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/projects/:projectId/generations/regenerate` | Creates a candidate dataset from an accepted dataset plus feedback. |
| `POST` | `/projects/:projectId/generations/refinements` | Applies AI chat refinement or returns guidance. |
| `POST` | `/projects/:projectId/generations/refinements/stream` | Streams refinement tokens and completion with Server-Sent Events. |

Example refinement:

```sh
curl -X POST http://localhost:3001/projects/<projectId>/generations/refinements \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"currentDataset":{...},"message":"Make the product prices more varied","savedDatasetId":"<datasetId>"}'
```

### Preview, Editing, And Dataset Versions

Code locations: `apps/api/src/routes/generation.ts`, `packages/core/src/generation/apply-cell-edit-to-dataset.ts`, `packages/core/src/generation/validate-generated-dataset.ts`, `packages/core/src/generation/save-generated-dataset.ts`, `packages/db/src/repositories/generated-dataset-repository.ts`, `apps/web/src/lib/generation-workbench-state.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/projects/:projectId/dataset-edits` | Applies one table-cell edit and revalidates the dataset. |
| `POST` | `/projects/:projectId/datasets/validate` | Validates a generated dataset against the active schema. |
| `GET` | `/projects/:projectId/generated-datasets` | Lists saved generated dataset versions. |
| `POST` | `/projects/:projectId/generated-datasets` | Saves a valid dataset as a new version. |
| `GET` | `/projects/:projectId/generated-datasets/:datasetId` | Loads one saved dataset version. |
| `PATCH` | `/projects/:projectId/generated-datasets/:datasetId` | Forks an existing saved version after manual edits or refinement. |

Example cell edit:

```sh
curl -X POST http://localhost:3001/projects/<projectId>/dataset-edits \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"schemaSnapshotId":"<schemaSnapshotId>","collectionCounts":{"users":1},"dataset":{...},"edit":{"collectionName":"users","recordId":"507f1f77bcf86cd799439011","fieldName":"email","rawValue":"hana@example.com"}}'
```

### Export

Code locations: `apps/api/src/routes/generation.ts`, `packages/core/src/generation/export-js-seed-script.ts`, `apps/web/src/lib/api-client.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/projects/:projectId/datasets/javascript-seed-script` | Exports a runnable JavaScript seed script from a valid dataset. |

Example seed-script export:

```sh
curl -X POST http://localhost:3001/projects/<projectId>/datasets/javascript-seed-script \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"schemaSnapshotId":"<schemaSnapshotId>","dataset":{...}}'
```

### Direct MongoDB Seeding

Code locations: `apps/api/src/routes/generation.ts`, `packages/core/src/generation/direct-mongodb-seeding.ts`, `packages/core/src/generation/prepare-dataset-ids-for-insertion.ts`, `packages/core/src/generation/remap-dataset-ids-for-insertion.ts`, `packages/core/src/projects/record-seed-batch.ts`, `packages/db/src/repositories/project-history-repository.ts`.

MongoDB connection strings in these requests are used only for the active operation. They are not persisted in seed batch history or project events.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/projects/:projectId/direct-seeding/test-connection` | Tests the target MongoDB connection and returns a connection test token. |
| `POST` | `/projects/:projectId/direct-seeding/confirmation` | Builds the confirmation summary before insertion. |
| `POST` | `/projects/:projectId/direct-seeding` | Inserts or upserts records, tags them with `seedBatchId`, and records seed batch history. |

Example direct seed execution:

```sh
curl -X POST http://localhost:3001/projects/<projectId>/direct-seeding \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"schemaSnapshotId":"<schemaSnapshotId>","connectionString":"mongodb://localhost:27017/shop","connectionTestToken":"<token>","targetDatabaseName":"shop","dataset":{...},"confirmed":true,"savedDatasetId":"<datasetId>"}'
```

### History And Seed Batches

Code locations: `apps/api/src/routes/history.ts`, `packages/core/src/projects/list-project-history.ts`, `packages/core/src/projects/record-seed-batch.ts`, `packages/db/src/repositories/project-history-repository.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/projects/:projectId/history` | Lists project events and seed batches. |
| `POST` | `/projects/:projectId/seed-batches` | Records a seed batch entry from an adapter or integration. |

Example history lookup:

```sh
curl http://localhost:3001/projects/<projectId>/history \
  -H "Authorization: Bearer <jwt>"
```

### Rollback And Re-Seed

Code locations: `apps/api/src/routes/rollback.ts`, `packages/core/src/projects/rollback-seed-batch.ts`, `packages/core/src/projects/apply-seed-batch-version.ts`, `packages/core/src/projects/restore-seed-batch.ts`, `packages/core/src/generation/seed-batch-mongo-snapshot.ts`, `packages/db/src/repositories/project-history-repository.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/projects/:projectId/rollback` | Deletes records by `seedBatchId` from MongoDB and marks the batch rolled back. |
| `POST` | `/projects/:projectId/apply-seed-batch` | Applies a saved seed batch version to MongoDB and supersedes other active batches. |
| `POST` | `/projects/:projectId/restore-seed-batch` | Alias for applying a saved seed batch version. |

Example rollback:

```sh
curl -X POST http://localhost:3001/projects/<projectId>/rollback \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"seedBatchId":"seed_batch_abc123","mongoUri":"mongodb://localhost:27017/shop"}'
```

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
- [Architecture and diagram prompt](docs/architecture.md)
- [Dataset version history](docs/dataset-version-history.md)
- [UI design system](docs/ui-design.md)
- [GitHub auth design](docs/github-auth-design.md)
- [Email OTP auth](docs/auth-email-otp.md)
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
