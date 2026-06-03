---
name: testseed-security-review
description: Use when reviewing TestSeed changes for secret handling, MongoDB connection string safety, auth boundary risk, logs, environment variables, direct seeding, rollback, or dependency-direction violations.
---

# TestSeed Security Review

Review security-sensitive changes before calling them safe.

## Checklist

1. Confirm no real secrets are added to code, docs, logs, config, examples, or tests.
2. Confirm `.env` remains ignored and `.env.example` contains placeholders only.
3. Confirm MongoDB connection strings are used transiently and never stored.
4. Check logs and error handlers for credential leaks.
5. Check auth boundaries: protected routes require auth, public routes are intentional.
6. Check direct seeding and rollback paths for explicit user intent and scoped deletion.
7. Check dependency direction and forbidden imports.
8. Run targeted tests plus `npx turbo build lint test` when code changed.

## Review Output

Lead with findings ordered by severity. Include file and line references when possible. If no issues are found, say that clearly and name any remaining test or review gaps.

## Guardrails

- Do not weaken auth, direct seeding, rollback, or validation behavior during cleanup.
- Do not print, copy, or persist secrets while investigating.
- Treat AI output as untrusted until validated.
