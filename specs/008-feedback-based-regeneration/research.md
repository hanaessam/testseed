# Research: Feedback-Based Regeneration

**Date**: 2026-06-08

**Spec**: `specs/008-feedback-based-regeneration/spec.md`

## Problem recap

Users need iterative refinement of generated datasets based on short feedback comments, but accepted dataset state must remain stable and schema-valid while regeneration is in progress or fails.

## Decisions

### Decision: Model feedback as iterative generation, not standalone chat

**Rationale**: The feature scope explicitly requests feedback-based regeneration as a generation operation. This keeps generation/refinement semantics consistent and avoids introducing a second, divergent workflow.

**Alternatives considered**:
- Separate chat-only feature disconnected from generation pipeline: rejected (scope mismatch).
- Manual edit-only iteration: rejected (insufficient automation).

### Decision: Input to regeneration is last accepted dataset + feedback prompt

**Rationale**: Clarified behavior states unsaved manual preview edits remain local and are not used for regeneration input. Using the last accepted dataset avoids coupling regeneration to transient UI state.

**Alternatives considered**:
- Use current preview state including unsaved edits: rejected (non-deterministic and mixes concerns).
- Require save before every feedback request: rejected (extra friction).

### Decision: Enforce single in-flight regeneration request

**Rationale**: One in-flight request eliminates race conditions where multiple responses could overwrite each other or produce inconsistent acceptance state.

**Alternatives considered**:
- Queue requests: deferred (adds ordering complexity and stale-intent risks).
- Cancel-and-replace newest request: rejected for v1 (harder to explain and test).
- Allow parallel requests: rejected (state ambiguity).

### Decision: Preserve current accepted dataset until regeneration succeeds

**Rationale**: Workbench stability and trust require that failed or partial attempts do not replace known-valid data.

**Alternatives considered**:
- Optimistically replace preview before validation completes: rejected (can expose invalid state).
- Apply partial records immediately: rejected (risks broken references).

### Decision: Cancel regeneration on navigation away

**Rationale**: Clarification requires cancel-on-leave and preserve last accepted dataset. Abort semantics align with existing workbench request lifecycle patterns.

**Alternatives considered**:
- Continue in background and apply later: rejected (unexpected state jumps).
- Prompt user to choose: deferred (possible future enhancement).

### Decision: Keep schema validation as acceptance gate in core

**Rationale**: Existing core validation logic is the authoritative rule set for generation and editing. Reuse avoids duplicate business logic and preserves architecture boundaries.

**Alternatives considered**:
- Re-implement lightweight validation in web: rejected (violates architecture constraints).
- Partial client-only validation: rejected (incomplete correctness).

## Best-practice implications for implementation planning

- Define explicit outcome modes for regeneration (`accepted`, `partial`, `rejected`) and require user-facing messages for all non-accepted outcomes.
- Keep API idempotence expectations scoped to request payload; do not mutate persisted runs unless explicit save operations are invoked.
- Log request lifecycle events without persisting prompt secrets or connection strings.

## Open items

No blocking research unknowns remain.
