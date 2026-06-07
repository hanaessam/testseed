# Implementation Plan: MongoDB Schema Discovery

**Branch**: `003-mongodb-schema-discovery`
**Spec**: `specs/003-mongodb-schema-discovery/spec.md`
**Date**: 2026-06-07

## Summary

MongoDB Schema Discovery is an authenticated, transient inspection flow on the Generate page. TestSeed tests a submitted MongoDB connection string, temporarily inspects collections, samples up to 20 documents per collection, infers a reviewable `ParsedSchema`, and leaves the result transient until the user explicitly saves it as the project schema snapshot.

## Technical Context

- TypeScript strict monorepo with Turborepo.
- Shared schema contracts live in `packages/types`.
- Core inference logic lives in `packages/core` and receives a dependency-injected inspector.
- Mongoose connection handling lives in `packages/db`.
- Express routes in `apps/api` validate requests, call core use cases, and sanitize errors.
- The Generate page in `apps/web` calls API-client functions and stores connection strings only in local input state.

## Constitution Check

- Core remains framework-free and database-free.
- DB package receives connection strings only as function parameters and closes temporary connections.
- API routes do not store connection strings or return raw driver errors.
- Web imports only `@testseed/types` from workspace packages.
- No new environment variables, migrations, or external services are required.

## Implementation Phases

1. Shared contracts
   - Keep request-only `connectionString`.
   - Preserve discovery metadata on collections and fields.
   - Add sanitized connection error categories.

2. Core and DB inspection
   - Normalize effective sample size to 1-20, defaulting to 20.
   - Inspect collections through an injected inspector.
   - Fetch one extra DB document internally to detect when the sample cap was reached.
   - Infer fields, nested children, arrays, possible refs, confidence, and warnings.

3. API and web flow
   - Provide authenticated test/discover endpoints.
   - Return safe category-based errors.
   - Show loading states, success messages, sample counts, warnings, and discovered schema metadata.
   - Require explicit schema save after review.

4. Verification
   - Add focused core tests for sampling, warnings, inference, and reference metadata.
   - Add API compile contract coverage for route and error helpers.
   - Run `npx turbo build lint test`.

## Risks

- Raw MongoDB errors can leak host/user details if passed through directly.
- Sampled inference can be mistaken for formal schema if warnings are hidden.
- Fetching all documents would be slow and risky on large databases.

