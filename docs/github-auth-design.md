# GitHub Account Auth Direction

## Decision

GitHub account login should use the Express API as the OAuth adapter and return the same JWT-shaped `AuthResponse` used by email/password login.

## Why

TestSeed already protects API routes with JWT middleware. Keeping GitHub auth in Express avoids splitting identity between NextAuth web sessions and API JWTs. The web app should remain a UI client: it starts the GitHub redirect through `src/lib/api-client.ts`, receives the final token after the API callback flow, and stores it the same way as email/password auth.

## Intended Flow

1. Web redirects to `GET /auth/github`.
2. Express redirects to GitHub OAuth with `GITHUB_CLIENT_ID`.
3. GitHub redirects back to `GET /auth/github/callback`.
4. Express exchanges the code using `GITHUB_CLIENT_SECRET`.
5. Express fetches the GitHub profile email.
6. Core resolves or creates a TestSeed user through injected dependencies.
7. Express creates the standard JWT response.
8. Express redirects to the web callback page with the token.
9. The web callback stores the token and redirects the browser to `/dashboard`.

## Environment Variables

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
- `WEB_APP_URL`

## Architecture Rules

- GitHub OAuth HTTP details stay in `apps/api`.
- Account resolution behavior belongs in `packages/core`.
- User persistence stays in `packages/db`.
- Web UI starts auth through `apps/web/src/lib/api-client.ts`.
- `apps/web` must not import `@testseed/core` or `@testseed/db`.
