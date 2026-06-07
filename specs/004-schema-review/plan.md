# Implementation Plan: Schema Review

**Branch**: `004-schema-review`
**Spec**: `specs/004-schema-review/spec.md`
**Date**: 2026-06-07

## Summary

Schema Review is implemented as the existing Generate page checkpoint after manual schema parsing or MongoDB schema discovery. The reviewed schema remains the shared `ParsedSchema.collections[]` contract and is saved as the active project schema snapshot after API validation.

## Technical Context

- TypeScript strict monorepo with Turborepo.
- Existing `@testseed/types` schema contracts already model collections, fields, confidence, warnings, nested children, array item types, enum source, and reference confidence.
- Core owns schema parsing, MongoDB discovery, and project snapshot use cases.
- API owns Express route validation and authentication checks.
- Web owns Generate page interaction and may import only `@testseed/types`.

## Constitution Check

- No business logic added to `apps/`; web changes only edit the already reviewed `ParsedSchema` payload.
- No MongoDB connection strings are stored in state beyond the operation input field or sent in save-schema payloads.
- `packages/core` remains free of Express, Next.js, and Mongoose imports.
- Dependency direction is preserved.

## Implementation Phases

1. Preserve evidence metadata from schema sources.
   - Manual parser tags declared enums as `enumSource: "declared"`.
   - Manual parser tags explicit refs as `refConfidence: "explicit"`.
   - MongoDB discovery preserves confidence, warnings, nested fields, item types, inferred enums, inferred refs, sample counts, and collection warnings.

2. Validate reviewed schema snapshots at the API boundary.
   - Expand `PUT /projects/:projectId/schema` Zod validation to include recursive nested fields.
   - Accept field review metadata and collection review metadata.
   - Continue rejecting malformed payloads and unauthenticated requests.

3. Add limited Generate page review edits.
   - Editable: field type, required flag, non-explicit ref, inferred enum-like values, field warnings.
   - Read-only: field/collection names, uniqueness, defaults, declared enums, explicit refs.
   - Unsupported: add/remove fields and collections.

4. Prove persistence.
   - Core tests assert reviewed metadata is saved exactly as submitted.
   - Parser tests assert declared enum/ref evidence is tagged.
   - Existing discovery tests cover inferred metadata and warnings.

## Risks

- Recursive schema validation can accidentally drop metadata if not modeled explicitly.
- UI controls must avoid implying full schema authoring.
- Declared manual evidence must remain stronger than inferred editable evidence.

## Verification

Run:

```sh
npx turbo build lint test
```

