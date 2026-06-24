# Feature Specification: Project Context Setup

**Feature Branch**: `project-context`

**Created**: 2026-06-03

**Status**: Shipped

**Input**: User description: "create the feature spec for project description plus optional GitHub repo context."

## Clarifications

### Session 2026-06-03

- Q: Should GitHub repository context be implemented in this MVP feature or treated as future/non-core? -> A: Include GitHub repository context in this MVP feature as an implemented optional path.
- Q: Which repositories are in scope for MVP repository context? -> A: Support repositories already accessible through the user's connected GitHub account only.
- Q: What repository-derived context should be stored? -> A: Store only the generated repository context summary and warnings.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Describe Project Domain (Priority: P1)

As an authenticated developer starting a seed data workflow, I want to describe my project in plain language so generated records match the application domain instead of feeling generic.

**Why this priority**: Project description is the core context signal for realistic seed data and can deliver value even when no repository context is connected.

**Independent Test**: Can be fully tested by entering an e-commerce project description, continuing through schema review or generation setup, and confirming the saved generation context includes that description for later seed generation.

**Acceptance Scenarios**:

1. **Given** an authenticated developer is starting a new generation workflow, **When** they enter "e-commerce marketplace with customers, products, orders, carts, and reviews", **Then** the workflow records that domain context and makes it available for seed generation.
2. **Given** an authenticated developer leaves the description empty, **When** they continue, **Then** the workflow remains available and clearly warns that generated data may be generic.
3. **Given** an authenticated developer updates the project description before generation begins, **When** they save or continue, **Then** the latest description is the context used for the project.

---

### User Story 2 - Add Optional Repository Context (Priority: P2)

As an authenticated developer, I want to optionally connect a GitHub repository so TestSeed can use project files and documentation as extra context for domain-aware seed data.

**Why this priority**: Repository context is part of this MVP feature because it can improve seed relevance, but it must not block users who prefer manual schema input or who cannot access a repository.

**Independent Test**: Can be tested by choosing the optional repository context path, providing an accessible repository, and confirming the project context summary reflects useful repository signals while the workflow still supports manual schema input.

**Acceptance Scenarios**:

1. **Given** an authenticated developer has entered a project description, **When** they add an accessible repository, **Then** the project context includes a concise summary of relevant repository signals.
2. **Given** the repository is unavailable, too large, outside the connected account's access, or lacks useful files, **When** the developer attempts to add it, **Then** the system explains the limitation and lets the developer continue with the project description and schema input.
3. **Given** a developer chooses not to add repository context, **When** they continue, **Then** no repository connection is required and generation setup proceeds normally.

---

### User Story 3 - Review Context Before Generation (Priority: P3)

As an authenticated developer, I want to review the context that will influence generated data so I can catch missing or misleading information before creating records.

**Why this priority**: A review step reduces confusing output and gives users confidence that generated records will match their application domain.

**Independent Test**: Can be tested by entering a description and optional repository context, reviewing the resulting context summary, making a correction, and confirming the corrected context is used by the next workflow step.

**Acceptance Scenarios**:

1. **Given** project context has been collected, **When** the developer reaches the review step, **Then** they can see the project description, repository context status, and any warnings.
2. **Given** the displayed context is incomplete or inaccurate, **When** the developer edits the description or removes repository context, **Then** the review reflects the updated context before generation continues.

---

### Edge Cases

- Empty descriptions are allowed but must show a clear warning that output may be generic.
- Very long descriptions are accepted only up to a defined user-facing limit, with a clear prompt to shorten excess text.
- Repository context is optional and must never prevent manual schema input or MongoDB discovery from continuing.
- Unavailable, unauthorized, oversized, or irrelevant repositories produce user-friendly warnings and graceful fallback.
- Repository context must ignore secrets, credentials, and unrelated large files when building context.
- If project description and repository context conflict, the user-visible context review must make the conflict clear before generation proceeds.
- If the user removes repository context, future generation context must not continue using stale repository-derived information.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to enter and save a plain-language project description for a seed generation project.
- **FR-002**: System MUST allow users to continue without a project description while warning that generated data may be generic.
- **FR-003**: System MUST make the saved project description available to later seed generation and regeneration steps.
- **FR-004**: System MUST allow users to update the project description before generation begins.
- **FR-005**: System MUST implement repository context as an optional MVP path, not a required step.
- **FR-006**: System MUST allow users to provide or authorize access to a GitHub repository for additional project context during this feature.
- **FR-006a**: System MUST limit repository context selection to repositories accessible through the user's connected GitHub account.
- **FR-007**: System MUST summarize only relevant repository signals such as schemas, models, seed scripts, documentation, and domain terminology.
- **FR-007a**: System MUST store only the generated repository context summary and warnings, not raw repository file contents.
- **FR-008**: System MUST explain repository limitations when a repository is unauthorized, unavailable, too large, empty, or lacks useful context.
- **FR-009**: System MUST allow users to proceed with description-only context when repository context cannot be used.
- **FR-010**: System MUST show users a reviewable context summary before seed generation uses it.
- **FR-011**: System MUST allow users to remove repository context from a project before generation.
- **FR-012**: System MUST prevent secrets, credentials, and sensitive connection strings from being stored or displayed as project context.
- **FR-013**: System MUST preserve a clear distinction between project domain context and database connection details.
- **FR-014**: System MUST associate saved project context with the authenticated user's project only.
- **FR-015**: System MUST provide clear warnings when collected context is incomplete, conflicting, or likely to produce generic data.

### Key Entities

- **Project Context**: The domain information that guides seed data relevance, including the project description, optional repository context summary, source status, warnings, and last update time.
- **Repository Context Source**: An optional source connected by the user, including repository identity, connected-account access status, usefulness status, discovered context categories, and warnings.
- **Context Warning**: A user-facing message that explains missing, limited, conflicting, or unsafe context.
- **Generation Project**: The user's saved workspace that owns project context, schema snapshots, generation setup, and later generated seed data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of users can create or update a project description and reach schema input or generation setup in under 2 minutes.
- **SC-002**: 95% of description-only workflows proceed without requiring repository context.
- **SC-003**: For projects with clear domain descriptions, at least 80% of reviewed generated sample values are judged relevant to the described domain during acceptance testing.
- **SC-004**: 100% of unavailable, unauthorized, or unusable repository attempts provide a clear explanation and allow the user to continue without repository context.
- **SC-005**: 100% of context reviews display whether generation will use description-only context, repository-enhanced context, or generic fallback context.
- **SC-006**: No saved project context contains raw repository file contents, database connection strings, access tokens, passwords, or other credential-like values in security review samples.

## Assumptions

- Users must be authenticated before saving project context.
- Project description is the required MVP value path; repository context is implemented MVP enrichment.
- GitHub repository context means reading user-approved repository content or metadata relevant to seed generation from repositories accessible through the user's connected GitHub account.
- Repository context should be summarized for generation rather than storing or exposing every file to the user.
- If repository context cannot be used safely or usefully, the system continues with project description and schema input.
- MongoDB connection strings remain separate from project context and are used only for active database operations.
