# Research: Generation Workbench UX (Tonic-Inspired)

**Date**: 2026-06-08 (updated after `/speckit-clarify` and `/speckit-plan`)

**Reference**: [Tonic Fabricate product](https://www.tonic.ai/products/fabricate), [agentic generation guide](https://tonicfakedata.webflow.io/guides/generate-synthetic-data-via-agentic-ai), team demo [YouTube](https://www.youtube.com/watch?v=qAtGUNLav5k)

## Why change the UX now

`005-ai-seed-generation` delivered **backend capabilities** (dependency-ordered generation, validation, chat refinement, project/repository context in prompts). The **presentation layer** still uses a course-style wizard and raw JSON preview. Competitive synthetic-data tools optimize for **iteration speed** and **trust**, not step completion.

## Tonic Fabricate patterns (observed)

| Pattern | Description | TestSeed mapping | Phase |
| --- | --- | --- | --- |
| Agent workspace | Chat + schema + output on one screen | Three-pane workbench | 1 |
| Schema-first | Paste schema or connect DB | Setup rail: paste/upload/MongoDB + review | 1 |
| Generation plan | Show order and relationships before run | `GenerationPlanPanel` via plan API | 1 |
| Live preview | Rows appear as data generates | Progressive `CollectionDataTable` | **2a** |
| Streamed chat | Assistant text arrives incrementally | Agent dock token stream | **2a** |
| In-place refinement | Chat updates dataset without navigation | Agent dock beside preview | 1 (batch), 2a (stream) |
| Export hub | JSON when satisfied | Export drawer | **2b** (after streaming) |
| Project workspace | Multiple sources under one project | Context sources panel | 1 |
| Live Connect | Model on production DB structure | MongoDB discovery (transient) | 1 |

## Decisions

### Decision: Workbench replaces wizard for all users in Phase 1

**Rationale**: Clarification session 2026-06-08 — single generate experience; onboarding lives in collapsible Setup rail.

**Alternatives considered**:

- Returning users only: rejected; splits UX and maintains two flows.
- Feature flag default wizard: rejected; conflicts with FR-012.

**Chosen**: Evolve `/generate` with workbench layout; remove Stepper when Phase 1 exit criteria pass.

### Decision: Phase 1 ships without streaming or export

**Rationale**: Shell + static tables + merged refine de-risks layout refactor. Finish-only handoff matches clarified scope.

**Alternatives considered**:

- Bundle streaming in Phase 1: rejected; too much API/core work before layout proven.

**Chosen**: Phase 1 batch APIs; Phase 2a streaming; Phase 2b export.

### Decision: Streaming before export (Phase 2a then 2b)

**Rationale**: User clarification prioritizes Tonic-demo responsiveness over export. Export on invalid/partial data is harder during streaming rollout.

**Alternatives considered**:

- Original plan (export Phase 2, streaming Phase 3): rejected after clarify.
- Chat streams Phase 2, tables Phase 3: rejected; user wants both in Phase 2 before export.

**Chosen**: Phase 2a = SSE generation + SSE refinement chat; Phase 2b = export drawer + validation badges.

### Decision: Soft warn on blocking plan issues

**Rationale**: Clarification — users may proceed at own risk; validation surfaces errors in preview.

**Alternatives considered**: Hard-disable Generate — rejected.

### Decision: Generation plan from core via read-only GET

**Rationale**: Single source of truth in `packages/core/build-generation-plan.ts`.

**Alternatives considered**: Client-only graph — risks drift.

**Chosen**: `GET /projects/:projectId/generation-plan?collectionCounts=...` (adapter delegates to core).

### Decision: SSE for streaming (not WebSockets)

**Rationale**: Fits Express 4 + Next.js client; one-way server→client for generation progress and chat tokens; simpler ops than WS for v1.

**Alternatives considered**:

- Long-polling: higher latency, worse UX for chat tokens.
- WebSockets: more infrastructure; defer unless SSE proves insufficient.

### Decision: Context visibility in workbench (not new prompt logic)

**Rationale**: Core already passes `projectContext` and `repositoryContext` to provider (`generate-seed-data.ts`). Workbench must display active sources and never omit them from requests.

### Decision: Cancel refinement on navigate away

**Rationale**: Predictable state — last valid dataset always shown on return.

## Resolved open questions

| Question | Resolution |
| --- | --- |
| Phase 1 plan endpoint? | Yes — `GET /projects/:projectId/generation-plan` |
| Workbench route? | Stay on `/generate?projectId=` for Phase 1 |
| Feature flag? | Optional `NEXT_PUBLIC_GENERATION_WORKBENCH` for dev only; default on after Phase 1 QA |
| Streaming transport? | SSE with typed events (see `contracts/generation-workbench-streaming.md`) |

## What we are not building (through Phase 2b)

- Unstructured file generation (PDF, DOCX, EML).
- Multi-database projects in one workspace.
- Mock HTTP APIs atop seed data.
- SQL export.
- Editable preview cells (separate Preview epic).
- JS seed script export (Phase 3 / separate epic).
