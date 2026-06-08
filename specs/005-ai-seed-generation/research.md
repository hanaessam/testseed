# Research: AI Seed Generation

## Decision: Use OpenAI API as the generation provider

**Rationale**: The project already includes OpenAI API configuration and an API-layer OpenAI client pattern. The requirements call for realistic domain-aware records, and OpenAI can use project context plus reviewed schema metadata to produce plausible seed data.

**Alternatives considered**:

- Hand-written faker-only generation: easier to validate, but weaker domain realism and less useful for varied project descriptions.
- Store generation provider directly in core: rejected because core must remain infrastructure-free and independently testable.
- Ask users to paste generated JSON manually: rejected because it does not solve dependency ordering or validation.

## Decision: Keep OpenAI SDK usage in the API layer

**Rationale**: The API layer already owns external SDK construction and environment variables. Core should receive an injected generator dependency so dependency ordering, validation, retry rules, and error handling can be tested without network calls.

**Alternatives considered**:

- Import OpenAI SDK in `packages/core`: rejected because it would couple business logic to infrastructure and make tests slower.
- Let the web app call OpenAI directly: rejected because it would expose secrets and bypass server-side validation.

## Decision: Generate from an explicit collection generation plan

**Rationale**: Parent-before-child generation requires a deterministic dependency graph based on reviewed reference fields. A collection generation plan lets the system tell the provider which collections to generate, in what order, with which counts and constraints.

**Alternatives considered**:

- Ask OpenAI to infer ordering from the schema alone: rejected because reference integrity must be guaranteed by TestSeed, not guessed by the provider.
- Generate all collections in one unordered request: rejected because child references may not have parent IDs available.

## Decision: Validate generated records before accepting the dataset

**Rationale**: The acceptance criteria require valid JSON grouped by collection, field constraints, enum values, required fields, and valid references. Provider output is treated as a draft until TestSeed validates it.

**Alternatives considered**:

- Trust structured JSON output alone: rejected because valid JSON can still violate schema constraints.
- Show invalid output directly to users: rejected because invalid datasets must not be marked ready for preview, export, or insertion.

## Decision: Retry malformed or invalid output with bounded attempts

**Rationale**: Existing requirements expect recovery from malformed AI JSON. A bounded retry loop improves success while preventing long waits and unclear failures. Retry prompts should include sanitized validation feedback, not secrets or raw provider errors.

**Alternatives considered**:

- No retry: rejected because a single malformed response would make the feature brittle.
- Unlimited retry: rejected because users need predictable completion and cost/time bounds.

## Decision: Treat cyclic or missing references as validation blockers

**Rationale**: Parent-first ordering cannot be guaranteed when references are cyclic or point to missing collections. The system should explain the issue and recommend schema-review or count adjustments before generation proceeds.

**Alternatives considered**:

- Generate cycles opportunistically: rejected because it risks invalid ObjectId references.
- Ignore missing references: rejected because accepted datasets must preserve reference integrity.

## Decision: Include chat-based dataset refinement in the initial epic

**Rationale**: Users may receive valid generated data that still needs targeted domain-specific changes. A chat refinement box keeps the workflow natural while preserving TestSeed's validation boundary. Refinements are treated as new AI drafts until they pass the same grouped JSON, type, enum, required-field, uniqueness, and reference checks.

**Alternatives considered**:

- Manual-only JSON editing: rejected because it is slower and bypasses AI-assisted domain tuning.
- Treat chat as a separate future epic: rejected because the requested generation workflow should include a way to edit specific generated details through AI.
- Apply chat changes without validation: rejected because accepted datasets must remain schema-valid and reference-safe.

## Decision: Preserve the current valid dataset when refinement fails

**Rationale**: Chat refinements can be malformed, ambiguous, or schema-invalid. The UI should never replace a known-valid dataset with invalid data. Failed refinements return validation feedback or guidance while leaving the current dataset intact.

**Alternatives considered**:

- Replace the dataset and show warnings: rejected because invalid generated data must not be marked ready for downstream workflows.
- Ask users to manually compare old and new JSON: rejected because it creates avoidable user error.

## Decision: Initial scope returns generated and refined JSON grouped by collection

**Rationale**: This epic focuses on seed generation and chat refinement. Manual record editing, export, direct insertion, and rollback are downstream epics. Returning grouped JSON creates the handoff point those later workflows need.

**Alternatives considered**:

- Insert directly into MongoDB during generation: rejected because direct seeding requires separate confirmation and rollback safeguards.
- Add full manual record editor in this slice: rejected to keep this epic independently deliverable.
