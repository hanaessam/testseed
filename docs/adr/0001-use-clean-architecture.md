# ADR 0001: Use Clean Architecture

## Status

Accepted

## Context

TestSeed combines UI flows, HTTP routes, authentication, AI generation, MongoDB access, export, direct insertion, and rollback. These concerns change at different speeds and have different testing needs.

## Decision

Use clean architecture with explicit layers:

```text
types -> db -> core -> api -> web
```

Business rules live in `packages/core`. Frameworks and infrastructure stay in adapter layers.

## Consequences

- Core behavior can be tested without Express, Next.js, or Mongoose.
- UI and API code stay thin.
- Shared types become the contract between layers.
- Contributors must reject convenient imports that cross the architecture boundary.
