# Quickstart: Project Context Setup

## Prerequisites

- Fill `.env` with the existing API, web, MongoDB, JWT, SMTP, Redis, and GitHub OAuth values.
- For repository context, keep `GITHUB_CALLBACK_URL` set to the registered GitHub OAuth callback, for example `http://localhost:3001/auth/github/callback`. Repository context uses signed state on that same callback and then redirects back to the project detail page.

## Development Flow

1. Start the app:

   ```sh
   npm run dev
   ```

2. Register or log in.

3. Open `http://localhost:3000/generate`.

4. Enter a project name and description, for example:

   ```text
   E-commerce API
   E-commerce marketplace with customers, products, orders, carts, and reviews.
   ```

5. Optionally enter a GitHub repository URL, then create the project. If a repository was provided, authorize repository context when prompted.

6. Paste or upload Mongoose schema files and click **Analyze schema**.

7. Review the structured schema. Edit the schema input and analyze again if needed.

8. Click **Save schema**.

9. Click **View project details** and confirm the saved project context and schema are visible.

10. Connect or update GitHub repository context from project detail when needed:

   - Enter a repository full name such as `owner/repo`, or paste a GitHub URL such as `https://github.com/owner/repo.git`.
   - Authorize repository access when prompted.
   - Confirm the UI shows a repository context summary and warnings.

11. Remove repository context and confirm future context review returns to description-only context.

## Expected Results

- Empty descriptions show a generic-data warning but do not block setup.
- Repository context is optional.
- Schema analysis does not save a schema snapshot until the user explicitly clicks **Save schema**.
- Unavailable, unauthorized, oversized, or irrelevant repositories show clear warnings and fallback to description-only context.
- Saved project context contains the description, repository summary, warning metadata, and timestamps only.
- Saved project context does not contain GitHub access tokens, raw repository file contents, passwords, database connection strings, or other credential-like values.

## Verification

Run the required repo check before handing work back:

```sh
npx turbo build lint test
```

2026-06-03 implementation note: `npx turbo build lint test` passed. Manual browser OAuth was not exercised in this pass; repository callback behavior is covered by TypeScript contract coverage and core repository-context tests.
