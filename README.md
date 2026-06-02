# TestSeed

TestSeed is a web application that helps developers generate realistic, schema-aware MongoDB seed data with AI, preview and refine it, export it, or insert it directly into a database with rollback support.

## Quick Start

```sh
git clone <repository-url>
cd testseed
npm install
copy .env.example .env
npx turbo dev
```

On macOS or Linux, use `cp .env.example .env`.

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

Required for email OTP registration:

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

Repository file access is a separate future feature from login. Add it behind explicit repository authorization and keep graceful fallback to manual schema input or MongoDB schema discovery when a repository is private, unavailable, too large, or lacks useful schema files.

## Project Docs

- [Design](DESIGN.md)
- [Web UI design context](docs/ui-design.md)
- [GitHub auth direction](docs/github-auth-design.md)
- [Email OTP registration](docs/auth-email-otp.md)
- [Contributing](CONTRIBUTING.md)
- [Architecture decisions](docs/adr/)
- [Requirements](docs/requirements.md)
