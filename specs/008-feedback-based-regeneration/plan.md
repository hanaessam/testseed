# Implementation Plan: Feedback-Based Regeneration

**Branch**: `008-feedback-based-regeneration` | **Date**: 2026-06-08 | **Spec**: `specs/008-feedback-based-regeneration/spec.md`

**Input**: Feature specification from `specs/008-feedback-based-regeneration/spec.md`

## Summary

Add feedback-based regeneration to the existing generation workbench as an iterative generation operation. The backend accepts the previous accepted generated dataset plus feedback comments, project context, schema context, and collection counts, regenerates with existing AI infrastructure, validates against schema constraints, and returns one of four canonical outcome modes: `accepted`, `partial`, `rejected`, or `cancelled`. The frontend adds feedback input, single in-flight request handling, lifecycle state mapping, loading state, and success/error feedback while preserving the currently accepted dataset until regeneration succeeds.

## Technical Context

**Language/Version**: TypeScript strict, Node.js 20+, React 18, Next.js 14, Express 4

**Primary Dependencies**: `@testseed/types`, `@testseed/core`, `@testseed/db`, Zod 3, existing generation/refinement use cases and workbench components

**Storage**: Existing generated dataset persistence in MongoDB via repository layer; no new persistence system

**Testing**: Turborepo workspace tests (`npx.cmd turbo build lint test`), plus explicit feature-level core unit tests, API contract/integration tests, and web UI behavior tests where existing harness patterns allow

**Target Platform**: Web app (`apps/web`) + API service (`apps/api`) in existing monorepo

**Project Type**: Monorepo web application with clean architecture layering

**Performance Goals**: Feedback submit enters loading state immediately; regeneration response and UI state transition remain usable for demo-sized datasets (up to 500 records)

**Constraints**:
- Preserve dependency direction: `packages/types -> packages/db -> packages/core -> apps/api -> apps/web`
- No business logic in `apps/web`
- Keep one regeneration request in flight; disable submit while loading
- On navigation away, cancel in-flight regeneration and keep last accepted dataset
- Unsaved manual edits remain in preview only; regeneration input is last accepted dataset
- Preserve regeneration input context explicitly: project context, schema context, collection counts, and previous accepted generated dataset
- Do not modify export, direct seeding, or rollback behavior

**Scale/Scope**: Existing generation workbench flow only; feature covers feedback submission, orchestration, validation outcome handling, and UI status messaging

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status |
| --- | --- |
| Layer dependency direction enforced | Pass |
| No business logic in app layer | Pass |
| Core remains framework-agnostic (no Express/Next/Mongoose) | Pass |
| Sensitive connection strings not stored/logged | Pass |
| Reuse existing generation infrastructure where possible | Pass |

No blocking constitution violations detected.

## Phase 0 Research Output

Key decisions are captured in `research.md`:
- Regeneration is modeled as a generation operation using accepted dataset snapshot + feedback prompt.
- Single in-flight request model is mandatory to prevent state races.
- UI source-of-truth remains last accepted dataset until validated regeneration succeeds.
- Navigation away cancels active regeneration via abort semantics.
- Lifecycle UI states are explicitly mapped as: `idle`, `submitted`, `in_progress`, `accepted`, `partial`, `rejected`, `cancelled`, `failed`.

All prior technical unknowns are resolved with no remaining `NEEDS CLARIFICATION` markers.

## Project Structure

### Documentation (this feature)

```text
specs/008-feedback-based-regeneration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── feedback-regeneration-api.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/types/src/
└── generation.ts                          # request/response contracts for regeneration status/outcome

packages/core/src/generation/
├── regenerate-with-feedback.ts            # NEW orchestration use case
├── validate-generated-dataset.ts          # reused for acceptance gate
└── __tests__/
    └── regenerate-with-feedback.test.ts

apps/api/src/routes/
├── generation.ts                          # add feedback regeneration endpoint
└── routes/__tests__/
    └── feedback-regeneration.contracts.test.ts

apps/web/app/generate/
└── page.tsx                               # feedback state management and request lifecycle

apps/web/components/generation/
├── generation-workbench.tsx               # feedback box wiring + loading/disabled state
└── agent-dock.tsx                         # feedback input UX (iterative generation operation)

apps/web/src/lib/
└── api-client.ts                          # feedback regeneration client call + abort support
```

**Structure Decision**: Keep existing monorepo architecture and extend only the types/core/api/web paths already responsible for generation workbench behavior.

## Phase 1 Design Artifacts

- `data-model.md`: Defines feedback prompt, regeneration request lifecycle, context preservation fields, canonical modes (`accepted`, `partial`, `rejected`, `cancelled`), and state transitions.
- `contracts/feedback-regeneration-api.md`: Defines request/response contract and canonical outcome modes (`accepted`, `partial`, `rejected`, `cancelled`).
- `quickstart.md`: End-to-end manual and API verification flow for iterative regeneration in workbench.

## Post-Design Constitution Re-Check

| Rule | Status |
| --- | --- |
| Dependency direction preserved in planned file placements | Pass |
| Business rules stay in core/api adapters | Pass |
| Export/direct seeding/rollback untouched by this feature scope | Pass |
| Validation gate reused as single source of truth | Pass |

Design remains constitution-compliant.

## Complexity Tracking

No constitution violations requiring justification.

## Next Steps

1. Run `/speckit-tasks` to generate task breakdown.
2. Implement in dependency order: `types -> core -> api -> web`.
3. Execute verification command: `npx.cmd turbo build lint test`.
