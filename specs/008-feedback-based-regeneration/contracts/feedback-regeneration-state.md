# Contract: Workbench Feedback Regeneration State

Defines UI-level contract for feedback regeneration behavior in generation workbench.

## Inputs

- `lastAcceptedDataset`: source dataset for regeneration requests.
- `previewDataset`: currently visible table data.
- `unsavedEditsPresent`: indicator for local edits not part of accepted baseline.

## Rules

1. Submit button is enabled only when:
   - feedback text is non-empty, and
   - no regeneration request is currently in flight.
2. While in flight:
   - show loading state,
   - disable submit,
   - prevent second submit action.
3. On `accepted` success:
   - replace accepted dataset,
   - sync preview dataset to accepted dataset,
   - clear in-flight state.
4. On `partial` or `rejected` result:
   - keep accepted dataset unchanged,
   - keep preview dataset unchanged,
   - show response message.
5. If navigation occurs during in-flight request:
   - abort request,
   - mark outcome as `cancelled`,
   - restore/keep last accepted dataset as active baseline.
6. On transport/provider errors:
   - mark state as `failed`,
   - keep accepted dataset unchanged,
   - show actionable retry guidance.
7. Unsaved preview edits are never sent as regeneration input in this feature scope.

## Lifecycle state mapping

- `idle`: no active submission; input available.
- `submitted`: user submitted feedback and preflight validation passed.
- `in_progress`: request accepted and running.
- `accepted`: validated regenerated dataset accepted and applied.
- `partial`: partial application completed; accepted dataset unchanged.
- `rejected`: request conflicts with constraints; accepted dataset unchanged.
- `cancelled`: in-flight request aborted (for example, navigate away).
- `failed`: transport/provider/runtime failure; accepted dataset unchanged.

## Explicit lifecycle state map

| State | Enter condition | Exit condition | Dataset behavior |
| --- | --- | --- | --- |
| `idle` | No active submit | Submit valid feedback | Preview remains current |
| `submitted` | Feedback passed client preflight | Request dispatch starts | Preview remains current |
| `in_progress` | Request is in flight | One of `accepted`, `partial`, `rejected`, `cancelled`, `failed` | Preview remains current |
| `accepted` | Regeneration returns schema-valid replacement | User continues, then returns to `idle` | Replace accepted and preview datasets |
| `partial` | Regeneration returns non-replacement partial result | User continues, then returns to `idle` | Keep accepted and preview datasets unchanged |
| `rejected` | Regeneration cannot be applied safely | User continues, then returns to `idle` | Keep accepted and preview datasets unchanged |
| `cancelled` | In-flight request aborted (for example, navigation away) | User returns/continues, then `idle` | Keep accepted and preview datasets unchanged |
| `failed` | Transport/provider/runtime failure | Retry or continue, then `idle` | Keep accepted and preview datasets unchanged |

## Out of scope

- Export state behavior changes.
- Direct seeding state behavior changes.
- Rollback flow changes.
