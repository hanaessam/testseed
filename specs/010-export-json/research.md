# Research: Export Generated Data as JSON

## Decision: Treat Export JSON as Already Implemented

**Rationale**: Latest code analysis found an existing export drawer that copies and downloads JSON from the active generated dataset, uses collection names as top-level JSON grouping, and disables export actions when the active dataset is invalid or has blocking validation errors.

**Alternatives considered**:

- Build a new export service: rejected because the current JSON export behavior is already client-side and satisfies the story.
- Add a new export endpoint: rejected because the story is manual JSON export from the active preview, and no backend export gap was found.
- Modify direct seeding or rollback: rejected as unrelated scope.

## Decision: Verify Feature Flag Behavior Explicitly

**Rationale**: The export surface is visible only when `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT === "true"`. The plan must record that the feature is implemented but deployment visibility depends on configuration.

**Alternatives considered**:

- Enable the flag in code by default: rejected because the user requested no implementation changes unless verification finds a real gap.
- Ignore the flag: rejected because it affects whether users can see the implemented export surface.

## Decision: Scope Verification to Existing Workbench Export Files

**Rationale**: The behavior is implemented in the web workbench. Verification should inspect the export drawer, workbench mounting, generate page flag wiring, and validation summary.

**Alternatives considered**:

- Inspect or modify feedback regeneration: rejected as explicitly out of scope.
- Inspect or modify direct seeding and rollback: rejected as explicitly out of scope.
- Inspect preview editing implementation beyond validation inputs: rejected unless export verification reveals a dependency issue.
