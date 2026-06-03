# API Contract: Project Context Setup

All routes are authenticated unless explicitly noted. Request bodies are validated before handlers call core use cases.

## Update Project Context

`PUT /projects/:projectId/context`

Updates the project description and, optionally, clears repository-derived context.

### Request

```json
{
  "description": "E-commerce marketplace with customers, products, orders, carts, and reviews",
  "clearRepositoryContext": false
}
```

### Response

```json
{
  "project": {
    "id": "project-id",
    "ownerId": "user-id",
    "name": "E-commerce seed project",
    "description": "E-commerce marketplace with customers, products, orders, carts, and reviews",
    "context": {
      "description": "E-commerce marketplace with customers, products, orders, carts, and reviews",
      "repository": null,
      "warnings": [],
      "updatedAt": "2026-06-03T00:00:00.000Z"
    }
  }
}
```

### Validation

- `description` is optional but trimmed.
- Empty description is accepted and returns a generic-data warning.
- Description exceeding the configured limit returns `400`.
- Only the project owner can update context.

## Start GitHub Repository Context Authorization

`POST /projects/:projectId/context/github/authorize`

Starts a one-operation GitHub authorization flow for a target repository.

### Request

```json
{
  "repositoryFullName": "owner/repo"
}
```

### Response

```json
{
  "authorizationUrl": "https://github.com/login/oauth/authorize?...",
  "message": "Authorize repository access to build project context."
}
```

### Validation

- `repositoryFullName` must use `owner/repo` format.
- Only the project owner can start repository context authorization.
- Do not expose GitHub access tokens to the web app.

## GitHub Repository Context Callback

`GET /auth/github/callback`

Completes the one-operation repository context flow after GitHub redirects back to the registered OAuth callback. The callback route distinguishes repository context from account login by verifying the signed `repository_context` state payload.

### Query

```json
{
  "code": "github-oauth-code",
  "state": "signed-project-and-repository-state"
}
```

### Success behavior

The API stores the repository context summary/warnings, discards the GitHub access token, and redirects to the project context review screen for the project ID embedded in signed state.

The web app then reloads project detail and receives context in the existing project response shape:

```json
{
  "context": {
    "description": "E-commerce marketplace with customers, products, orders, carts, and reviews",
    "repository": {
      "provider": "github",
      "repositoryFullName": "owner/repo",
      "repositoryUrl": "https://github.com/owner/repo",
      "accessStatus": "connected",
      "summary": "Repository models and documentation indicate an e-commerce app with products, customers, orders, carts, and reviews.",
      "contextCategories": ["models", "documentation", "domain_terms"],
      "warnings": [],
      "connectedAt": "2026-06-03T00:00:00.000Z"
    },
    "warnings": [],
    "updatedAt": "2026-06-03T00:00:00.000Z"
  }
}
```

### Validation

- Repository must be accessible through the authorized GitHub account.
- Raw repository file contents and access tokens are not persisted.
- Secret-like content is omitted from summaries and represented as warnings.

### Failure behavior

- Unauthorized, unavailable, too-large, empty, and no-useful-context outcomes redirect back to the web app with user-facing warnings and keep description-only context available.
- GitHub access tokens are discarded after the summary or warning result is produced.

## Remove Repository Context

`DELETE /projects/:projectId/context/github`

Removes repository-derived summary and warnings from a project context.

### Response

```json
{
  "context": {
    "description": "E-commerce marketplace with customers, products, orders, carts, and reviews",
    "repository": null,
    "warnings": [],
    "updatedAt": "2026-06-03T00:00:00.000Z"
  }
}
```

### Validation

- Only the project owner can remove repository context.
- Removal must ensure future generation does not use stale repository-derived information.
