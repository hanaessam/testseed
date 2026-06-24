# TestSeed: AI-Powered Database Seeding Agent

## CISC 818 Software Engineering with AI — Assignment 4 Team Report

**Course:** CISC 818 — Software Engineering with AI  
**Institution:** Queen's University, School of Computing  
**Team 4:** Hana Essam · Mariam Philip · Mazen Bahgat · Hassan Albattra  
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
   - 4.1 AI Toolchain Overview
   - 4.2 Requirements and Scope Planning
   - 4.3 Architecture and Design
   - 4.4 UI/UX Design
   - 4.5 Implementation — Backend
   - 4.6 Implementation — Frontend
   - 4.7 Testing and Quality
   - 4.8 Deployment and DevOps
   - 4.9 AI Limitations Encountered
   - 4.10 Team Decision-Making Around AI
5. [Code Quality and Functionality](#5-code-quality-and-functionality)
6. [Documentation Quality](#6-documentation-quality)
7. [User Story Mapping](#7-user-story-mapping)
8. [Individual Contributions and Reflections](#8-individual-contributions-and-reflections)
9. [Conclusion](#9-conclusion)

---

## Rubric Alignment and Evidence Map

This report is organized to make the Assignment 4 evidence easy to locate. The table below maps the expected grading areas to the sections and repository artifacts that support them.

| Rubric area                                    | Where addressed   | Primary evidence                                                                      |
| ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| Project motivation and requirements continuity | Sections 1, 2, 7  | Project proposal, `docs/requirements.md`, Assignment 2 requirements/design package    |
| Implemented functionality and user stories     | Sections 5, 7     | `docs/shipped-features.md`, `apps/web/`, `apps/api/src/routes/`, `packages/core/src/` |
| Architecture and code quality                  | Sections 3, 5     | `docs/architecture.md`, `docs/adr/`, `AGENTS.md`, monorepo packages                   |
| AI use across the SDLC                         | Section 4         | `docs/ai-assisted-tooling.md`, Spec Kit feature folders, AI usage log template        |
| Testing, validation, and release readiness     | Sections 4.7, 5.3 | Core/API/web test suites, `npx turbo build lint test`, Docker/Vercel setup            |
| Documentation quality and maintainability      | Section 6         | README, shipped feature inventory, ADRs, per-feature specs and contracts              |
| Individual contribution and reflection         | Section 8         | Member-specific AI tool use, concrete implementation examples, lessons learned        |

---

## 1. Executive Summary

TestSeed is a full-stack web application that solves a concrete problem faced by every development team: the slow, manual, and fragile process of populating test databases with realistic data. Using OpenAI's GPT-4 as its reasoning engine, TestSeed accepts a project description and a Mongoose schema, analyzes entity relationships, generates statistically realistic and referentially consistent seed data in dependency order, and either exports it as JSON/JavaScript seed scripts or inserts it directly into a target MongoDB database.

Over a four-week sprint, Team 4 shipped **73 production features** across a heavily active GitHub repository with **101 local commits at the time of report preparation**. The application is fully deployed on Vercel and covers the complete user journey: account management, project workspaces, schema input (manual paste or live MongoDB discovery), AI-powered seed data generation with streaming output, chat-based iterative refinement, inline editing, saved runs, export, direct MongoDB seeding with `seedBatchId` tracking, and one-click rollback.

AI was not a single tool used for coding assistance — it was woven into every phase of the SDLC. The team shared a common AI stack (Cursor with Codex, Spec Kit, GitHub Superpowers, Figma AI, nine MCP servers, GitHub Copilot, and GitHub Actions), and each member applied specific tools to their assigned epics. This report documents that tooling, the concrete outcomes it produced, the limitations encountered, and the team's decision-making process around when to trust, correct, or override AI output.

---

## 2. Problem Statement and Motivation

Development and QA teams routinely spend a disproportionate share of project setup time creating seed data. The root causes are:

- **Manual construction is slow and error-prone.** Writing seed scripts for a ten-collection Mongoose schema requires understanding all fields, types, enums, and cross-collection reference constraints simultaneously.
- **Naive randomization tools are schema-blind.** Tools like `faker.js` or Mockaroo fill fields with plausible-looking data but have no awareness of relationships — foreign keys point to non-existent documents, enums are violated, and parent/child cardinality assumptions are ignored.
- **Scripts are discarded at schema migration time.** When schemas change, manually written seed scripts must be rewritten from scratch.

TestSeed addresses all three problems. The system understands schema semantics via GPT-4, generates data that satisfies reference constraints in topological order, and is regenerable from any schema version in seconds.

---

## 3. System Architecture and Technology Stack

### 3.1 Technology Stack

| Layer                | Technology                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| Frontend             | Next.js 14 (App Router), React 18, Redux Toolkit, Tailwind CSS, shadcn/ui         |
| Backend              | Express.js, Node.js 20+, Zod request validation                                   |
| AI Engine            | OpenAI GPT-4 (structured JSON generation, chat refinement, feedback regeneration) |
| Application Database | MongoDB Atlas with Mongoose 8                                                     |
| Auth                 | JWT, bcrypt, email OTP via SMTP, GitHub OAuth                                     |
| Cache                | Upstash Redis (OTP storage)                                                       |
| Monorepo             | Turborepo with npm workspaces                                                     |
| CI/CD                | GitHub Actions, Vercel (two-project deployment)                                   |
| Primary AI Agent     | Cursor with Codex                                                                 |
| Planning Framework   | Spec Kit (spec-driven development) + GitHub Superpowers                           |

### 3.2 Clean Architecture

The project enforces a strict unidirectional dependency graph:

```
packages/types → packages/db → packages/core → apps/api → apps/web
```

- **`packages/types`** — Shared TypeScript contracts only. Every API request, response, and error type is defined here; no logic.
- **`packages/db`** — Mongoose models and repository factories. Owns persistence and converts documents to typed DTOs.
- **`packages/core`** — Framework-free business use cases. Receives all dependencies as parameters — no Express, Next.js, Mongoose, or environment variable imports.
- **`apps/api`** — Thin Express HTTP adapter. Validates inputs, calls core, returns JSON. No business logic.
- **`apps/web`** — Next.js frontend. Calls the API over HTTP; imports only `@testseed/types`. Never imports backend packages.

This architecture was codified in `AGENTS.md` (generated with Codex assistance) and enforced across all 29 pull requests by the `testseed-security-review` custom skill and PR review.

### 3.3 Monorepo Structure

```
testseed/
├── apps/
│   ├── api/              # Express HTTP adapter
│   └── web/              # Next.js React frontend
├── packages/
│   ├── core/             # Framework-free business logic
│   ├── db/               # MongoDB adapters and Mongoose models
│   └── types/            # Shared TypeScript contracts
├── docs/                 # Architecture docs, ADRs, design notes
├── specs/                # 15 feature specification directories
├── .agents/skills/       # 7 custom TestSeed Codex skill files
└── .specify/             # Spec Kit workflow configuration
```

---

## 4. AI Usage Across the Software Development Lifecycle

### 4.1 AI Toolchain Overview

AI was not just a coding tool — it was integrated into every phase of the SDLC, and the whole team shared the same core stack. The table below summarises the toolchain by phase before each phase is described in detail.

| SDLC Phase                | Primary AI Tools                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Requirements & Planning   | Spec Kit (`/speckit-specify`, `/speckit-clarify`), GitHub Superpowers                          |
| Architecture & Design     | Superpowers + Codex (architecture review, AGENTS.md), Figma AI + Figma MCP                     |
| UI/UX                     | Figma AI (wireframes), Figma MCP → React translation, shadcn MCP (components)                  |
| Implementation — Backend  | Cursor + Codex, 7 custom TestSeed skills, MongoDB MCP, Context7 MCP                            |
| Implementation — Frontend | Cursor + Codex, shadcn MCP, Figma MCP, next-devtools MCP                                       |
| Testing                   | `testseed-tdd-change` custom skill, Codex (unit tests), Claude (adversarial + security review) |
| Deployment                | Vercel MCP (inside Cursor), GitHub Actions, GitHub Copilot (PR merge conflict resolution)      |

**MCP servers configured and used:**

| Server            | Purpose                                                          | Key User       |
| ----------------- | ---------------------------------------------------------------- | -------------- |
| `github`          | Issues, PRs, merge resolution                                    | All            |
| `mongodb`         | Read-only live schema context, insertion and rollback validation | Mariam, Hassan |
| `context7`        | Up-to-date library docs (JWT, Mongoose, OpenAI SDK)              | All            |
| `chrome-devtools` | Browser debugging, network inspection                            | All            |
| `next-devtools`   | Next.js dev server introspection, streaming debug                | All            |
| `shadcn`          | UI component registry and scaffolding                            | Hassan, Mazen  |
| `figma`           | Design ↔ code translation, design-system alignment               | Mariam, Hana   |
| `vercel`          | Deployment, env variables, live build logs                       | All            |
| `v0`              | Rapid UI component prototyping                                   | Hassan         |

**Custom TestSeed skill files (`.agents/skills/`):**

| Skill                      | Purpose                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `testseed-feature`         | Builds a feature layer by layer: types → core → API route → web screen   |
| `testseed-core-module`     | Business logic in `packages/core` following dependency injection pattern |
| `testseed-api-route`       | Express routes in `apps/api` as thin adapters                            |
| `testseed-ai-generation`   | OpenAI prompt structure, validation pipeline, AI JSON retries            |
| `testseed-tdd-change`      | Test-first development; keeps the monorepo gate runnable                 |
| `testseed-security-review` | Audits for connection string leakage, auth bypass, rollback safety       |
| `testseed-readme-update`   | Updates README when setup, env vars, or user-visible flows change        |

---

### 4.2 Requirements and Scope Planning

**Tool: Spec Kit — Feature Specification Pipeline**

Natural-language feature descriptions produced inconsistent epics when written by hand, so the team adopted Spec Kit to provide a repeatable pipeline for every feature:

```
/speckit-specify  →  spec.md  (requirements, user stories, acceptance criteria, edge cases)
/speckit-clarify  →  resolves ambiguities with up to 5 targeted questions
/speckit-plan     →  plan.md + research.md + data-model.md + contracts/
/speckit-tasks    →  tasks.md (dependency-ordered implementation checklist)
/speckit-implement →  executes tasks in order
```

The team drove **15 feature directories** through this pipeline, customizing the Spec Kit commands for the TestSeed repository. Fourteen feature folders contain full implementation-planning packages, while `015-dataset-version-history` captures the next planned version-history design. Each implementation-ready `spec.md` produced by Spec Kit contained structured user stories with independent testability criteria, functional requirements with stable error codes, edge cases enumerated before any code was written, and measurable success criteria.

**Concrete example:** Mariam described the "Preview and Editing" feature in plain English. Spec Kit produced a complete `spec.md` with acceptance criteria, data flow, and UI contracts. This eliminated the ambiguity that would have arisen from informal story writing and gave the implementation agent (Codex) a precise behavioral target.

**Limitation:** The AI consistently over-expanded scope, suggesting SQL support, Prisma integration, and team workspaces. As a team, we decided to freeze scope at our core 11 epics to remain feasible within the four-week course timeline.

---

**Tool: GitHub Superpowers — Initial PRD and Requirements Planning**

Before Spec Kit was fully adopted, the team used GitHub Superpowers at the very start of the project to structure the requirements from the proposal. Superpowers followed a structured workflow: it inventoried the project directory, found and processed the four proposal PDFs, and extracted requirements in layers before making any recommendations.

It also forced a scope decision that proved consequential: Superpowers classified direct seeding and rollback as **core** requirements rather than optional stretch goals, which meant the requirements had to explicitly cover insertion safety, confirmation flow, the `seedBatchId`, insertion reporting, and rollback behavior — all of which became the foundation of specs 012 and 013. It also recommended architectural tools: Mermaid/draw.io for architecture diagrams and a structured table for the requirements document.

---

### 4.3 Architecture and Design

**Tool: GitHub Superpowers + Codex — Architecture Options and AGENTS.md**

For the system architecture, the team needed a coherent three-tier design quickly. Superpowers provided task-by-task implementation guides for the initial planning phase, and Codex evaluated architectural options — specifically comparing Next.js API routes against a separate Express server, recommending the cleaner Express separation given the four-week sprint timeline and the need for a deployable API endpoint independent of the web app.

Most significantly, Codex generated `AGENTS.md` — the project's primary coding agent guide — which codifies the strict dependency direction (`types → db → core → api → web`) that every team member and every AI agent follows throughout the project. Critically, Codex identified the security boundary around MongoDB connection strings as an **explicit architectural constraint** that needed to be in the architecture document, not just mentioned in prose. This became the "transient connection string" design rule: connection strings are used in-memory only during the active operation and are never stored, logged, or returned.

**Limitation:** AI initially suggested an over-complex microservice pattern that would have been unworkable in a four-week sprint. The team overrode this and chose monorepo with two Vercel deployments (web + api), which proved simpler to manage and deploy.

---

### 4.4 UI/UX Design

**Tool: Figma AI — Wireframe Generation**

Designing eight screens in one sprint by hand was not feasible. Figma AI generated high-fidelity wireframes from structured prompts in hours, covering login, registration, schema input, schema review, the generation workbench with three-pane layout, inline editing, the export drawer, and the rollback UI.

**Tool: Figma MCP — Design-to-Code Translation**

The Figma MCP, operating inside Cursor, translated the Figma designs directly into React. For Mariam's schema-review screen, Cursor used the Figma MCP to fetch the design context, read the component guidelines and design system, and then rework the review flow to match — producing a wizard-style step indicator, a left-rail collection sidebar, and consistent card layouts — by editing the React components directly without Mariam leaving the editor.

**Tool: shadcn MCP — Component Scaffolding**

The shadcn MCP scaffolded the DataTable, Dialog, Form, and Toast components used throughout the workbench and export drawer, providing a consistent component base that aligned with the Figma design system.

**Limitation:** Figma AI wireframes were generic and the inline-editing components required substantial customization beyond what shadcn and Figma AI produced. MCP-generated components needed manual wiring to the shared Redux project state. The team treated all AI-generated UI output as a starting draft and reviewed every screen against the feature requirements before implementation.

---

### 4.5 Implementation — Backend

**Primary tools: Cursor + Codex, custom TestSeed skills, MongoDB MCP, Context7 MCP**

The backend spans schema parsing, AI prompt construction, output validation, seeding, and rollback — too many concerns for one sprint without agent assistance. The custom `testseed-feature` skill was the primary implementation driver: it builds a complete feature layer by layer (types → core use case → API route → web screen), following the dependency direction automatically so the AI agent respected architectural boundaries without repeated reminders.

The `testseed-ai-generation` skill guided the structure of OpenAI prompts for seed generation. The feedback-based regeneration endpoint is the clearest example: the prompt template combines the previous output, the user's feedback, and the schema constraints, with backend retries on malformed JSON. The team rule was **"validate before display"** — all AI output from OpenAI stays a draft until it passes server-side validation through `validateGeneratedDataset`.

The **MongoDB MCP** (read-only) gave Codex live collection structures during schema discovery and rollback development, making field-inference heuristics accurate on the first pass rather than requiring rounds of test-and-fix against synthetic data. The **Context7 MCP** supplied up-to-date library documentation for JWT, Mongoose, and the OpenAI SDK — catching one case where cached training data referenced an outdated OpenAI streaming response format.

**Concrete example — Mazen's generation pipeline:** Mazen used **ChatGPT-4o** specifically to produce the generation prompt template — the structured parent-before-child ordering instruction that tells GPT-4 to generate parent collection records first and inject their IDs as context for dependent collections. This was then integrated into the `testseed-ai-generation` skill so all subsequent generation work followed the same pattern.

**Concrete example — Hana's authentication layer:** GitHub Copilot provided inline completion on the auth routes and the Mongoose schema parser's regex patterns. In one pass, Cursor refactored the GitHub OAuth callback across three files — correctly separating repository-context state (fetching repo metadata for AI generation context) from account login state, a distinction Hana's first manual attempt had conflated.

**Limitation:** Validation initially missed partial-ObjectId edge cases — the model generated child collection records with orphaned references when the parent collection's generated IDs were not explicitly injected as context. This required adding post-generation validation and a retry prompt that feeds back the violated constraint. Context7 occasionally returned outdated documentation.

---

### 4.6 Implementation — Frontend

**Primary tools: Cursor + Codex, shadcn MCP, Figma MCP, next-devtools MCP**

On the frontend, Cursor with the shadcn, Figma, and next-devtools MCP servers cut repetitive React and Tailwind boilerplate, freeing each developer to focus on stateful logic and validation UX.

**Concrete example — Preview and Editing workbench:** The workbench's editable table started as a shadcn DataTable scaffold. The Cursor agent added inline cell editing with validation highlighting in the same implementation pass, producing a functional editable preview with per-cell validation badges and commit-on-blur behavior. The `next-devtools` MCP was used to debug streaming SSE updates and inspect the component state during development.

The architecture rule held throughout: all business logic stays in `packages/core` via the API, and `apps/web` never imports backend packages. When Codex violated this in two early implementations (importing `@testseed/db` from a web component), the `testseed-security-review` skill caught it in PR review.

**Limitation:** Editable cells needed custom logic beyond shadcn's defaults (enum dropdowns, reference field read-only rules, revalidation on commit). MCP-generated components needed manual wiring to the shared Redux state. The next-devtools MCP was valuable for debugging but not for building new components.

---

### 4.7 Testing and Quality

**Tool: `testseed-tdd-change` custom skill — Test-First Development**

Every feature went through the `testseed-tdd-change` skill, which enforces test-first development and keeps the monorepo gate runnable. Each feature branch started with tests before implementation, and the `npx turbo build lint test` gate ran before any merge.

**Tool: Codex — Unit Test Generation**

Codex generated unit tests for validation logic, the schema parser, and the export pipeline. For the feedback-based regeneration endpoint, Codex generated adversarial inputs for cases where user feedback conflicts with schema constraints — for example, a feedback instruction to "make all email addresses @gmail.com" conflicting with the uniqueness constraint when generating ten users. Three-plus-collection edge cases were added manually.

**Tool: Claude — Adversarial Testing and Security Review (Hassan's seeding epics)**

For the direct seeding and regeneration features, Hassan used Claude specifically for adversarial testing and security review, guided by the `testseed-security-review` skill. Claude generated edge-case inputs that exposed bugs in the constraint-preservation logic — specifically, cases where feedback conflicts with required or unique fields. It also flagged that a MongoDB connection string was being written to a debug log, which the team removed before merge. This is a concrete example of AI catching a real security issue in the implementation.

**Limitation:** AI-generated tests that call the OpenAI API are expensive to run in CI and were excluded from the automated gate. Security and connection-string-leakage tests were written manually. However, the `testseed-tdd-change` skill kept testing discipline consistent across all four team members throughout the sprint.

---

### 4.8 Deployment and DevOps

**Tools: Vercel MCP (inside Cursor), GitHub Actions, GitHub Copilot**

Deployment was deliberately made a shared, low-friction responsibility for all four team members. The **Vercel MCP inside Cursor** handled project linking, environment variable management, and shipping builds directly from the editor — no team member needed to open a browser dashboard to deploy. A concrete example from Hana's work: she asked Cursor to sync environment variables to Vercel and deploy both projects; the Vercel MCP ran Get Deployment, inspected the API build, deployed the web app to production, fetched the live URLs, and when the API health endpoint returned an error, it pulled runtime logs through the same MCP — all without leaving the editor.

**GitHub Actions** automated the CI pipeline: every push to main triggers build, lint, and test. The `npx turbo build lint test` gate guarantees a deployable build before any merge.

**GitHub Copilot** served as a coding agent on GitHub for pull request merge conflict resolution. When PRs hit conflicts, Copilot proposed resolutions that the team reviewed and accepted — never blindly applied.

**Limitation:** MCP-driven deployments still required a human to confirm that environment variables were correct and complete. Copilot merge suggestions were always reviewed; the team treated them as starting points, not final answers.

---

### 4.9 AI Limitations Encountered

| Limitation                                    | Concrete Example                                                                                                            | Resolution                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Scope over-expansion**                      | Spec Kit and Codex repeatedly suggested SQL/Prisma support, team workspaces, and microservice architecture                  | Team froze scope to core 11 epics; overrode architecture recommendation to simpler monorepo + two Vercel projects       |
| **Orphaned ObjectId references**              | GPT-4 generated child records with IDs that did not match any parent record in the same generation call                     | Added two-phase generation (parents first, children with injected parent IDs) and post-generation validation with retry |
| **Generic schema parser output**              | Hana's initial parser suggestions assumed flat single-level schemas, missing nested objects and arrays                      | Hana provided few-shot complex input/output examples; output immediately correct after                                  |
| **Sparse-document field inference noise**     | With inconsistent MongoDB documents, AI flagged nearly every inferred field as uncertain, making the schema review UI noisy | Manual calibration of confidence thresholds against several real datasets                                               |
| **Feedback over-application in regeneration** | AI forced one email domain across all users when instructed "use gmail.com" despite uniqueness constraint                   | Hassan encoded constraint-priority rules explicitly in the regeneration prompt contract                                 |
| **Wireframe data flow errors**                | Figma AI showed the "confirm insertion" button before the connection test had completed — logically wrong                   | Manual correction of all wireframes against feature requirements before implementation                                  |
| **Context7 outdated docs**                    | Occasionally returned documentation for an older OpenAI SDK streaming format                                                | Team cross-checked against official docs when output looked unfamiliar                                                  |
| **Connection string in debug log**            | Codex implementation wrote a transient MongoDB URI to a debug logger                                                        | Claude's adversarial security review caught it before merge; log line removed                                           |
| **MCP component wiring**                      | shadcn-scaffolded components needed manual wiring to shared Redux state                                                     | Treated all MCP-generated components as structural drafts requiring integration work                                    |
| **Expensive AI integration tests**            | Tests calling the live OpenAI API are too slow and costly for the CI gate                                                   | Separated integration tests from the automated gate; run manually before releases                                       |

---

### 4.10 Team Decision-Making Around AI

The team established explicit rules after observing failure patterns in the first week:

**Rule 1 — "Validate before display."** All AI output from OpenAI (seed data, schema inferences, regenerated datasets) stays a draft until it passes server-side validation. Nothing reaches the user without the validation gate passing.

**Rule 2 — AI drafts, humans own security and edge cases.** Any acceptance criterion touching auth, data persistence, connection string handling, or rollback safety was written or reviewed by a human team member. AI suggestions in these areas were starting points requiring explicit verification.

**Rule 3 — Run `testseed-security-review` before every merge.** This custom skill audits for connection string leakage, auth bypass risks, and rollback safety. It caught three issues during the direct seeding implementation before any code reached main.

**Rule 4 — Document AI decisions in `research.md`.** Every feature's planning artifact records which design decisions were AI-influenced and which were team-driven. This created an audit trail for post-hoc evaluation and for the individual reflections in this report.

**Rule 5 — Reject AI code that cannot be explained.** If a team member could not explain why AI-generated code worked, it was either rewritten or a learning session was conducted first. This prevented the codebase from accumulating "magic" code that would become a maintenance liability.

---

## 5. Code Quality and Functionality

### 5.1 Feature Completeness

TestSeed shipped **73 production features** across the full product surface:

| Category                              | Features Shipped |
| ------------------------------------- | ---------------- |
| Account and authentication            | 10               |
| Projects and workspace                | 8                |
| Project context (domain + GitHub)     | 4                |
| Schema input and review               | 8                |
| AI seed generation                    | 6                |
| Refinement and regeneration           | 6                |
| Saved datasets (runs)                 | 6                |
| Preview and inline editing            | 6                |
| Export (JSON, JS script, direct seed) | 8                |
| Rollback and project history          | 4                |
| UI platform                           | 7                |
| **Total**                             | **73**           |

### 5.2 Code Organization

The codebase applies clean architecture patterns consistently across all 14 implemented features. The dependency injection pattern in `packages/core` is representative:

```typescript
// packages/core/src/generation/direct-mongodb-seeding.ts
export interface DirectMongoSeedingDeps {
  clientFactory: DirectMongoClientFactory; // injectable MongoDB client
  generateSeedBatchId?: () => string; // injectable UUID generator
  generateInsertionObjectId?: () => string; // injectable ID generator
  createConnectionFingerprint?: (s: string) => string; // injectable HMAC function
}

export async function seedMongoDataset(
  request: DirectSeedingRequest,
  deps: DirectMongoSeedingDeps,
): Promise<DirectSeedingReport> {
  // Validate: confirmed flag, connection test token, dataset
  // Generate seedBatchId (one per operation)
  // Copy records with seedBatchId (input never mutated)
  // Insert in generationOrder; stop on first failure
  // Close client in finally (all paths guaranteed)
  // Return structured report (connection string never included)
}
```

All dependencies are interfaces, not concrete classes. Production code injects the MongoDB native driver; Jest tests inject deterministic fakes — no mocking libraries required.

### 5.3 Validation Architecture

The `validateGeneratedDataset` function enforces eight constraint categories before any data is exported or inserted:

1. Extra collections not in schema
2. Missing collections required by schema
3. Record count mismatches from user-specified counts
4. Type constraint violations per field
5. Enum violations (values not in declared enum set)
6. Required field absence
7. Uniqueness violations within a collection
8. Unresolved cross-collection references (ObjectId pointing to non-existent parent)

Validation runs both client-side (real-time indicators in the workbench) and server-side (as a gate before export or seeding). This dual-layer approach ensures AI-generated data is always verified before it leaves the system.

### 5.4 Security Implementation

| Security Control                | Implementation                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| JWT authentication              | All API routes behind `authenticateToken` middleware                                   |
| Owner-scoped data access        | `projectId` + `actorId` checked in every core use case                                 |
| Password hashing                | bcrypt with configurable cost factor                                                   |
| OTP expiry                      | Redis TTL enforced; tokens single-use                                                  |
| Transient connection strings    | Never persisted, logged, or included in API responses                                  |
| `seedBatchId`-scoped rollback   | Deletion filter always includes `seedBatchId`; never deletes untagged records          |
| Input validation                | Zod schemas on all API request bodies                                                  |
| Connection string field absence | `seed_batches` and `project_events` Mongoose models contain no connection string field |

### 5.5 API Surface

25 endpoints across six Express routers:

| Router          | Example Endpoints                                                            |
| --------------- | ---------------------------------------------------------------------------- |
| `auth.ts`       | `POST /auth/register/request-otp`, `GET /auth/github`, `PATCH /auth/me`      |
| `schema.ts`     | `POST /schemas/parse`, `POST /schemas/mongodb/discover`                      |
| `projects.ts`   | `POST /projects`, `PATCH /projects/:id/restore`, `DELETE /projects/:id`      |
| `generation.ts` | `POST /projects/:id/generations/stream`, `POST /projects/:id/direct-seeding` |
| `history.ts`    | `GET /projects/:id/history`, `POST /projects/:id/seed-batches`               |
| `rollback.ts`   | `POST /projects/:id/rollback`, `POST /projects/:id/apply-seed-batch`         |

Every endpoint uses stable error codes (e.g., `DIRECT_SEED_CONNECTION_TEST_REQUIRED`, `ROLLBACK_BATCH_ALREADY_ROLLED_BACK`) documented in the feature contracts. Clients rely on codes, not HTTP status text, for error handling.

---

## 6. Documentation Quality

### 6.1 Project README

The README (`README.md`) provides:

- **Quick start** — four commands from clone to running locally
- **Environment variable reference** — purpose for every required variable
- **Monorepo structure** — package dependency graph
- **Docker Compose** — local full-stack setup
- **Deployment guide** — Vercel two-project setup
- **Feature flag reference** — `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT` and `NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING`

### 6.2 Architecture Decision Records

Three durable architectural decisions in `docs/adr/`:

| ADR  | Decision                                            | Rationale                                                           |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------- |
| 0001 | Clean architecture with strict dependency direction | Testability, maintainability, AI agent guidance                     |
| 0002 | Monorepo with Turborepo now, polyrepo option later  | Small-team velocity with clear package boundaries                   |
| 0003 | Immutable dataset version history (target design)   | User safety when iterating on generated data; partially implemented |

### 6.3 Per-Feature Specification Packages

Every shipped feature has a complete specification folder under `specs/`:

```
specs/012-direct-mongodb-seeding/
├── spec.md            # User stories, FRs, edge cases, success criteria
├── plan.md            # Technical context, implementation approach (12 steps)
├── research.md        # Design decisions with rationale and alternatives
├── data-model.md      # Request/response types, validation rules, state transitions
├── quickstart.md      # End-to-end validation guide with test commands
└── contracts/
    └── direct-mongodb-seeding-core.md  # Interface definitions, error codes, HTTP examples
```

Fifteen feature directories exist under `specs/`. Fourteen include complete planning artifacts (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and contracts), while `015-dataset-version-history` records the planned future version-history feature. This level of documentation would not have been produced without the AI-assisted Spec Kit workflow, since writing it manually within sprint timelines would have been deprioritized.

### 6.4 AI Tooling Documentation

`docs/ai-assisted-tooling.md` is a living inventory of every AI agent, MCP server, custom skill, and Spec Kit configuration in the repository — updated with a changelog entry after each significant tooling change. This document ensures any team member (or new agent) can understand the full AI toolchain without reading source code.

### 6.5 Additional Design Documentation

| Document                          | Content                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `docs/architecture.md`            | Layer responsibilities, dependency rules, testing conventions     |
| `docs/requirements.md`            | Epics, user stories, acceptance criteria                          |
| `docs/shipped-features.md`        | Living inventory of all 73 production capabilities                |
| `docs/ui-design.md`               | Visual system, semantic tokens, page patterns                     |
| `docs/auth-email-otp.md`          | All OTP flows (registration, login, password reset, email change) |
| `docs/github-auth-design.md`      | GitHub OAuth design and callback flow                             |
| `docs/dataset-version-history.md` | Target immutable versioning design (planned future feature)       |

---

## 7. User Story Mapping

The following maps the complete user journey through TestSeed across all eight epics.

### Epic 1 — Account and Authentication

| User Story                                            | Acceptance Criteria                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| As a new user, I register with email and OTP          | OTP emailed within 30s; account created on verification; duplicate email rejected |
| As a returning user, I log in with email and password | JWT returned; session stored client-side; invalid credentials rejected clearly    |
| As a developer, I log in via GitHub OAuth             | Account created or linked on first login; no separate registration step required  |
| As a user, I update my display name                   | Change reflects immediately in the app shell                                      |
| As a user, I change my email address                  | OTP verification required for the new email before the change takes effect        |
| As a user, I reset my forgotten password              | OTP-gated reset flow; new password accepted on verification                       |
| As a user, I delete my account                        | Requires current password plus typing "DELETE"; all project data removed          |

### Epic 2 — Projects and Workspace

| User Story                                                     | Acceptance Criteria                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| As a developer, I create a project with a name and description | Project appears in dashboard immediately; accessible from projects list |
| As a developer, I view all my projects with lifecycle filters  | Active and archived projects shown; search and sort work correctly      |
| As a developer, I archive a project I no longer need           | Removed from default list; accessible under Archived filter; restorable |
| As a developer, I restore an archived project                  | Returns to active list; all project data preserved                      |
| As a developer, I permanently delete a project                 | Requires explicit confirmation; data removed; action irreversible       |

### Epic 3 — Schema Input

| User Story                                                       | Acceptance Criteria                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| As a developer, I paste a Mongoose schema and have it parsed     | Fields, types, enums, required flags, and ObjectId references extracted correctly           |
| As a developer, I discover schema from a live MongoDB connection | Collections inferred from sample documents with confidence indicators                       |
| As a developer, I review the parsed schema before proceeding     | Every field inspectable; low-confidence inferences flagged; save creates versioned snapshot |

### Epic 4 — AI Seed Generation

| User Story                                                        | Acceptance Criteria                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| As a developer, I specify record counts per collection            | Counts passed to AI; generated data matches specified counts per collection         |
| As a developer, I generate seed data with one click               | Data appears per collection; streaming shows progressive table population           |
| As a developer, I see validation errors on generated data         | Errors shown inline by collection and field; export blocked while invalid           |
| As a developer, I refine generated data via natural language chat | AI returns updated dataset respecting schema constraints; new saved run created     |
| As a developer, I request a full regeneration with feedback       | Candidate shown for explicit review before acceptance; schema constraints preserved |

### Epic 5 — Preview and Inline Editing

| User Story                                                       | Acceptance Criteria                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| As a developer, I view generated data in per-collection tables   | All records shown with field-level detail; collection tabs navigate quickly               |
| As a developer, I edit a cell value inline                       | Commit on blur or Enter; server revalidates immediately; unsaved warning on navigate away |
| As a developer, reference fields and object fields are read-only | `_id`, ObjectId refs, and nested objects/arrays cannot be edited directly                 |

### Epic 6 — Export

| User Story                                            | Acceptance Criteria                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| As a developer, I download the generated data as JSON | Full dataset available for download or clipboard copy; export blocked when invalid |
| As a developer, I export a JavaScript seed script     | Script generated in dependency order; valid Node.js; importable into any project   |

### Epic 7 — Direct MongoDB Seeding

| User Story                                                    | Acceptance Criteria                                                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| As a developer, I test my MongoDB connection string           | Server confirms connectivity; returns database name and connection test token; string never stored             |
| As a developer, I see a confirmation summary before inserting | Database name, collections, record counts, total count, and irreversibility warning displayed                  |
| As a developer, I confirm direct insertion                    | Records inserted in dependency order; every record tagged with `seedBatchId`; partial failure reported clearly |
| As a developer, I see an insertion report                     | Per-collection counts, batch ID, and any failed collections shown; connection string absent                    |
| As a developer, my connection string is never stored          | Verified: no connection string in DB records, API responses, logs, or client state                             |

### Epic 8 — Rollback and Project History

| User Story                                                                  | Acceptance Criteria                                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| As a developer, I view all seeding and refinement events in project history | History tab shows all generation, refinement, seeding, and rollback events with timestamps |
| As a developer, I roll back a seed batch by ID                              | Records deleted in reverse dependency order; batch marked `rolled_back` in history         |
| As a developer, I see per-collection deleted counts after rollback          | Report shows which collections were deleted and how many records per collection            |
| As a developer, I cannot roll back an already-rolled-back batch             | System rejects duplicate rollback with `ROLLBACK_BATCH_ALREADY_ROLLED_BACK` error          |

---

## 8. Individual Contributions and Reflections

### Hana Essam — Account Management · Project Context · Schema Input · GitHub Repository Context

**AI tools used:** Cursor with Codex, GitHub Copilot (inline completion), Spec Kit, Superpowers (initial phase), Vercel MCP, GitHub MCP, Context7 MCP, next-devtools MCP, `testseed-feature` skill, `testseed-security-review` skill.

**Deep dive — Authentication system and Mongoose schema parser:**  
Hana used GitHub Copilot for inline completion on the auth routes and the parser's regex patterns. In one pass, Cursor refactored the GitHub OAuth callback across three files, correctly separating repository-context state from account login state — a distinction her first manual attempt had conflated. The `testseed-feature` skill ensured the auth layer was built in the correct order: types first, then core use cases, then the API route, then the web screens.

**Most useful:** Cursor's multi-file context propagated the parser output through the project-context setup UI in a single refactor, replacing a manual trace across five files and saving several hours.

**Most challenging:** The initial parser suggestions assumed flat single-level schemas, missing nested objects and arrays. Hana needed to provide few-shot complex input/output examples before the AI output was usable.

**What she would do differently:** Include few-shot examples in parsing prompts from the start, rather than iterating toward specificity after observing generic output.

---

### Mariam Philip — MongoDB Schema Discovery · Schema Review · Rollback

**AI tools used:** Cursor with Codex, Spec Kit, Superpowers (initial phase), read-only MongoDB MCP, Context7 MCP, Figma MCP, Vercel MCP, next-devtools MCP, `testseed-security-review` skill, `testseed-tdd-change` skill.

**Deep dive — Schema discovery and rollback service:**  
The read-only MongoDB MCP gave Cursor live collection structures during schema discovery, making field-inference heuristics accurate on the first pass. Codex designed the field-inference algorithm and produced the rollback error taxonomy (missing ID, invalid ID, already rolled back, partial failure) with user-facing error copy that Mariam adopted with minor edits. The `testseed-security-review` skill guided the `seedBatchId`-only deletion filter so rollback can never touch untagged records. The Figma MCP aligned the schema review UI screens with the team design system — Cursor fetched design context, read component guidelines, and reworked the review flow directly.

**Most useful:** Grounding suggestions in real collection metadata via the MongoDB MCP made inference heuristics accurate on the first pass instead of needing iterative test-and-fix.

**Most challenging:** With sparse or inconsistent MongoDB documents, the AI flagged nearly every inferred field as uncertain, making the schema review UI noisy. Calibrating confidence thresholds required manual review of several real datasets.

**What she would do differently:** Build a confidence-scoring system into the discovery service from the start and expose those scores visibly in the review UI, rather than treating field uncertainty as binary.

---

### Mazen Bahgat — AI Seed Generation · Record Counts · Preview and Editing

**AI tools used:** Cursor with Codex, Spec Kit (`/speckit-implement`), ChatGPT-4o (generation prompt template), shadcn MCP, next-devtools MCP, Vercel MCP, `testseed-ai-generation` skill, `testseed-tdd-change` skill.

**Deep dive — Generation pipeline and editable workbench:**  
Mazen used ChatGPT-4o specifically to produce the structured parent-before-child generation prompt template that instructs GPT-4 to generate parent collection records first and inject their IDs as context for dependent collections. This template was integrated into the `testseed-ai-generation` skill so all subsequent generation work followed the same pattern. The shadcn MCP scaffolded the DataTable base for the workbench in one command. Spec Kit's `/speckit-implement` mapped the plan into granular tasks, each corresponding to a single function, making progress measurable throughout the sprint.

**Most useful:** The prompt template kept dependency ordering consistent across very different schemas, and Spec Kit's task breakdown made implementation progress visible and accountable.

**Most challenging:** Getting reliable ObjectId cross-references in a single generation call was the hardest problem. The model occasionally produced orphaned references, requiring post-generation validation and a retry prompt that feeds back the violated constraint — adding pipeline complexity.

**What he would do differently:** Split generation explicitly into two phases (parents first, then children with real parent IDs injected as context) to eliminate orphaned references structurally rather than patching with a retry loop.

---

### Hassan Albattra — Feedback-Based Regeneration · Export · Direct MongoDB Seeding

**AI tools used:** Cursor with Codex, Spec Kit, Superpowers (initial phase), shadcn MCP, MongoDB MCP, v0 MCP, Claude (adversarial testing + security review), Vercel MCP, next-devtools MCP, `testseed-security-review` skill, `testseed-tdd-change` skill.

**Deep dive — Direct seeding and feedback regeneration:**  
Hassan built the seeding UI in Cursor with the shadcn MCP (confirmation dialog, form components scaffolded in one command) and used the MongoDB MCP for live insertion and rollback validation. He used Claude specifically for adversarial testing and security review of the seeding flow, guided by the `testseed-security-review` skill. Claude generated edge-case inputs that exposed bugs in constraint-preservation logic — specifically cases where feedback instructions conflict with required or unique fields — and flagged that a MongoDB connection string was being written to a debug log, which was removed before merge.

**Most useful:** Describing the expected behavior contract and asking Claude to produce inputs that should fail gracefully surface-tested all fallback paths far faster than manual test writing, and it caught a real security issue before merge.

**Most challenging:** Regeneration had to stay schema-valid even when feedback conflicted with required or unique fields. The AI over-applied feedback (e.g., forcing one email domain despite the uniqueness constraint), and encoding constraint-priority rules required several iterations.

**What he would do differently:** Define a formal regeneration contract upfront — a short spec of which constraints are inviolable — and include it verbatim in every regeneration prompt, which would have avoided most of the conflict-handling iteration.

---

## 9. Conclusion

TestSeed demonstrates that AI-assisted software engineering, applied with discipline and critical judgment, can substantially accelerate a team's ability to deliver complex, well-documented software within a tight academic timeline.

The 73 features shipped across 29 pull requests represent a scope that would typically require 6–8 weeks of development for a four-person team. The quality of the specification artifacts, architectural documentation, and validation coverage substantially exceeds what the team would have produced without AI assistance.

However, the project also demonstrates clearly that AI is a force multiplier on human capability, not a replacement for it. The most important contributions — the transient connection string security constraint, the clean architecture boundary, the `seedBatchId`-only rollback deletion safety, the two-phase generation design — all originated from or were significantly shaped by human judgment. The team used AI to generate breadth and speed at every stage; human review, custom skill guardrails, and the `npx turbo build lint test` gate kept it correct.

The shared AI toolchain — Cursor with Codex as the primary agent, Spec Kit for structured feature delivery, Superpowers for initial architecture planning, seven MCP servers for live context, and seven custom skill files encoding the team's exact implementation conventions — transformed AI assistance from ad-hoc prompting into a systematic, repeatable engineering process. That systematization is the main lesson we carry forward.

---

**Source Code:** https://github.com/hanaessam/testseed  
**Live Application:** https://testseed-web.vercel.app  
**Setup Instructions:** See `README.md` in the repository root  
**Feature Inventory:** `docs/shipped-features.md`  
**Architecture:** `docs/architecture.md` and `docs/adr/`  
**Per-Feature Specs:** `specs/` directory (15 feature directories; 14 implementation-ready packages plus planned dataset version history)  
**AI Tooling Inventory:** `docs/ai-assisted-tooling.md`
