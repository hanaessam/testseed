# Research: Direct Seeding Integration

**Feature**: spec-014 Direct Seeding Integration

**Date**: 2026-06-23

---

## Decision 1: Reuse Core Functions from Specs 012 and 013 Without Modification

**Decision**: The integration spec introduces no new business logic. All seeding and rollback logic lives in `packages/core` and was built and tested in specs 012 and 013.

**Rationale**: Altering core functions to satisfy an integration spec would violate the principle that spec concerns belong at the right layer. Integration work belongs in the API route (thin adapter) and web UI (component connectivity), not in core.

**Alternatives considered**:
- Consolidate seeding and rollback into a single core function — rejected; they are distinct operations with different lifecycles and user actions
- Add a new core orchestration function that wraps both — rejected; unnecessary abstraction for an integration that is already working

---

## Decision 2: Export Drawer Is the Primary UI Surface for Direct Seeding

**Decision**: The direct seeding user journey starts from the export drawer in the generation workbench, gated by `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true`.

**Rationale**: The export drawer already exists with JSON, JS script, and Direct MongoDB Seed tabs. Gating it with an environment variable allows the feature to be toggled for course project review without removing the implementation.

**Alternatives considered**:
- Inline seeding button in the generation workbench table — rejected; it conflates preview with seeding and adds noise to the main UI
- Separate seeding page — rejected; the export drawer pattern is already established and keeps seeding adjacent to the data the user is reviewing

---

## Decision 3: Seed Batch Recording Is an API Route Responsibility After Core Returns

**Decision**: The `POST /projects/:projectId/direct-seeding` route calls `seedMongoDataset` from core, then immediately records the result by calling the seed batch repository. Core does not record; the route owns the post-seeding side effect.

**Rationale**: Core must remain free of `@testseed/db` imports (architecture rule). Persistence is an adapter responsibility. The route receives the `DirectSeedingReport` from core and uses it to populate the seed batch record in TestSeed's own MongoDB.

**Alternatives considered**:
- Pass the repository as a dependency into `seedMongoDataset` — rejected; it would require core to know about `@testseed/db` types or use a looser interface, adding unnecessary coupling for what is a post-hoc persistence step
- Record seed batch in a separate follow-up API call from the web — rejected; the record must be created atomically with the seeding result at the API layer to prevent lost batches on client failure

---

## Decision 4: Rollback UI Lives in the Project History Tab, Not the Generation Workbench

**Decision**: Users navigate to the project History tab to see seed batches and trigger rollback via `seed-batches-panel.tsx`. Rollback is not accessible from the generation workbench.

**Rationale**: Rollback is a project-level management action, not a generation workflow action. Keeping it in the project detail / history view matches the mental model where users review what was inserted and decide to roll back.

**Alternatives considered**:
- Show rollback in the export drawer alongside the insertion report — considered; rejected because the export drawer is ephemeral (session-scoped) while rollback needs to apply to historical batches the user may return to days later
- Show rollback anywhere after viewing the seeding report — rollback-eligible batches are visible from any session via the History tab

---

## Decision 5: Connection String Security Is Verifiable by Structural Inspection

**Decision**: No runtime firewall or content-scanning middleware is needed to enforce the no-connection-string constraint. Structural inspection (DB model fields, API response types, core function signatures) is sufficient for verification.

**Rationale**: The constraint is enforced by design: core functions never accept connection strings as a parameter they would store, and types never include a `connectionString` field in stored/returned shapes. Verification is a code review + type check, not a runtime concern.

**Alternatives considered**:
- Add middleware to scan response bodies for connection string patterns — over-engineered for the actual threat surface; the types already guarantee the constraint
- Add DB-level field blocklist — unnecessary; Mongoose schema for `seed_batches` and `project_events` simply does not include a field for connection strings
