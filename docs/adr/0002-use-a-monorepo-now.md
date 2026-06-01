# ADR 0002: Use a Monorepo Now

## Status

Accepted

## Context

The project is early, the team is small, and features often require coordinated changes across shared types, core use cases, API routes, and UI screens.

## Decision

Use a Turborepo monorepo for the current phase. Keep packages separated by responsibility, but manage them in one repository.

## Consequences

- One install and one build command cover the workspace.
- Workspace imports make dependencies explicit.
- Refactors across layers are easier while contracts are still forming.
- A future polyrepo remains possible after package APIs and deployment ownership stabilize.
