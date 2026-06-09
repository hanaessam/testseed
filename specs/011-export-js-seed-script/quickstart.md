# Quickstart: Export JavaScript Seed Script

## Goal

Verify the core use case can generate a deterministic ready-to-run JavaScript seed script from a valid dataset and block invalid reference data.

## Core Verification

1. Add or run focused Jest tests for `packages/core/src/generation/export-js-seed-script.ts`.
2. Provide a valid parsed schema with parent and child collections.
3. Provide a valid generated dataset with ObjectId `_id` values and ObjectId reference fields.
4. Generate the script.
5. Confirm the script:
   - Is CommonJS JavaScript.
   - Uses the MongoDB native driver.
   - Reads `MONGODB_URI`.
   - Includes setup comments.
   - Inserts parent collections before child collections.
   - Uses `ObjectId("...")` for `_id` and reference fields.
   - Contains no drop, delete, or cleanup behavior.
6. Generate the script again with the same input.
7. Confirm the output is byte-for-byte identical.

## Failure Verification

1. Provide a dataset with an unresolved ObjectId reference.
2. Request a script export.
3. Confirm no script is returned.
4. Confirm the error clearly identifies unresolved references as the blocker.

## Scope Verification

Confirm implementation does not require changes to:

- `apps/web/`
- `apps/api/`
- Direct seeding behavior.
- Rollback behavior.
- JSON export behavior.
- Feedback regeneration behavior.
- Preview editing behavior.

## Final Check

Run:

```sh
npx.cmd turbo build lint test
```
