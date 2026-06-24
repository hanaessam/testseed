# Feature Specification: Reviewable Feedback Regeneration

**Feature Branch**: `009-review-regeneration`

**Created**: 2026-06-08

**Status**: Shipped

**Input**: User description: "Epic: Feedback-Based Regeneration [core]. As a developer, I want regeneration to consider the previous generated data plus my comments so I can iteratively refine results instead of starting over. Regenerated records preserve useful structure from the previous result where appropriate, apply user comments to the next version, and let the user compare or review the updated result before accepting it. If regeneration creates duplicate unique values or invalid references, the system flags the problem and retries or asks the user to revise the feedback. Scope extends feature 008, adds review/compare-before-accept behavior if not already present, preserves the previous accepted dataset until the user accepts the regenerated result, shows clear differences or summary, and does not modify export, direct seeding, rollback, or unrelated preview editing behavior."

**Depends on**: Feedback-Based Regeneration (008), AI Seed Generation (005), Generation Workbench (006), and Preview and Editing (007).

## Problem

Feedback-based regeneration is useful only if developers can safely inspect what changed before replacing a dataset they already trust. If regenerated records immediately overwrite the current accepted dataset, users lose a stable baseline for comparison and may accidentally carry forward bad changes, duplicate unique values, or broken references.

Developers need regeneration to behave like an iterative review loop: use the prior accepted dataset plus comments, produce a candidate revision, summarize meaningful differences, and keep the prior accepted dataset available until the user explicitly accepts the candidate.

## Goal

Enable developers to review, compare, and accept feedback-regenerated datasets without losing the previous accepted result.

The feature must:

1. Generate a candidate dataset from the previous accepted dataset and the user's latest comments.
2. Preserve useful existing structure where the feedback does not require change.
3. Keep the previous accepted dataset active until the user accepts the candidate.
4. Show clear differences or a concise change summary before acceptance.
5. Flag duplicate unique values, invalid references, or other blocking validation problems before acceptance.
6. Preserve the boundaries of export, direct seeding, rollback, and unrelated preview editing behavior.

## Clarifications

### Session 2026-06-08

- Q: How many automatic retries should occur when candidate regeneration creates fixable duplicate unique values or invalid references? -> A: Retry once automatically, then ask the user to revise feedback if the candidate is still invalid.
- Q: Can the user submit new feedback while a regenerated candidate is still pending review? -> A: No. The user must accept or reject the pending candidate before submitting another feedback request.
- Q: What happens to an unaccepted candidate when the user leaves the workbench? -> A: Discard the pending candidate and keep only the accepted dataset.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review Candidate Before Accepting (Priority: P1)

As a developer, I want regenerated data to appear as a candidate result so I can inspect it before it replaces my current accepted dataset.

**Why this priority**: This is the safety contract that makes iterative regeneration trustworthy; users must not lose a known-good dataset while evaluating new output.

**Independent Test**: Start from an accepted dataset, submit feedback, and confirm the regenerated result is reviewable without changing the active accepted dataset until the user accepts it.

**Acceptance Scenarios**:

1. **Given** an accepted dataset is visible, **When** the user submits feedback and regeneration succeeds, **Then** the system presents the regenerated records as a candidate result for review.
2. **Given** a candidate result is shown, **When** the user has not accepted it, **Then** the previous accepted dataset remains the active dataset for downstream actions.
3. **Given** a candidate result is shown, **When** the user accepts it, **Then** the candidate becomes the active accepted dataset.
4. **Given** a candidate result is shown, **When** the user rejects or dismisses it, **Then** the previous accepted dataset remains unchanged.

---

### User Story 2 - Compare Changes Clearly (Priority: P1)

As a developer, I want to understand what changed between the previous accepted dataset and the regenerated candidate so I can decide whether to accept it.

**Why this priority**: Feedback regeneration should reduce review effort, not force users to manually inspect every record for hidden changes.

**Independent Test**: Submit feedback such as "make users Canadian" and confirm the candidate view or summary identifies changed collections, notable field changes, unchanged structure, and any partially applied comments.

**Acceptance Scenarios**:

1. **Given** regeneration produces changed records, **When** the candidate is shown, **Then** the user sees a clear summary of what changed from the previous accepted dataset.
2. **Given** regeneration preserves existing records or relationships, **When** the candidate is shown, **Then** the user can tell which useful structure was preserved where appropriate.
3. **Given** feedback is partially applied, **When** the candidate is shown, **Then** the user sees which requested changes were applied and which were skipped.
4. **Given** no meaningful changes were made, **When** regeneration completes, **Then** the user is told that the candidate is effectively unchanged.

---

### User Story 3 - Protect Against Invalid Candidate Results (Priority: P1)

As a developer, I want invalid regenerated results to be blocked before acceptance so I do not accidentally use records with duplicate unique values or invalid references.

**Why this priority**: Invalid candidates break the core promise that generated data can be trusted for preview, export, or insertion after acceptance.

**Independent Test**: Submit feedback likely to create duplicate unique values or broken references and confirm the system flags the problem, does not replace the accepted dataset, and either retries or asks for revised feedback.

**Acceptance Scenarios**:

1. **Given** a candidate contains duplicate values for fields that must be unique, **When** validation completes, **Then** the system flags the duplicate problem before the candidate can be accepted.
2. **Given** a candidate contains invalid or unresolved references, **When** validation completes, **Then** the system flags the reference problem before the candidate can be accepted.
3. **Given** a blocking candidate problem can be resolved by another regeneration attempt, **When** the system retries, **Then** the prior accepted dataset remains active during the retry.
4. **Given** a blocking candidate problem remains after one automatic retry, **When** the user is prompted to revise feedback, **Then** the prompt explains the issue in plain language.

---

### User Story 4 - Continue Iterating From Accepted Data (Priority: P2)

As a developer, I want each feedback pass to build from the last accepted dataset so iteration remains predictable and reversible.

**Why this priority**: Users need a stable baseline for each refinement cycle and should not accidentally stack rejected candidate changes.

**Independent Test**: Generate a candidate, reject it, submit new feedback, and confirm the new feedback uses the previous accepted dataset rather than the rejected candidate.

**Acceptance Scenarios**:

1. **Given** a candidate is rejected, **When** the user submits different feedback, **Then** regeneration uses the previous accepted dataset as the baseline.
2. **Given** a candidate is accepted, **When** the user submits another feedback request, **Then** regeneration uses the newly accepted dataset as the baseline.
3. **Given** a candidate is pending review, **When** the user tries to submit another feedback request, **Then** the system requires the user to accept or reject the pending candidate first.
4. **Given** a candidate exists, **When** the user continues reviewing, **Then** export, direct seeding, and rollback behavior remain governed by the accepted dataset and existing rules.
5. **Given** a candidate is pending review, **When** the user leaves the workbench before accepting it, **Then** the candidate is discarded and the accepted dataset remains unchanged.

### Edge Cases

- Regeneration creates duplicate values for fields that must remain unique.
- Regeneration creates invalid, missing, or cross-collection references.
- One automatic retry still produces duplicate unique values or invalid references.
- Feedback asks for changes that conflict with schema constraints or required relationships.
- Feedback would require changing record counts or schema structure outside this feature's scope.
- Regeneration produces no meaningful differences from the previous accepted dataset.
- User rejects a candidate and immediately submits revised feedback.
- User attempts to submit new feedback while a candidate is pending review.
- User accepts a candidate after a warning that non-blocking issues or partial application occurred.
- Candidate review is abandoned before acceptance.
- User leaves the workbench while a candidate is pending review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use the previous accepted dataset plus the latest user comments as the baseline for feedback-based regeneration.
- **FR-002**: System MUST produce regenerated records as a candidate result that can be reviewed before acceptance.
- **FR-003**: System MUST keep the previous accepted dataset active until the user explicitly accepts the candidate result.
- **FR-004**: System MUST allow the user to accept a valid candidate result and make it the new accepted dataset.
- **FR-005**: System MUST allow the user to reject or dismiss a candidate result without changing the previous accepted dataset.
- **FR-006**: System MUST show a clear difference view or concise change summary between the previous accepted dataset and the candidate result.
- **FR-007**: System MUST identify changed collections, notable changed fields, preserved structure, and unchanged results in the review information where applicable.
- **FR-008**: System MUST summarize whether user comments were fully applied, partially applied, or not applied.
- **FR-009**: System MUST preserve useful structure from the previous accepted dataset where the user's comments do not require changing it.
- **FR-010**: System MUST validate candidate results for blocking problems before they can be accepted.
- **FR-011**: System MUST prevent acceptance of candidate results that contain duplicate unique values, invalid references, missing required data, invalid types, or invalid enum values.
- **FR-012**: System MUST flag blocking candidate problems in plain language and identify the affected collection or record area when possible.
- **FR-013**: System MUST retry candidate regeneration once automatically when duplicate unique values or invalid references appear fixable without changing user intent, and MUST ask the user to revise feedback if the retry still has blocking problems.
- **FR-014**: System MUST use the last accepted dataset, not a rejected candidate, as the baseline for later feedback requests.
- **FR-015**: System MUST use an accepted candidate as the baseline for later feedback requests after acceptance.
- **FR-016**: System MUST preserve existing export, direct seeding, rollback, and unrelated preview editing behavior.
- **FR-017**: System MUST keep downstream actions governed by the accepted dataset until a candidate is accepted.
- **FR-018**: System MUST communicate candidate state clearly as pending review, accepted, rejected, invalid, retried, or awaiting revised feedback.
- **FR-019**: System MUST prevent new feedback submissions while a candidate is pending review and MUST prompt the user to accept or reject the candidate first.
- **FR-020**: System MUST discard an unaccepted candidate when the user leaves the workbench and MUST keep the accepted dataset unchanged.

### Key Entities

- **Accepted Dataset**: The current trusted generated records that downstream actions may use under existing validity rules.
- **Candidate Dataset**: A regenerated draft created from the accepted dataset and user comments, pending user review.
- **Feedback Comment**: A user-authored instruction describing desired changes to generated records.
- **Change Summary**: User-visible explanation of meaningful differences between the accepted dataset and the candidate dataset.
- **Validation Problem**: A blocking or non-blocking issue discovered while checking whether a candidate can be accepted.
- **Acceptance Decision**: The user's choice to accept, reject, or leave a candidate pending.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of regenerated candidate datasets remain separate from the accepted dataset until the user accepts them.
- **SC-002**: 100% of accepted regenerated datasets pass blocking validation before becoming active.
- **SC-003**: 100% of candidate reviews show either a difference summary or a clear "no meaningful changes" message.
- **SC-004**: At least 90% of users in task testing can identify whether feedback was fully applied, partially applied, or not applied within 30 seconds of seeing the candidate result.
- **SC-005**: 0% of candidates with known duplicate unique values or invalid references can be accepted in acceptance testing.
- **SC-006**: At least 85% of users can submit feedback, review the candidate, and make an accept/reject decision in under 90 seconds for a demo-sized dataset.

## Assumptions

- Feature 008 already provides the basic feedback submission and regeneration flow.
- The accepted dataset is the only dataset eligible for export, direct seeding, or rollback-related downstream use until a candidate is accepted.
- Candidate review may be shown as a side-by-side comparison, highlighted differences, or a summary-first review, as long as users can decide whether to accept it.
- Automatic retry is limited to one attempt when a candidate appears fixable without changing user intent; otherwise, the user should be asked to revise feedback.
- Users decide on one pending candidate at a time before starting another feedback request.
- Pending candidates are scoped to the current workbench review session and are not preserved after the user leaves.
- This feature does not introduce new export formats, direct seeding changes, rollback changes, schema editing changes, or unrelated preview editing changes.

## Out of Scope

- Export behavior changes or new export formats.
- Direct MongoDB seeding changes.
- Rollback behavior changes.
- Unrelated preview editing behavior changes.
- Long-term version history beyond the current accepted dataset and current candidate review need.
- Changing schema structure or collection counts as part of feedback review.

## Invariants

- The accepted dataset remains canonical until a candidate is explicitly accepted.
- Rejected or invalid candidates never become the baseline for later regeneration.
- Abandoned candidates never become the baseline for later regeneration.
- A candidate with blocking validation problems cannot be accepted.
- Export, direct seeding, and rollback behavior remain unchanged by this feature.
