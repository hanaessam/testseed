---
name: testseed-readme-update
description: Use when any TestSeed change may affect README setup, build, run, environment variables, ports, routes, authentication flows, or user-visible workflows
---

# TestSeed README Update

Use this workflow for documentation-sensitive changes:

1. Read `README.md`, `.env.example`, `docs/requirements.md`, and any relevant feature docs before editing.
2. Update `README.md` when a change affects setup, commands, local run steps, ports, routes, external services, authentication flows, or user-visible workflows.
3. Update `.env.example` whenever `README.md` mentions a new environment variable.
4. Keep placeholder values generic. Never include real secrets, tokens, connection strings, OAuth secrets, SMTP credentials, or Redis credentials.
5. Keep GitHub setup instructions aligned with `docs/github-auth-design.md`.
6. For GitHub login docs, prefer GitHub OAuth App setup unless repository installation or private repository file access is explicitly in scope.
7. For future repository file access docs, separate it from login and call out graceful fallback to manual schema input or MongoDB discovery.
8. Run `npx turbo build lint test` before handing work back.
