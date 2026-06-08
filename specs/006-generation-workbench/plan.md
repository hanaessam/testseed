# Implementation Plan: Generation Workbench UX

**Branch**: `006-generation-workbench`

**Spec**: `specs/006-generation-workbench/spec.md`

**Date**: 2026-06-08

**Status**: Planned — do not replace the wizard until Phase 1 acceptance criteria pass.

## Summary

Restructure `apps/web/app/generate/page.tsx` from a linear multi-step wizard into a **three-pane Generation Workbench** inspired by [Tonic Fabricate](https://www.tonic.ai/products/fabricate): context/plan rail (left), data canvas (center), agent dock (right). Reuse `005` APIs for generate and refine; add minimal new API surface only where the UI needs a read-only generation plan.

## Current vs Target

| Area | Current (`005` + wizard) | Target workbench |
| --- | --- | --- |
| Navigation | 7 wizard steps + Stepper | Single route; collapsible Setup |
| Preview | Raw JSON `<pre>` | Per-collection tables |
| Refinement | Separate `refine` step | Agent dock beside preview |
| Planning | Hidden in core | Visible plan card |
| Finish | `router.push` to project | Sticky bar: Finish, Export (phase 2) |
| Resume | `?projectId=&mode=generate` picks step | Lands in workbench canvas |

## Technical Context

- Next.js 14 App Router, React 18, existing `AppShell`, shadcn-style primitives.
- Web imports `@testseed/types` only; all mutations via `apps/web/src/lib/api-client.ts`.
- Core already exposes `build-generation-plan`, `generate-seed-data`, `refine-generated-dataset`, `validate-generated-dataset`.
- Generation plan may need a **read-only GET** endpoint (e.g. `GET /projects/:id/generation-plan?counts=...`) or piggyback on project detail + client-side plan display if API returns plan from an existing route — decide in Phase 1 spike.
- No connection strings in workbench state beyond existing MongoDB discovery transient flow.

## Constitution Check

- Dependency direction unchanged.
- No business logic in `apps/web` components (plan ordering stays in core).
- No new module-level singletons in `packages/db`.
- Chat and generation responses remain sanitized per `005`.

## Project Structure

### Documentation (this feature)

```text
specs/006-generation-workbench/
├── spec.md
├── plan.md
├── research.md
├── checklists/
│   └── requirements.md
└── tasks.md                    # created by /speckit-tasks before implementation
```

### Source Code (expected)

```text
apps/web/
├── app/generate/
│   └── page.tsx                 # workbench shell (replaces wizard orchestration)
├── components/generation/
│   ├── generation-workbench.tsx
│   ├── generation-plan-panel.tsx
│   ├── collection-data-table.tsx
│   ├── agent-dock.tsx
│   ├── setup-rail.tsx
│   └── export-drawer.tsx        # Phase 2
└── src/lib/api-client.ts        # optional: getGenerationPlan

apps/api/src/routes/
└── generation.ts                # optional: plan endpoint

packages/core/src/generation/
└── build-generation-plan.ts     # existing; no logic change in Phase 1
```

## Implementation Phases

### Phase 1 — Workbench shell (P1, UI-only where possible)

**Deliverables**

1. `GenerationWorkbench` layout: left rail (setup + plan + counts), center canvas, right agent dock.
2. Collapsible **Setup** sections reusing existing forms: project basics, GitHub, schema choose/input, review/save — extracted from current wizard steps.
3. **Merge generate + refine** into one view; remove `refine` from Stepper.
4. `CollectionDataTable` — tabs per collection, columns from `ParsedSchema`, paginated rows.
5. `GenerationPlanPanel` — display order, refs, warnings (API or computed display from typed plan DTO).
6. Resume behavior: `mode=generate` opens workbench with schema loaded.
7. Sticky action bar: Generate, Finish (`router.push`), disabled states when invalid.
8. Update `docs/ui-design.md` workbench section when Phase 1 ships.

**Exit criteria**: User can complete setup → plan review → generate → table preview → chat refine → finish without wizard steps.

### Phase 2 — Trust, iteration, export (P2)

**Deliverables**

1. **Agent dock** enhancements: quick prompt chips, refinement summary ("Updated N rows in `users`").
2. Inline **validation badges** on rows/cells from `GenerationValidationResult`.
3. **Export drawer**: download JSON, copy to clipboard; block when invalid.
4. Optional **dataset version label** (v1, v2) in session state after each successful generate/refine.
5. Project **History** tab link from finish bar.

**Exit criteria**: Export JSON works for valid datasets; refinement feedback is visible in UI.

### Phase 3 — Live generation feel (P3, API + UI)

**Deliverables**

1. Streaming or chunked API (SSE) emitting per-collection results as core completes each plan step.
2. Progress UI: collection checklist with in-progress / done states.
3. Partial table render while later collections generate.
4. Cancel in-flight generation.

**Exit criteria**: User sees first collection rows before full dataset completes for multi-collection schemas.

### Phase 4 — Ecosystem parity (P4, ties to other epics)

**Deliverables**

1. Direct MongoDB insert from workbench (transient connection string, confirmation modal).
2. JS seed script export.
3. Rollback entry from project history.
4. CI snippet in export drawer (documentation link).

**Exit criteria**: Documented in respective epics; workbench provides entry points only.

## Migration Strategy

1. **Document first** (this spec) — complete.
2. Implement Phase 1 on `006-generation-workbench` branch.
3. Keep wizard step components in `components/generation/setup/` until parity verified.
4. Remove Stepper-based flow from default route when Phase 1 passes manual test plan.
5. Do not delete wizard code until workbench covers: new project, GitHub callback, MongoDB discovery, schema save, generate, refine, finish.

## Risks

| Risk | Mitigation |
| --- | --- |
| Large `page.tsx` refactor causes regressions | Extract components; feature-flag workbench |
| Plan endpoint scope creep | Start with client display of plan from generate response metadata or lightweight GET |
| Table performance on large JSON | Paginate; cap preview rows with "view full JSON" fallback |
| HMR chunk errors on navigation | Use `router.push` / `Link` only (fixed for Finish in wizard) |
| Mobile layout cramped | Stack panes; agent dock as bottom sheet |

## Verification

```sh
npx turbo build lint test
```

**Manual test plan**

1. New project: setup rail → save schema → plan visible → generate → tables populate.
2. Existing project: `?projectId=&mode=generate` resumes workbench.
3. GitHub OAuth return stays in workbench setup rail.
4. Refinement success updates tables; failure preserves data.
5. Finish navigates to `/projects/[id]` without 500.
6. Invalid dataset blocks export (Phase 2).

## Complexity Tracking

No constitution violations planned. Optional read-only plan endpoint is adapter-only (delegates to core).
