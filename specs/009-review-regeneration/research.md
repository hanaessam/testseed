# Research: Reviewable Feedback Regeneration

## Decision: Reuse the 008 regeneration endpoint and core use case

**Rationale**: Feature 008 already defines `POST /projects/:projectId/generations/regenerate`, the `FeedbackRegenerationRequest`/`FeedbackRegenerationResponse` contracts, and `regenerateWithFeedback` as the orchestration seam over `refineGeneratedDataset`. The 009 scope is review/compare-before-accept behavior, so a second endpoint or use case would duplicate logic and make lifecycle behavior harder to keep consistent.

**Alternatives considered**:
- Add a separate candidate regeneration endpoint: rejected because it duplicates 008 behavior and fragments validation handling.
- Replace the refinement path entirely: rejected because the existing path already preserves schema context, project context, counts, accepted dataset input, abort behavior, and validation.

## Decision: Model regenerated output as a pending candidate before acceptance

**Rationale**: The accepted dataset must remain canonical until the user explicitly accepts a candidate. The workbench already has a `dataset` source of truth; this feature adds `pendingCandidate` review state instead of immediately replacing `dataset` when regeneration succeeds.

**Alternatives considered**:
- Immediately replace preview on successful regeneration: rejected because it violates the spec's compare-before-accept requirement.
- Persist all candidates as saved runs before acceptance: rejected because the scope excludes long-term version history and says abandoned candidates are discarded.

## Decision: Keep pending candidates session-scoped

**Rationale**: Clarification established that unaccepted candidates are discarded when the user leaves the workbench. Session-scoped state is sufficient and avoids creating storage, cleanup, or history semantics outside the feature.

**Alternatives considered**:
- Persist pending candidates across visits: rejected by clarification and because it would introduce version-history behavior.
- Store candidates in local browser storage: rejected because it complicates validity and accepted dataset source-of-truth rules.

## Decision: Use deterministic compare summary metadata

**Rationale**: Users need to understand what changed without reviewing every record. A deterministic summary can compare accepted and candidate datasets by collection, record id, and field keys, then combine that with the regeneration message and validation findings. This avoids an extra provider call and keeps the comparison explainable.

**Alternatives considered**:
- Ask the AI provider to produce all diff summaries: rejected because it adds cost, latency, and possible inconsistency.
- Only show raw side-by-side tables: rejected because success criteria require users to identify applied/partial/no-change outcomes quickly.

## Decision: Retry once for fixable duplicate unique values or invalid references

**Rationale**: Clarification established one automatic retry. The retry should use validation feedback from the first invalid candidate and preserve the accepted dataset during the retry. If the retry is still blocking, the user is asked to revise feedback.

**Alternatives considered**:
- No automatic retry: rejected because the spec allows retry for fixable invalid candidates.
- Multiple automatic retries: rejected because it risks opaque AI loops and longer waits.

## Decision: Block new feedback while a candidate is pending review

**Rationale**: Clarification established that the user must accept or reject a pending candidate before submitting another feedback request. This keeps the baseline rule simple: every regeneration starts from the last accepted dataset.

**Alternatives considered**:
- Allow feedback against pending candidates: rejected because it stacks unaccepted changes.
- Allow feedback while still using the accepted dataset: rejected because it makes the pending candidate state confusing and increases UI race risk.
