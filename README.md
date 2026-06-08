# TestSeed

TestSeed is a web application that helps developers generate realistic, schema-aware MongoDB seed data with AI, preview and refine it, export it, or insert it directly into a database with rollback support.

## Quick Start

```sh
git clone <repository-url>
cd testseed
npm run setup:dev
npm run dev
```

`npm run setup:dev` installs all workspace packages and creates `.env` from `.env.example` when it does not already exist. Fill in local secrets before starting the app.

The web app runs on `http://localhost:3000`. The API runs on `http://localhost:3001`.

## Realtime Development

Use the monorepo dev command for local hot reload:

```sh
npm run dev
```

The API uses Nodemon to restart when TypeScript files change. The web app uses the Next.js dev server for browser hot reload.

## Docker Development

Start MongoDB, the API, and the web app in containers:

```sh
npm run dev:docker
```

Docker Compose mounts the repository into the API and web containers, so code changes are picked up while the services are running. The Compose MongoDB service uses `mongodb://mongo:27017/testseed` inside the API container and stores data in a named Docker volume.

Stop the containers with:

```sh
docker compose down
```

## Build, Lint, and Test

Run the full project check before handing work back:

```sh
npx turbo build lint test
```

Useful focused commands:

```sh
npm run build
npm run lint
npm test
```

## Environment

Create `.env` from `.env.example` and fill only local development values. Do not commit real secrets.

Required for the main app:

```env
OPENAI_API_KEY=
MONGODB_URI=
JWT_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:3001
WEB_APP_URL=http://localhost:3000
```

Required for email verification, password reset, and account email-change codes:

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

Required when implementing or testing GitHub login:

```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
WEB_APP_URL=http://localhost:3000
```

## Running Locally

Start the whole monorepo:

```sh
npm run dev
```

The API uses `NEXT_PUBLIC_API_URL` as the web client's backend target. Keep MongoDB connection strings, OAuth secrets, SMTP credentials, and Redis tokens transient and out of source control.

## MongoDB Schema Discovery

From the Generate screen, create or load a project, then use the MongoDB Schema Discovery panel to test a connection string and infer schema structure from existing collections and sample documents.

The API exposes:

- `POST /schemas/mongodb/test-connection`
- `POST /schemas/mongodb/discover`

Connection strings submitted for discovery are operation-only inputs. TestSeed opens a temporary connection, lists collections, samples up to 20 documents per collection, closes the connection, and returns inferred fields, nested objects, arrays, possible references, sample counts, and uncertainty warnings. The connection string is not saved as project context, schema metadata, or configuration.

Discovery results stay transient until you review and explicitly save the schema. Connection failures are shown as sanitized categories such as invalid format, unreachable host, authentication failed, or timeout; raw MongoDB driver errors are not shown to the user.

## AI Seed Generation

OpenAI is the generation provider for AI seed data. Keep `OPENAI_API_KEY` in `.env`; the web app never calls OpenAI directly and the key must stay server-side.

From the Generate screen:

1. **Setup wizard** (new projects): create project, optional GitHub context, schema input, review, and save schema.
2. **Generation workbench**: set per-collection counts, generate seed records, preview tables, and refine with the agent dock chat.
3. **Saved runs**: each successful generation or refinement is stored with collection counts, generated data, and refinement chat history. Select a saved run in the left rail to restore preview and chat.
4. Use refinement for targeted edits (email domains, locale, names, numeric variance) — responses stream in the agent dock.

The API exposes:

- `POST /projects/:projectId/generations`
- `POST /projects/:projectId/generations/refinements` (optional `savedDatasetId` to attach chat updates to the active run)
- `GET /projects/:projectId/generated-datasets`
- `GET /projects/:projectId/generated-datasets/:datasetId`

TestSeed validates every generated or refined dataset before accepting it. Parent collections must come before child collections, ObjectId references must point to generated parent records, and values must respect required fields, field types, enum values, uniqueness, arrays, nested fields, and references. Rejected chat refinements leave the current valid dataset unchanged.

## GitHub Account and Repository Access

For the current GitHub login work, create a **GitHub OAuth App**, not a GitHub App. A GitHub App is only needed later if TestSeed adds install-based private repository access for schema/model context.

Create the OAuth App in GitHub:

1. Go to `Settings -> Developer settings -> OAuth Apps -> New OAuth App`.
2. Use `TestSeed Local` as the application name.
3. Use `http://localhost:3000` as the homepage URL.
4. Use `http://localhost:3001/auth/github/callback` as the authorization callback URL.
5. Copy the generated client ID and client secret into your local `.env`.

Local `.env` values:

```env
GITHUB_CLIENT_ID=<your client id>
GITHUB_CLIENT_SECRET=<your client secret>
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
WEB_APP_URL=http://localhost:3000
```

GitHub account login should be implemented through the Express API, not directly through the web app. The intended flow is:

1. The web app redirects to `GET /auth/github`.
2. The API redirects to GitHub OAuth.
3. GitHub redirects back to `GET /auth/github/callback`.
4. The API exchanges the code, fetches the GitHub profile email, and calls core account resolution logic.
5. The API creates the same JWT used by email/password login.
6. The API redirects to the web callback page, which stores the token and sends the browser to `/dashboard`.

Repository context is separate from GitHub account login. Login continues to use the identity-only `/auth/github` flow, while project context uses a one-operation repository authorization from the project detail screen.

For repository context:

- Users provide an `owner/repo` repository name or paste a GitHub repository URL; `.git` suffixes are normalized before authorization.
- The API requests repository access only for that context operation through the same registered `GITHUB_CALLBACK_URL` used by GitHub login.
- The callback route reads the signed repository-context state, extracts context, and redirects back to the project detail page.
- TestSeed uses OpenAI, when `OPENAI_API_KEY` is configured, to summarize useful repository code and README/docs into project domain context.
- TestSeed stores only the generated repository summary, detected context categories, warnings, repository identity, and timestamps.
- GitHub access tokens and raw repository file contents must be discarded after the operation and must not be stored in MongoDB, logs, local files, or project events.
- Manual schema input and MongoDB schema discovery remain available when repository context is unavailable, unauthorized, too large, or not useful.

## Project Docs

- [Design](DESIGN.md)
- [Web UI design context](docs/ui-design.md)
- [GitHub auth direction](docs/github-auth-design.md)
- [Email OTP registration and account recovery](docs/auth-email-otp.md)
- [Contributing](CONTRIBUTING.md)
- [Architecture decisions](docs/adr/)
- [Requirements](docs/requirements.md)
