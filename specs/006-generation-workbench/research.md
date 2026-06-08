# Research: Generation Workbench UX (Tonic-Inspired)

**Date**: 2026-06-08

**Reference**: [Tonic Fabricate product](https://www.tonic.ai/products/fabricate), [agentic generation guide](https://tonicfakedata.webflow.io/guides/generate-synthetic-data-via-agentic-ai), team demo [YouTube](https://www.youtube.com/watch?v=qAtGUNLav5k)

## Why change the UX now

`005-ai-seed-generation` delivered the **backend capabilities** (dependency-ordered generation, validation, chat refinement). The **presentation layer** still uses a course-style wizard and raw JSON preview. Competitive synthetic-data tools optimize for **iteration speed** and **trust**, not step completion.

TestSeed should not copy Tonic feature-for-feature (MongoDB/Mongoose focus, no PDF/DOCX export in v1). The transferable patterns are **layout**, **feedback**, and **workflow continuity**.

## Tonic Fabricate patterns (observed)

| Pattern | Description | TestSeed mapping |
| --- | --- | --- |
| Agent workspace | Chat + schema + output on one screen | Three-pane workbench |
| Schema-first | Paste schema or connect DB | Existing paste/upload/MongoDB + review |
| Generation plan | Show order and relationships before run | Expose `build-generation-plan` in UI |
| Live preview | Rows appear as data generates | Phase 3 streaming; Phase 1 tables after response |
| In-place refinement | Chat updates dataset without navigation | Agent dock (merge refine step) |
| Export hub | JSON/SQL/files when satisfied | Phase 2 JSON; later seed script + insert |
| Project workspace | Multiple sources under one project | Already have projects; workbench per project |
| Live Connect | Model on production DB structure | MongoDB discovery (transient connection) |

## TestSeed gaps (pre-workbench)

1. **Linear wizard** forces context switches between generate and refine.
2. **JSON-only preview** slows inspection of relational data.
3. **Hidden generation plan** — core computes order; user does not see it.
4. **No export surface** in generate flow (`docs/requirements.md` epics pending).
5. **Finish navigation** used full reload (`<a href>`) — fixed in wizard; workbench must keep `router.push`.

## Decisions

### Decision: Workbench replaces wizard as default generate UX

**Rationale**: Matches Tonic-style iteration; reduces steps for returning users.

**Alternatives considered**:

- Keep wizard, add tabs only: lower effort but still splits refine from preview.
- New route `/projects/[id]/generate`: clearer ownership but more routing churn; defer unless team prefers project-scoped URL.

**Chosen**: Evolve `/generate` with workbench layout; `projectId` query param selects project.

### Decision: Phase 1 is UI restructure without streaming

**Rationale**: Streaming requires API design and core emit hooks; table preview + merged refine deliver most perceived value quickly.

**Alternatives considered**:

- Streaming first: high complexity before basic layout exists.
- Wizard forever + export only: misses refinement UX goal.

### Decision: Generation plan shown from core, not invented in UI

**Rationale**: Dependency order must match actual generation; single source of truth in `packages/core`.

**Alternatives considered**:

- Client-side graph only: risks drift from server behavior.

### Decision: Table preview primary, JSON secondary

**Rationale**: Tonic demos emphasize row inspection; JSON remains for power users (expandable panel or export).

### Decision: Export and direct insert stay phased

**Rationale**: `docs/requirements.md` defines separate epics; workbench provides the **surface**, not all backends in Phase 1.

## What we are not building (v1 workbench)

- Unstructured file generation (PDF, DOCX, EML).
- Multi-database projects in one workspace.
- Mock HTTP APIs atop seed data.
- SQL export.
- Production Live Connect beyond transient MongoDB discovery.

## Open questions (resolve in tasks.md)

1. Does Phase 1 need `GET /projects/:id/generation-plan` or can plan ship inside generate response metadata only?
2. Should workbench live at `/projects/[id]/generate` for clearer IA?
3. Feature flag name and default (`workbench` vs `wizard`) for rollout?
