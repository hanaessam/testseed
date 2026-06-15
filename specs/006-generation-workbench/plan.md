# Implementation Plan: Generation Workbench UX

**Branch**: `006-generation-workbench`

**Spec**: `specs/006-generation-workbench/spec.md`

**Date**: 2026-06-08 (revised after `/speckit-clarify`)

**Status**: **Shipped** (Phases 1, 2a, 2b). Post-ship: setup wizard; workbench; **immutable dataset versions** with load + re-seed; inline editing (007). Direct seed + rollback in export drawer.

## Summary

Restructure `apps/web/app/generate/page.tsx` from a linear multi-step wizard into a **three-pane Generation Workbench** inspired by [Tonic Fabricate](https://www.tonic.ai/products/fabricate) and the [team demo](https://www.youtube.com/watch?v=qAtGUNLav5k): setup/plan rail (left), data canvas (center), agent dock (right).

Reuse `005` generation and refinement APIs in Phase 1. Phase 2 adds **streaming** (progressive tables + streamed chat) **before** JSON export. No business logic in `apps/web`; project and GitHub repository context must remain visible and flow into every generate/refine request.

## Clarifications driving this plan

| Topic | Decision |
| --- | --- |
| Default UX | New projects: **setup wizard** → workbench. Returning users: workbench (`?mode=generate`) |
| Plan warnings | Soft warn — Generate stays enabled with risk notice |
| Phase 1 handoff | Finish only — no export |
| Context in prompts | Show active sources; pass description + repo summary when available |
| Navigate away during refine | Cancel in-flight; keep last valid dataset |
| Streaming | Phase 2 — streamed chat + progressive tables **before** export |

## Current vs Target

| Area | Current (`005` + wizard) | Phase 1 workbench | Phase 2 workbench |
| --- | --- | --- | --- |
| Navigation | 7 wizard steps + Stepper | Wizard for create; workbench for generate | Same |
| Default route | Wizard for all | `/generate` wizard (new) or workbench (resume) | Same |
| Preview | Raw JSON `<pre>` | Per-collection tables after full response | Progressive rows per collection |
| Refinement | Separate `refine` step | Agent dock; full response then update | Streamed assistant text |
| Planning | Hidden in core | Visible plan card; soft-warn on issues | Same |
| Context | Passed via API, not surfaced | Active context chips in setup rail | Same |
| Finish | `router.push` to project | Sticky bar: Generate, Finish | + Export drawer |
| Resume | `?projectId=&mode=generate` | Lands in workbench canvas | Same |

## Technical Context

**Language/Version**: TypeScript strict, Node.js 20+, Next.js 14, React 18, Express 4

**Primary Dependencies**: Existing `AppShell`, shadcn-style primitives, `@testseed/types`, `api-client.ts`

**Storage**: Workbench UI is client session state; **dataset versions** persist in `generated_dataset_records` (immutable snapshots with optional `versionLabel`, `parentDatasetId`)

**Testing**: `npx turbo build lint test`; contract tests for new streaming/plan routes; manual workbench test plan below

**Target Platform**: Desktop-first web; stacked panes on small viewports

**Performance Goals**: SC-004 — table preview within 1s after full generation (Phase 1, ≤500 records); SC-006/007 — streaming targets (Phase 2)

**Constraints**: Web imports `@testseed/types` only; no connection strings stored; cancel refine on navigate away

**Scale/Scope**: Single project per workbench session; paginated table rows for large collections

**API surface (phased)**:

| Endpoint | Phase | Purpose |
| --- | --- | --- |
| `GET /projects/:projectId/generation-plan` | 1 | Read-only plan for UI (delegates to core) |
| `POST /projects/:projectId/generations` | 1 | Existing batch generate |
| `POST /projects/:projectId/generations/refinements` | 1 | Existing batch refine |
| `POST /projects/:projectId/generations/stream` | 2 | SSE per-collection generation events |
| `POST /projects/:projectId/generations/refinements/stream` | 2 | SSE refinement chat tokens + final dataset |

## Constitution Check

*GATE: Passes before implementation. Re-check after Phase 2 streaming design.*

| Rule | Status |
| --- | --- |
| Dependency direction `types → db → core → api → web` | Pass — streaming emit hooks live in core; API adapts; web consumes |
| No business logic in `apps/web` | Pass — components render API/SSE state only |
| No module-level singletons in `packages/db` | Pass — no db changes in Phase 1 |
| No connection strings stored | Pass — MongoDB discovery stays transient |
| Sanitized AI responses per `005` | Pass — streaming chunks must not leak prompts/secrets |

## Project Structure

### Documentation (this feature)

```text
specs/006-generation-workbench/
├── spec.md
├── plan.md                 # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── generation-plan-api.md
│   └── generation-workbench-streaming.md
├── checklists/
│   └── requirements.md
└── tasks.md                # generated — 82 tasks
```

### Source Code (expected)

```text
apps/web/
├── app/generate/
│   └── page.tsx                      # workbench shell entry
├── components/generation/
│   ├── generation-workbench.tsx
│   ├── generation-plan-panel.tsx
│   ├── context-sources-panel.tsx     # FR-011a
│   ├── collection-data-table.tsx
│   ├── agent-dock.tsx
│   ├── setup-rail.tsx
│   ├── generation-progress.tsx       # Phase 2
│   └── export-drawer.tsx             # Phase 2 (after streaming)
└── src/lib/
    ├── api-client.ts                 # getGenerationPlan, stream helpers
    └── generation-stream.ts        # Phase 2 SSE client

apps/api/src/routes/
├── generation.ts                     # + plan GET, stream POST (Phase 2)
└── __tests__/                        # contract tests

packages/core/src/generation/
├── build-generation-plan.ts          # existing
├── generate-seed-data.ts             # + optional per-collection emit (Phase 2)
└── refine-generated-dataset.ts       # + optional stream callback (Phase 2)
```

## Implementation Phases

### Phase 1 — Workbench shell (P1)

**Goal**: Replace wizard for all users. Static preview after full API response. No streaming. No export.

**Deliverables**

1. `GenerationWorkbench` three-pane layout: setup rail, data canvas, agent dock.
2. Remove Stepper/wizard as default; extract wizard step forms into collapsible `SetupRail` sections.
3. `ContextSourcesPanel` — show project description and GitHub repo summary status before Generate (FR-011a).
4. Ensure generate/refine requests include project context fields already supported by API (FR-011b).
5. `GenerationPlanPanel` via `GET /projects/:projectId/generation-plan`; soft-warn UI for blocking issues (FR-004a).
6. `CollectionDataTable` — tabs per collection, paginated rows, columns from reviewed schema.
7. Merge generate + refine on one screen; refinement updates tables after full response.
8. Sticky action bar: **Generate**, **Finish** (`router.push` / `Link` only). No export controls.
9. AbortController cancel for in-flight refinement on route change (FR-016).
10. Resume: `?projectId=&mode=generate` opens workbench with project loaded.
11. Update `docs/ui-design.md` workbench section when Phase 1 ships.

**Exit criteria**

- New and returning users complete setup → plan → generate → table preview → refine → finish without wizard steps.
- No export UI visible.
- Results appear after full generate/refine completes (no streaming).
- Context sources visible when present.
- Plan warnings shown but Generate remains enabled.

### Phase 2a — Streaming UX (P2, before export)

**Goal**: Tonic-demo feel — progressive tables and streamed chat ([demo reference](https://www.youtube.com/watch?v=qAtGUNLav5k)).

**Deliverables**

1. Core + API: SSE generation stream emitting per-collection `collection_complete` events (see `contracts/generation-workbench-streaming.md`).
2. Core + API: SSE refinement stream emitting `token` chunks and final `dataset` event.
3. `GenerationProgress` — per-collection pending / in-progress / complete states (FR-015).
4. Data canvas renders rows for completed collections while later collections generate (FR-014).
5. Agent dock appends user message immediately; streams assistant tokens (FR-013).
6. Cancel in-flight generation on navigate away (discard partial rows per spec edge case).
7. Contract tests for stream event shapes.

**Exit criteria**

- SC-006: first assistant content within 2s of refinement submit.
- SC-007: first collection rows visible before final collection completes on multi-collection schemas.
- Phase 1 flows still pass when client falls back to non-stream endpoints (optional safety net during rollout).

### Phase 2b — Export and trust (P2, after streaming)

**Goal**: JSON handoff and validation visibility on the finish surface.

**Deliverables**

1. `ExportDrawer` — download JSON, copy to clipboard; block when dataset invalid.
2. Inline validation badges on rows/cells from `GenerationValidationResult`.
3. Quick-refinement prompt chips in agent dock (FR-010).
4. Refinement summary message ("Updated N rows in `users`").
5. Optional dataset version label (v1, v2) in session state after successful generate/refine.
6. History tab link from finish bar.

**Exit criteria**

- Valid dataset exports JSON matching preview structure.
- Invalid dataset disables export with explanation.
- Validation badges match API validation results.

### Phase 3 — Ecosystem handoff (P3, ties to other epics)

**Deliverables**

1. Direct MongoDB insert entry from workbench (transient connection, confirmation modal).
2. JS seed script export entry.
3. Rollback entry from project history.
4. CI snippet link in export drawer.

**Exit criteria**: Entry points documented; backends owned by respective epics.

## Migration Strategy

1. Extract reusable setup forms from `apps/web/app/generate/page.tsx` into `components/generation/setup/`.
2. Implement workbench shell behind optional dev flag only until manual Phase 1 tests pass internally.
3. Flip default to workbench and **remove Stepper orchestration** when Phase 1 exit criteria pass (FR-012).
4. Delete unused wizard-only navigation code after one release on workbench; keep form components in setup rail.
5. Phase 2a ships streaming endpoints; web prefers stream URLs when feature flag or API capability header indicates support.
6. Phase 2b adds export drawer after streaming acceptance tests pass.

## Risks

| Risk | Mitigation |
| --- | --- |
| Large `page.tsx` refactor | Incremental extraction; component tests for rail/canvas/dock |
| Streaming scope creep | Phase 2a locked to SSE events in contract; no WebSockets in v1 |
| Plan endpoint duplication | Single `build-generation-plan` in core; API adapter only |
| Table performance | Paginate; cap visible preview rows |
| Partial generation on cancel | Clear canvas on cancel; document in edge cases |
| OpenAI streaming in refine | Adapter maps provider stream to sanitized token events |
| HMR navigation errors | `router.push` / `Link` only for Finish |

## Verification

```sh
npx turbo build lint test
```

### Manual test plan — Phase 1

1. Net-new user: expand Setup → context → optional GitHub → schema → save → plan visible → generate → tables after full response → refine → finish → project detail.
2. Returning user: `?projectId=&mode=generate` resumes workbench without wizard.
3. GitHub OAuth callback returns to workbench setup rail.
4. Plan with cycle/zero-parent shows risk warning; Generate still clickable.
5. Context chips show description and/or repo summary when present.
6. Refinement success updates tables; failure preserves dataset.
7. Navigate away during refine cancels request.
8. Finish navigates to `/projects/[id]` without error.
9. No export controls present.

### Manual test plan — Phase 2a (streaming)

1. Multi-collection schema: first collection rows appear before last completes.
2. Progress checklist updates per collection.
3. Refinement: user message immediate; assistant text streams in dock.
4. Navigate away during generation cancels and clears partial state.

### Manual test plan — Phase 2b (export)

1. Valid dataset: JSON download matches preview.
2. Invalid dataset: export disabled with validation message.
3. Validation badges on offending rows/fields.

## Complexity Tracking

No constitution violations planned. Streaming requires core emit callbacks injected into existing generate/refine use cases — adapter and web layers stay thin.
