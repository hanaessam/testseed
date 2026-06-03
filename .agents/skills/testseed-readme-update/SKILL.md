---
name: testseed-readme-update
description: Use when a TestSeed change may affect README setup, build, run commands, environment variables, ports, routes, authentication flows, or user-visible workflows.
---

# TestSeed README Update

Keep setup docs accurate without leaking secrets.

## Workflow

1. Read `README.md`, `.env.example`, `docs/requirements.md`, and relevant feature docs.
2. Update `README.md` when setup, commands, local run steps, ports, routes, external services, auth flows, or user-visible workflows change.
3. Update `.env.example` whenever docs mention a new environment variable.
4. Keep placeholders generic.
5. Keep GitHub setup aligned with `docs/github-auth-design.md`.
6. Run `npx turbo build lint test` before handing work back when implementation changed.

## Guardrails

- Never include real secrets, tokens, connection strings, OAuth secrets, SMTP credentials, Redis credentials, or OpenAI keys.
- Prefer GitHub OAuth App setup for login docs unless repository installation or private repo file access is explicitly in scope.
- Treat future repository file access as separate from login and document fallback to manual schema input or MongoDB discovery.
