# TestSeed: AI-Powered Database Seeding Agent
## CISC 818 Software Engineering with AI — Assignment 4 Team Report

**Course:** CISC 818 — Software Engineering with AI  
**Institution:** Queen's University, School of Computing  
**Team 4:** Hana Essam · Mariam Shaban · Hassan Aziz · Mazen Bahgat  
**GitHub Repository:** https://github.com/hanaessam/testseed  
**Live Application:** https://testseed-web.vercel.app  
**API Endpoint:** https://testseed-api.vercel.app  
**Submission Date:** June 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement and Motivation](#2-problem-statement-and-motivation)
3. [System Architecture and Technology Stack](#3-system-architecture-and-technology-stack)
4. [AI Usage Across the Software Development Lifecycle](#4-ai-usage-across-the-software-development-lifecycle)
   - 4.1 Requirements Engineering Phase
   - 4.2 Architecture and Design Phase
   - 4.3 Implementation Phase
   - 4.4 Testing and Validation Phase
   - 4.5 Deployment and Operations Phase
   - 4.6 AI Limitations and Failure Cases
   - 4.7 Team Decision-Making Around AI
5. [Code Quality and Functionality](#5-code-quality-and-functionality)
6. [Documentation Quality](#6-documentation-quality)
7. [User Story Mapping](#7-user-story-mapping)
8. [Reflections and Lessons Learned](#8-reflections-and-lessons-learned)
9. [Conclusion](#9-conclusion)

---

## 1. Executive Summary

TestSeed is a full-stack web application that solves a concrete problem faced by every development team: the slow, manual, and fragile process of populating test databases with realistic data. Using OpenAI's GPT-4 as its reasoning engine, TestSeed accepts a project description and a Mongoose schema, analyzes entity relationships, generates statistically realistic and referentially consistent seed data in dependency order, and either exports it as JSON/JavaScript seed scripts or inserts it directly into a target MongoDB database.

Over a four-week sprint, Team 4 shipped **73 production features** across 29 merged pull requests and approximately 90 commits. The application is fully deployed on Vercel and covers the complete user journey: account management, project workspaces, schema input (manual paste or live MongoDB discovery), AI-powered seed data generation with streaming output, chat-based iterative refinement, inline editing, export, direct MongoDB seeding with `seedBatchId` tracking, and one-click rollback.

This report documents how artificial intelligence tools were integrated at every phase of the software development lifecycle, the limitations and failures encountered, how the team made decisions about when to use and when to reject AI-generated output, and the resulting quality of the system.

---

## 2. Problem Statement and Motivation

Development and QA teams routinely spend a disproportionate share of project setup time creating seed data. Industry estimates suggest up to **25% of environment setup time** is consumed by this task. The root causes are:

- **Manual construction is slow:** Writing seed scripts for a ten-collection Mongoose schema requires understanding all fields, types, and cross-collection reference constraints.
- **AI-naive tools are brittle:** Tools like `faker.js` fill fields with random plausible-looking data but have no understanding of relationships — foreign keys point to non-existent documents, enums are violated, and cardinality assumptions are ignored.
- **Scripts are discarded at migration time:** When schemas change, seed scripts written by hand must be rewritten from scratch.

TestSeed addresses all three problems. The system understands schema semantics using GPT-4, generates data that satisfies reference constraints in topological order, and is regenerable from any schema version with one click.

---

## 3. System Architecture and Technology Stack

### 3.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Redux Toolkit, Tailwind CSS |
| Backend | Express.js, Node.js 20+, Zod validation |
| AI Engine | OpenAI GPT-4 (structured JSON generation via function calling) |
| Application Database | MongoDB Atlas (Mongoose 8) |
| Auth | JWT, bcrypt, email OTP via SMTP, GitHub OAuth |
| Cache | Upstash Redis (OTP storage) |
| Monorepo | Turborepo + npm workspaces |
| CI/CD | GitHub Actions, Vercel |
| Agent Tooling | Claude Code (Claude Sonnet 4.6), Spec Kit |

### 3.2 Clean Architecture

The project enforces a **strict unidirectional dependency graph**:

```
packages/types → packages/db → packages/core → apps/api → apps/web
```

This boundary was deliberate and architecturally significant:

- **`packages/types`** — Shared TypeScript contracts only; no logic. Every API request, response, and error type is defined here.
- **`packages/db`** — Mongoose models and repository factories. Owns persistence, converts documents to typed DTOs.
- **`packages/core`** — Framework-free business use cases. Receives dependencies as parameters (no Express, Next.js, Mongoose, or environment variable imports). This is where all seed generation, validation, rollback, and auth logic lives.
- **`apps/api`** — Thin Express adapter layer. Validates HTTP inputs, calls core, returns JSON. Contains no business logic.
- **`apps/web`** — Next.js frontend. Calls the API over HTTP; imports only `@testseed/types`. Never imports backend packages.

This separation was enforced consistently across all 29 pull requests. The architectural decision is documented in `docs/adr/0001-clean-architecture.md` and was initially recommended by Claude during an architecture review session (see Section 4.2).

### 3.3 Monorepo Structure

```
testseed/
├── apps/
│   ├── api/          # Express HTTP adapter
│   └── web/          # Next.js React frontend
├── packages/
│   ├── core/         # Framework-free business logic
│   ├── db/           # MongoDB adapters and Mongoose models
│   └── types/        # Shared TypeScript contracts
├── docs/             # Architecture, requirements, design docs
├── specs/            # Per-feature specifications (14 feature specs)
└── .specify/         # Spec Kit AI workflow configuration
```

---

## 4. AI Usage Across the Software Development Lifecycle

This section documents specific, concrete uses of AI tools at each SDLC phase, the output produced, the team's evaluation of that output, and where human judgment was required to correct, extend, or reject AI suggestions.

### 4.1 Requirements Engineering Phase

#### Tool: ChatGPT-4o — User Story Generation

**Task:** Drafting the initial set of user stories for eleven product epics (account management, schema input, AI generation, refinement, export, seeding, rollback).

**Prompt approach:** The team provided ChatGPT-4o with the project description and a list of epic names. The model was asked to generate user stories in the standard "As a [role], I want [goal], so that [benefit]" format with acceptance criteria.

**AI output quality:**
- ChatGPT-4o produced well-structured user stories for the core happy paths efficiently, covering approximately 60% of the stories in the final document without significant revision.
- The model successfully identified actors (developer, QA engineer, DevOps engineer) and inferred implicit goals (e.g., preview data before committing to a database).

**Where AI failed and human intervention was required:**
- The model conflated "GitHub repository context for generation" (providing code context to improve AI seed realism) with "GitHub OAuth for account login" — these are two distinct features. Manual revision was required to separate and clarify these epics.
- Edge cases were systematically under-specified. For example, the model did not generate stories for partial insertion failure, connection string security handling, or the case where a schema snapshot changes between runs. These required the team to add approximately 40% of the final acceptance criteria manually.
- The model assumed synchronous generation throughout; the streaming SSE case required a completely separate set of user stories written without AI assistance.

**Lesson:** AI drafting tools are effective for happy-path story generation but miss edge cases and security-relevant scenarios. AI output was used as a first draft requiring thorough human review, not as a final deliverable.

---

#### Tool: Claude — Architecture Constraint Discovery

**Task:** The team presented Claude with the project description, the proposed three-tier architecture (Next.js, Express, MongoDB), and asked for an architecture review.

**Key output:** Claude flagged a security concern that had not been explicitly articulated in the initial design: MongoDB connection strings entered by users (for direct seeding) must never be stored, persisted, logged, or returned in API responses. Claude explicitly recommended the "transient connection string" pattern — use the string only for the duration of the request, in a `finally` block that closes the client, and never allow it to flow into any persistence layer.

This recommendation became **Functional Requirement FR-003** in the direct seeding spec and was enforced as an architectural constraint in `packages/core`. Every subsequent implementation that touched seeding was reviewed against this constraint.

**Impact:** This single AI-assisted architecture review prevented a class of data security vulnerabilities across five later features (connection testing, confirmation, seeding, rollback, and the API adapter).

---

#### Tool: v0.dev — UI Wireframe Generation

**Task:** The team used v0.dev to generate React component wireframes for the generation workbench, the export drawer, and the project detail page.

**AI output quality:**
- v0.dev produced visually plausible layouts for all three screens, saving approximately 4–6 hours of initial wireframing work.
- The component structures were generally usable as starting points.

**Where AI failed:**
- Data flow consistency was incorrect across wireframes. The generated confirmation summary screen in the export drawer showed a "confirm" button before the connection test had been completed — logically incorrect given the gating requirement.
- The workbench left rail included a "schema" panel that duplicated the wizard step rather than showing the generation plan — a misunderstanding of the feature's purpose.
- All three screens required manual correction before they were used as implementation targets.

---

### 4.2 Architecture and Design Phase

#### Tool: Claude Code with Spec Kit — Feature Specification Workflow

The most significant AI integration in the design phase was the adoption of **Spec Kit**, an AI-assisted feature specification workflow embedded in Claude Code. Every one of the 14 features delivered was designed through a five-command sequence:

```
/speckit-specify  → creates spec.md (requirements, user stories, acceptance criteria)
/speckit-clarify  → identifies underspecified areas, asks targeted questions
/speckit-plan     → generates plan.md, research.md, data-model.md, quickstart.md, contracts/
/speckit-tasks    → generates tasks.md (dependency-ordered implementation checklist)
/speckit-implement → executes the tasks
```

**What Spec Kit produced for each feature:**
1. **`spec.md`** — User stories with independent testability criteria, functional requirements, edge cases, and measurable success criteria
2. **`plan.md`** — Technical context, dependency identification, architecture decision records, and a numbered implementation approach
3. **`research.md`** — Design decisions with explicit rationale and alternatives considered
4. **`data-model.md`** — Request/response type structures, validation rules, and state transition diagrams
5. **`quickstart.md`** — End-to-end validation guide with specific test commands
6. **`contracts/`** — API interface definitions with HTTP request/response shapes and stable error codes

**Concrete example — Direct MongoDB Seeding (spec-012):**

When implementing the direct seeding feature, `speckit-plan` generated a research decision documenting why the team chose a non-secret connection test token over storing a session fingerprint:

> *"Use non-secret connection test token/fingerprint as proof. Provides the server a way to confirm that the connection test and the seeding request used the same connection string, without the server ever seeing or storing the string after the test completes."*

This design was implemented as the `connectionTestToken` + `connectionFingerprint` pattern in `packages/core/src/generation/direct-mongodb-seeding.ts`, where HMAC-SHA256 is used to create a non-reversible fingerprint of the connection string that can be compared across requests.

**Team evaluation of Spec Kit output:** The team found Spec Kit most valuable at the `speckit-plan` stage, where the generated research.md forced explicit documentation of alternative approaches before any code was written. This reduced mid-implementation pivots by approximately 60% compared to team members' previous experience on comparable projects.

---

#### Tool: Figma AI — UI Layout and Consistency

**Task:** Annotating component boundaries, spacing systems, and visual hierarchy across the three-pane workbench.

**AI output quality:** Figma AI successfully detected inconsistent spacing values across the workbench panels and suggested a unified 8px grid system that was adopted. It also identified accessibility issues (insufficient color contrast between muted text and the dark background) that were corrected before implementation.

**Where AI failed:** An attempt to use LucidChart's AI XML generation for architecture diagrams produced invalid XML that could not be parsed by LucidChart itself. The architecture diagram was ultimately drawn manually.

---

### 4.3 Implementation Phase

#### Tool: Claude Code — Primary Implementation Agent

The majority of the implementation was executed by Claude Code (Claude Sonnet 4.6) operating through the `speckit-implement` command, which reads `tasks.md` and executes each task in dependency order.

**Custom skills developed for the project:**

The team configured 10+ custom Claude Code skills tailored to TestSeed's specific architecture:

| Skill | Purpose |
|-------|---------|
| `testseed-api-route` | Scaffolds a new Express route following the thin-adapter pattern |
| `testseed-core-module` | Creates a new core use case with dependency injection |
| `testseed-tdd` | Writes Jest tests before implementation (test-first) |
| `testseed-security-review` | Audits a PR for connection string leakage, auth bypass, injection risks |
| `testseed-readme-update` | Updates README with new feature documentation |

**Concrete example — AI Seed Generation feature (spec-005):**

The core generation function in `packages/core/src/generation/` was implemented through a series of Claude Code sessions. The AI generated:

1. The OpenAI prompt template that constructs a structured JSON request from a parsed schema and record counts
2. The dependency-order resolution algorithm (`buildGenerationPlan`) that uses topological sort on schema references
3. The validation engine (`validateGeneratedDataset`) that checks 8 categories of constraint violations

The validation engine required the most human oversight. Claude's first implementation validated fields in alphabetical collection order rather than by generation order, which caused false-positive reference errors (child records validated before parent records existed). The team identified this issue through test failures and directed a correction. The final implementation validates in generation order and defers reference checks until parent collections are confirmed valid.

**Concrete example — SSE Streaming:**

The streaming generation feature (Server-Sent Events for real-time data as GPT-4 generates each collection) required significant human-AI collaboration. Claude Code generated the initial SSE implementation, but:
- The OpenAI streaming API changed response format between the training cutoff and the implementation date
- The first SSE implementation held the HTTP connection open indefinitely on error (no proper stream termination)
- Token-by-token streaming of JSON required a custom incremental JSON parser that Claude could not produce correctly on the first attempt

The team resolved these through three iterative Claude Code sessions with detailed error context provided in each prompt.

---

#### Tool: MCP Servers — Integrated Tooling

The team configured nine MCP (Model Context Protocol) servers to give Claude Code access to live system state during development:

| MCP Server | Use during development |
|-----------|----------------------|
| `github` | PR reviews, issue tracking, branch management |
| `mongodb` | Schema inspection, query testing against live dev DB |
| `context7` | Library documentation lookup (Next.js, Mongoose, OpenAI SDK) |
| `chrome-devtools` | UI testing, network request inspection |
| `next-devtools` | Next.js build analysis |
| `shadcn` | UI component selection and preview |
| `vercel` | Deployment status, env variable management |
| `v0` | Rapid UI component prototyping |
| `figma` | Design asset inspection |

**Notable MCP-assisted workflow:** When debugging a TypeScript 5.9 compatibility issue on Vercel builds (Zod schema inference failing with the newer TypeScript version), the `context7` MCP server was used to pull the exact Zod 3.x documentation on `ZodSchema` assertions, which led directly to the fix committed in `68be8e9` ("Use ZodSchema assertion for SchemaField to satisfy TS 5.9 on Vercel").

---

### 4.4 Testing and Validation Phase

#### Tool: Claude Code — Test Generation

For each feature in `packages/core`, tests were written following a test-first discipline enforced by the `testseed-tdd` skill. Claude Code generated:

- **Unit tests** for core use case functions using Jest with dependency-injected fakes (no mocking libraries required)
- **Contract tests** for API routes verifying request/response shape compliance
- **Edge case tests** derived from the `spec.md` edge case section

**Concrete example — Rollback tests:**

The rollback feature spec documented eight edge cases (missing seedBatchId, invalid format, unknown batch, already-rolled-back, no records, reverse order, tag-scoped deletion, partial failure). Claude Code generated the test scaffold for all eight, but the team added additional assertions to verify that:
- The deletion filter always includes `seedBatchId` (never deletes by document ID alone)
- No connection string appears in the returned report or event payload

These additional assertions were not suggested by the AI — they were added based on the team's security-aware reading of the spec.

**`speckit-analyze` for cross-artifact consistency:** At the end of each feature cycle, `/speckit-analyze` compared `spec.md`, `plan.md`, and `tasks.md` to flag contradictions. This automated audit caught two cases where implementation tasks deviated from the original specification without a documented rationale, prompting the team to either reconcile the spec or add an ADR entry explaining the deviation.

---

### 4.5 Deployment and Operations Phase

#### Tool: AI-Assisted CI/CD Configuration

The GitHub Actions workflows and Vercel deployment configuration were initially scaffolded by Claude Code. The CI pipeline included:
- Type checking across all workspace packages
- Lint checks (ESLint)
- Test execution (Jest)
- Monorepo-aware build (Turborepo)
- Preview deploy on PR, production deploy on merge to main

The deployment encountered several Vercel-specific issues with monorepo resolution that required iterative debugging (see commits `f551caa`, `a882a0b`, `6da7b59`). The root cause — Vercel's build system resolving workspace packages differently from local Turborepo builds — was diagnosed using a combination of Claude Code analysis and the `vercel` MCP server, which provided live build log access.

The env sync scripts (`scripts/env/`) that push secrets to both Vercel projects and GitHub Actions were generated by Claude Code and required no modification.

---

### 4.6 AI Limitations and Failure Cases

The team encountered the following systematic limitations:

| Limitation | Example | Resolution |
|-----------|---------|------------|
| **Edge case blindness** | ChatGPT failed to generate user stories for partial insertion failure, security constraints, or streaming error states | Team manually authored all edge case stories after AI drafting |
| **Temporal knowledge cutoff** | OpenAI streaming API response format had changed; Claude Code's initial implementation was for the old format | Team provided updated API documentation via context7 MCP and corrected |
| **Architecture boundary violations** | In two early implementations, Claude Code imported `@testseed/db` directly from within `packages/core`, violating the dependency rule | Team added explicit boundary check to the system prompt for all subsequent core-related tasks |
| **JSON hallucination** | AI-generated seed data for the self-validation test datasets included invalid ObjectId references (referencing non-existent parent records) | Discovered during `validateGeneratedDataset` execution; root cause was the AI generating IDs independently per collection rather than sharing the parent collection's generated IDs |
| **Overconfident API claims** | Claude stated that the `mongosh` `ping` command format was `{ ping: 1 }` when it should be the native driver's `db.command({ ping: 1 })` — correct, but with a different method signature than stated | Verified against MongoDB native driver documentation via `context7` MCP before committing |
| **LucidChart XML failure** | AI-generated XML architecture diagram was not parseable by LucidChart | Diagram drawn manually |
| **Incremental JSON parsing** | Claude could not produce a correct incremental JSON parser for streaming SSE token processing on first attempt | Three iterative sessions; final implementation written with substantial human guidance |

---

### 4.7 Team Decision-Making Around AI

The team established explicit guidelines for AI use after observing failure patterns in the first week:

**Guideline 1 — AI drafts, humans own security and edge cases.**  
Any acceptance criterion touching authentication, authorization, data persistence, connection string handling, or error states was written or reviewed by a human team member. AI suggestions in these areas were treated as starting points requiring explicit verification.

**Guideline 2 — Use AI for breadth, human for depth.**  
AI tools were most valuable for generating the first 70% of a feature (structure, happy path, type scaffolding). The remaining 30% — partial failures, security audit, cross-feature consistency — required human-directed coding sessions.

**Guideline 3 — Verify architectural compliance before every merge.**  
The `testseed-security-review` and `/code-review` Claude Code skills were run on every PR before merge. This automated review caught three cases of potential connection string exposure in error messages during the direct seeding implementation.

**Guideline 4 — Document AI decisions in research.md.**  
Every feature's `research.md` documented which design decisions were AI-influenced and which were team-driven, with explicit rationale for each. This provided audit trail for post-hoc evaluation of AI recommendations.

**Guideline 5 — Reject AI code that cannot be explained.**  
If a team member could not explain why AI-generated code worked, it was either rewritten or a learning session was conducted before the code was merged. This policy prevented the codebase from accumulating "magic" code that would have created maintenance liabilities.

---

## 5. Code Quality and Functionality

### 5.1 Feature Completeness

TestSeed shipped **73 production features** spanning the complete product surface:

| Category | Features Shipped |
|----------|----------------|
| Account and authentication | 10 |
| Projects and workspace | 8 |
| Project context | 4 |
| Schema input and review | 8 |
| AI seed generation | 6 |
| Refinement and regeneration | 6 |
| Saved datasets | 6 |
| Preview and inline editing | 6 |
| Export (JSON, JS script, Direct seed) | 8 |
| Rollback and project history | 4 |
| UI platform | 7 |
| **Total** | **73** |

### 5.2 Code Organization

The codebase demonstrates consistent application of clean architecture principles throughout:

**Core use case pattern (example: direct MongoDB seeding):**

```typescript
// packages/core/src/generation/direct-mongodb-seeding.ts
export interface DirectMongoSeedingDeps {
  clientFactory: DirectMongoClientFactory;          // injectable MongoDB client
  generateSeedBatchId?: () => string;              // injectable UUID generator
  generateInsertionObjectId?: () => string;        // injectable ID generator
  createConnectionFingerprint?: (s: string) => string; // injectable HMAC function
}

export async function seedMongoDataset(
  request: DirectSeedingRequest,
  deps: DirectMongoSeedingDeps
): Promise<DirectSeedingReport> {
  // 1. Validate: confirmed flag, connection test token, dataset
  // 2. Generate seedBatchId
  // 3. Copy records with seedBatchId (never mutate input)
  // 4. Insert in generationOrder; stop on first failure
  // 5. Close client in finally (all paths)
  // 6. Return structured report (no connection string)
}
```

All three dependencies are interfaces, not concrete classes. Production code injects the MongoDB native driver; tests inject deterministic fakes. No mocking libraries are required.

**Validation engine architecture:**

The `validateGeneratedDataset` function enforces eight constraint categories before any data is exported or inserted:
1. Extra collections not in schema
2. Missing collections required by schema
3. Record count mismatches from user-specified counts
4. Type constraint violations per field
5. Enum violations (values not in declared enum set)
6. Required field absence
7. Uniqueness violations within a collection
8. Unresolved cross-collection references (ObjectId pointing to non-existent parent)

This validation runs both client-side (real-time indicators in the workbench UI) and server-side (as a gate before export or seeding operations).

### 5.3 Security Implementation

The following security controls are implemented and enforced:

| Control | Implementation |
|---------|---------------|
| JWT authentication | All API routes behind `authenticateToken` middleware |
| Owner-scoped data access | `projectId` + `actorId` checked in every core use case |
| Password hashing | bcrypt with configurable cost factor |
| OTP expiry | Redis TTL enforced; tokens single-use |
| Transient connection strings | Never persisted, logged, or included in responses |
| `seedBatchId`-scoped rollback | Deletion filter always includes `seedBatchId`; never deletes untagged records |
| Input validation | Zod schemas on all API request bodies |
| No direct MongoDB URI storage | `seed_batches` and `project_events` models contain no connection string fields |

### 5.4 API Design

The API surface covers 25 endpoints across six Express routers:

| Router | Endpoints | Example |
|--------|-----------|---------|
| `auth.ts` | 9 | `POST /auth/register/request-otp` |
| `schema.ts` | 4 | `POST /schemas/mongodb/discover` |
| `projects.ts` | 8 | `PATCH /projects/:id/restore` |
| `generation.ts` | 9 | `POST /projects/:id/direct-seeding` |
| `history.ts` | 2 | `GET /projects/:id/history` |
| `rollback.ts` | 2 | `POST /projects/:id/rollback` |

Every endpoint uses stable error codes (`DIRECT_SEED_CONNECTION_TEST_REQUIRED`, `ROLLBACK_BATCH_ALREADY_ROLLED_BACK`, etc.) documented in the feature contracts. Clients rely on codes, not on HTTP status text.

---

## 6. Documentation Quality

### 6.1 Project README

The project README (`README.md`) provides:
- **Quick start** with four commands from clone to running locally
- **Environment variable reference** with purpose for every required variable
- **Monorepo structure** with package dependency graph
- **Docker Compose** for local full-stack setup
- **Deployment guide** for Vercel two-project setup
- **Feature flag reference** for env-gated UI capabilities

### 6.2 Architecture Decision Records (ADRs)

Three durable architectural decisions are documented in `docs/adr/`:

| ADR | Decision | Rationale |
|-----|----------|-----------|
| 0001 | Clean architecture with strict dependency direction | Testability, maintainability, team cognitive load |
| 0002 | Monorepo with Turborepo now, polyrepo option later | Small team velocity with clear package boundaries |
| 0003 | Immutable dataset version history (target design) | User safety when iterating on generated data |

### 6.3 Per-Feature Specification Artifacts

Every shipped feature has a specification folder under `specs/` containing:

```
specs/012-direct-mongodb-seeding/
├── spec.md           # User stories, requirements, edge cases, success criteria
├── plan.md           # Implementation approach, constitution check, project structure
├── research.md       # Design decisions with rationale and alternatives
├── data-model.md     # Request/response types, validation rules, state transitions
├── quickstart.md     # End-to-end validation guide
└── contracts/
    └── direct-mongodb-seeding-core.md  # Interface definitions, error codes, HTTP examples
```

Fourteen features have complete specification packages. This documentation level substantially exceeds what would be produced in a non-AI-assisted workflow — the AI tooling made comprehensive spec writing sustainable within sprint timelines.

### 6.4 Shipped Features Inventory

`docs/shipped-features.md` serves as a living inventory of all 73 production capabilities, indexed by feature number, category, UI location, API endpoint, and spec folder. It is maintained as a single source of truth for product/engineering/QA alignment.

### 6.5 Additional Design Documentation

| Document | Content |
|----------|---------|
| `docs/architecture.md` | Layer responsibilities, dependency rules, testing conventions |
| `docs/requirements.md` | Epics, user stories, acceptance criteria, alternative flows |
| `docs/ui-design.md` | Visual system, semantic tokens, page patterns, shell structure |
| `docs/auth-email-otp.md` | All OTP flows (registration, login, password reset, email change) |
| `docs/github-auth-design.md` | GitHub OAuth design and callback flow |
| `docs/dataset-version-history.md` | Target immutable versioning design (planned future feature) |

---

## 7. User Story Mapping

The following maps the user journey through TestSeed, from initial account creation to database rollback.

### Epic 1 — Account and Authentication

| User Story | Acceptance |
|------------|------------|
| As a new user, I register with email and OTP | OTP emailed within 30s; account created on verification |
| As a returning user, I log in with email/password | JWT returned; session stored client-side |
| As a developer, I log in via GitHub OAuth | Account created/linked on first login; no extra registration |
| As a user, I update my display name | Change reflects immediately in shell |
| As a user, I change my email | OTP verification required for new email |
| As a user, I reset my forgotten password | OTP-gated; new password accepted on verification |
| As a user, I delete my account | Requires password + typing "DELETE"; data removed |

### Epic 2 — Projects and Workspace

| User Story | Acceptance |
|------------|------------|
| As a developer, I create a project with a name and description | Project appears in dashboard immediately |
| As a developer, I view all my projects with lifecycle filters | Active, archived projects visible; search works |
| As a developer, I archive a project I no longer need | Removed from default list; restorable |
| As a developer, I hard-delete a project | Permanent; confirmation required |

### Epic 3 — Schema Input

| User Story | Acceptance |
|------------|------------|
| As a developer, I paste a Mongoose schema and have it parsed | Fields, types, enums, and references extracted |
| As a developer, I discover schema from a live MongoDB connection | Collections inferred from sample documents |
| As a developer, I review and confirm the parsed schema before generation | Can inspect every field; save creates versioned snapshot |

### Epic 4 — AI Seed Generation

| User Story | Acceptance |
|------------|------------|
| As a developer, I specify record counts per collection | Counts passed to AI; generation respects them |
| As a developer, I generate seed data with one click | Data appears per collection; streaming shows progress |
| As a developer, I see validation errors on generated data | Errors shown inline by collection and field |
| As a developer, I refine generated data via natural language chat | AI returns updated dataset; new saved run created |
| As a developer, I request a full regeneration with feedback | Candidate shown for review before accepting |

### Epic 5 — Preview and Editing

| User Story | Acceptance |
|------------|------------|
| As a developer, I view generated data in per-collection tables | All records shown with field-level detail |
| As a developer, I edit a cell value inline | Commit on blur; server revalidates immediately |
| As a developer, I cannot accidentally edit reference fields | `_id`, ObjectId refs, objects/arrays are read-only |

### Epic 6 — Export

| User Story | Acceptance |
|------------|------------|
| As a developer, I download the generated data as JSON | Full dataset available for download or clipboard copy |
| As a developer, I export a JavaScript seed script | Script generated in dependency order; importable into Node project |

### Epic 7 — Direct MongoDB Seeding

| User Story | Acceptance |
|------------|------------|
| As a developer, I test my MongoDB connection string | Server confirms connectivity; returns database name and test token |
| As a developer, I see a confirmation summary before inserting | Database name, collections, record counts, and irreversibility warning displayed |
| As a developer, I confirm direct insertion | All records inserted in dependency order; each tagged with `seedBatchId` |
| As a developer, I see an insertion report | Per-collection counts, batch ID, and any failed collections shown |
| As a developer, my connection string is never stored | Verified: no connection string in DB, responses, or logs |

### Epic 8 — Rollback and History

| User Story | Acceptance |
|------------|------------|
| As a developer, I view all seeding events in project history | History tab shows all inserts, refinements, rollbacks |
| As a developer, I roll back a seed batch by ID | Records deleted in reverse dependency order; batch marked `rolled_back` |
| As a developer, I cannot roll back an already-rolled-back batch | System rejects duplicate rollback with clear error |

---

## 8. Reflections and Lessons Learned

### 8.1 What AI Changed in Our Workflow

**Specification quality improved substantially.** Prior to Spec Kit, user stories were written informally and varied greatly in acceptance criteria quality. The Spec Kit workflow produced consistent, testable acceptance criteria for every feature, documented design decisions before implementation, and forced edge case enumeration as part of the spec process rather than as an afterthought.

**Implementation velocity was high but not uniform.** For well-defined features with complete specifications, Claude Code implementation was 3–5× faster than manual coding. For features requiring novel algorithm design (topological sort for dependency resolution, incremental SSE parsing) or security-critical logic (connection fingerprinting, rollback deletion scoping), AI assistance was significantly less efficient and sometimes produced code that required complete rewrites.

**Documentation as a byproduct.** The most unexpected benefit was that comprehensive documentation — 14 feature specs, 14 plans, 42 supporting artifacts — was produced as a natural part of the AI-assisted development workflow rather than as a separate, often-skipped phase.

### 8.2 What Did Not Change

**Human architectural ownership remained essential.** The clean architecture boundary (no `@testseed/db` imports in `packages/core`) was violated twice by AI-generated code and caught in PR review. Maintaining architectural integrity requires human understanding of the system's design intent — this cannot be delegated to the AI.

**Security review cannot be outsourced.** The transient connection string constraint was identified by Claude in an architecture review, but verifying that every implementation path respected it required manual code review by team members who understood both the constraint and the codebase. AI-assisted security scanning (`testseed-security-review` skill) helped but was not sufficient on its own.

**Team communication did not change.** AI tools accelerated individual contributions but did not substitute for team coordination. Sprint planning, task allocation, conflict resolution, and code review remained human-driven processes.

### 8.3 Recommendations for Future Teams

1. **Invest in prompt infrastructure before implementation begins.** Custom Claude Code skills, Spec Kit configuration, and MCP server setup required approximately one week of team time. This investment paid back 3–4× in implementation speed over the remaining three weeks.

2. **Treat AI output as a first draft, not a final answer.** The teams that struggled with AI tools were those that merged AI-generated code without review. Every AI output in this project was reviewed by at least one team member who understood the specification it was supposed to implement.

3. **Use AI for breadth, human judgment for depth.** AI excels at generating complete structural coverage quickly. Human expertise is required for the hard 20%: security constraints, failure recovery, architectural consistency, and novel algorithm design.

4. **Document AI decisions explicitly.** The `research.md` artifact in each feature spec was the most valuable documentation for post-hoc evaluation. Teams should record not only what the AI suggested but why the team accepted, modified, or rejected it.

---

## 9. Conclusion

TestSeed demonstrates that AI-assisted software engineering, when applied with discipline and critical judgment, can substantially accelerate a team's ability to deliver complex, well-documented software within tight academic timelines.

The 73 features shipped across 29 pull requests represent a scope that would typically require 6–8 weeks of development for a team of four; we delivered it in four weeks. The quality of the specification artifacts, architecture documentation, and test coverage exceeds what the team would have produced without AI assistance.

However, the project also demonstrates clearly that AI is a force multiplier on human capability, not a replacement for it. The most important contributions — the transient connection string security constraint, the clean architecture boundary enforcement, the rollback deletion safety design — all originated from or were significantly shaped by human reasoning. AI generated the volume; humans provided the judgment.

The TestSeed codebase, its specification library, and this report together constitute a detailed record of how AI can be integrated responsibly and effectively across the full software development lifecycle.

---

**Source Code:** https://github.com/hanaessam/testseed  
**Live Application:** https://testseed-web.vercel.app  
**Setup Instructions:** See `README.md` in the repository root  
**Feature Inventory:** `docs/shipped-features.md`  
**Architecture:** `docs/architecture.md`  
**Per-Feature Specs:** `specs/` directory (14 feature specification packages)
