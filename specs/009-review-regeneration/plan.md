# Implementation Plan: Reviewable Feedback Regeneration

**Branch**: `009-review-regeneration` | **Date**: 2026-06-09 | **Spec**: `specs/009-review-regeneration/spec.md`

**Input**: Feature specification from `specs/009-review-regeneration/spec.md`

## Summary

Extend the shipped feedback regeneration flow from `008-feedback-based-regeneration` so regenerated output is treated as a reviewable candidate before it replaces the accepted dataset. The existing regeneration API, `regenerateWithFeedback` core use case, workbench state, validation gate, lifecycle messaging, and accepted dataset handling remain the foundation. This feature adds only the missing candidate review/compare/accept behavior: candidate state, one automatic retry for fixable duplicate unique values or invalid references, compare summary metadata, accept/reject transitions, and abandonment behavior when the user leaves the workbench.

## Technical Context

**Language/Version**: TypeScript strict, Node.js 20+, React 18, Next.js 14, Express 4

**Primary Dependencies**: `@testseed/types`, `@testseed/core`, `@testseed/db`, existing `regenerateWithFeedback` and `refineGeneratedDataset` use cases, existing generation route/client, existing generation workbench components, Zod 3

**Storage**: Existing saved generated dataset persistence only. Pending candidates are scoped to the current workbench review session and are not persisted after navigation away.

**Testing**: `npx.cmd turbo build lint test`, plus focused type/core tests for candidate/retry behavior, API contract tests for candidate response shape/statuses, and web tests for pending candidate review behavior where the current web harness allows.

**Target Platform**: Existing TestSeed monorepo web app and API service.

**Project Type**: Monorepo web application with clean architecture layering.

**Performance Goals**: Candidate comparison and state transitions remain usable for demo-sized datasets covered by 008, up to 500 records. Feedback submission enters loading state immediately. Accept/reject decisions complete without additional AI/provider work.

**Constraints**:
- Preserve dependency direction: `packages/types -> packages/db -> packages/core -> apps/api -> apps/web`.
- Do not duplicate existing 008 regeneration orchestration.
- Reuse `POST /projects/:projectId/generations/regenerate` and the existing `apps/web/src/lib/api-client.ts` client call.
- Reuse existing accepted dataset handling and validation gates.
- No business logic in `apps/web`; candidate acceptance rules must be represented by shared contracts/core helpers where behavior is non-trivial.
- Pending candidates cannot be accepted if blocking validation errors remain.
- Only one pending candidate may exist in a workbench review session.
- Users must accept or reject a pending candidate before submitting new feedback.
- Leaving the workbench discards the pending candidate and preserves the accepted dataset.
- Export, direct seeding, rollback, and unrelated preview editing behavior remain unchanged.

**Scale/Scope**: Existing generation workbench flow only. Scope is the review/compare-before-accept delta for feature 008, not a new regeneration system or long-term version history.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status |
| --- | --- |
| Layer dependency direction enforced | Pass |
| No business logic in app layer | Pass |
| Core remains framework-agnostic (no Express/Next/Mongoose) | Pass |
| Sensitive connection strings not stored/logged | Pass |
| Reuse existing generation infrastructure where possible | Pass |
| Export/direct seeding/rollback untouched | Pass |

No blocking constitution violations detected.

## Phase 0 Research Output

Key decisions are captured in `research.md`:
- Candidate review is modeled as a session-scoped workbench state layered on top of the existing 008 regeneration response.
- The existing regeneration endpoint is extended rather than replaced.
- Compare-before-accept uses deterministic summary metadata derived from accepted vs candidate datasets and regeneration outcome details.
- One automatic retry is allowed only for fixable duplicate unique values or invalid references.
- Pending candidates are discarded on workbench exit; accepting a candidate **forks** a new dataset version (`Accepted refinement`).

All technical unknowns are resolved with no `NEEDS CLARIFICATION` markers.

## Project Structure

### Documentation (this feature)

```text
specs/009-review-regeneration/
+-- plan.md
+-- research.md
+-- data-model.md
+-- quickstart.md
+-- contracts/
|   +-- reviewable-feedback-regeneration.md
+-- checklists/
|   +-- requirements.md
+-- tasks.md
```

### Source Code (repository root)

```text
packages/types/src/
+-- generation.ts
    # Extend feedback regeneration contracts with candidate/review/compare fields.

packages/core/src/generation/
+-- regenerate-with-feedback.ts
|   # Reuse 008 orchestration; add candidate response mapping and one retry where needed.
+-- validate-generated-dataset.ts
|   # Reuse as the blocking acceptance gate.
+-- review-feedback-candidate.ts
|   # Add only if needed for framework-agnostic compare/accept/reject helpers.
+-- __tests__/
    +-- regenerate-with-feedback.test.ts
    +-- review-feedback-candidate.test.ts

apps/api/src/routes/
+-- generation.ts
|   # Keep existing route; extend response/persistence behavior for pending candidate vs accepted dataset.
+-- __tests__/
    +-- feedback-regeneration.contracts.test.ts
    +-- feedback-regeneration.integration.test.ts

apps/web/src/lib/
+-- api-client.ts
|   # Reuse existing regenerateWithFeedback client; type shape updates only.
+-- generation-workbench-state.ts
    # Add session-scoped pending candidate/review state.

apps/web/components/generation/
+-- generation-workbench.tsx
|   # Add compare/review/accept/reject behavior around existing workbench preview.
+-- agent-dock.tsx
|   # Disable feedback submission while a candidate is pending review.
+-- __tests__/
    +-- generation-workbench.feedback.test.tsx
```

**Structure Decision**: Keep the existing TestSeed monorepo architecture and extend only the existing generation contracts, core use case, API route, client, workbench state, and workbench UI seams already used by feature 008.

## Phase 1 Design Artifacts

- `data-model.md`: Defines accepted dataset, candidate dataset, review state, change summary, retry attempt, and accept/reject/abandon transitions.
- `contracts/reviewable-feedback-regeneration.md`: Defines the delta to the existing feedback regeneration API and the workbench UI contract.
- `quickstart.md`: Manual/API/workbench verification flow for candidate review before accept.

## Post-Design Constitution Re-Check

| Rule | Status |
| --- | --- |
| Dependency direction preserved in planned file placements | Pass |
| Core remains independent of Express, Next.js, and Mongoose | Pass |
| Business rules stay in shared contracts/core helpers; web handles presentation state | Pass |
| Existing 008 regeneration route/use case reused | Pass |
| Pending candidates are not persisted beyond accepted dataset rules | Pass |
| Export/direct seeding/rollback unchanged | Pass |

Design remains constitution-compliant.

## Complexity Tracking

No constitution violations requiring justification.

## Next Steps

1. Run `/speckit-tasks` to generate task breakdown.
2. Implement in dependency order: `types -> core -> api -> web`.
3. Execute verification command: `npx.cmd turbo build lint test`.
