# Implementation Plan: Export Generated Data as JSON

**Branch**: `011-export-json` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-export-json/spec.md`

## Summary

Verification-only plan for the existing JSON export behavior. Latest code analysis indicates copy JSON, download JSON, grouped-by-collection payloads, and validation-based export blocking are already implemented. This plan does not authorize new export behavior unless verification finds a real gap.

Primary verification targets:

- `apps/web/components/generation/export-drawer.tsx`
- `apps/web/components/generation/generation-workbench.tsx`
- `apps/web/app/generate/page.tsx`
- `apps/web/components/generation/validation-summary.tsx`
- Existing generated dataset validation sources that feed the workbench state

## Technical Context

**Language/Version**: TypeScript strict, Node.js 20+, React/Next.js frontend

**Primary Dependencies**: Existing TestSeed web workbench components and shared `@testseed/types` contracts

**Storage**: N/A for export verification. JSON export uses the active in-memory generated dataset preview.

**Testing**: Verification through focused code inspection, existing lint/build checks, and manual quickstart scenarios. Do not add tests unless verification finds a regression or a missing test is required by a later task phase.

**Target Platform**: TestSeed web generation workbench

**Project Type**: Monorepo web application

**Performance Goals**: Valid datasets should expose copy/download actions without noticeable delay for normal preview-sized datasets.

**Constraints**:

- Verification-only unless a real gap is found.
- Keep scope limited to JSON export.
- Do not modify feedback regeneration, direct seeding, rollback, or preview editing.
- Feature visibility is controlled by `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT === "true"`.

**Scale/Scope**: One existing workbench export surface for active generated datasets grouped by collection.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
| --- | --- | --- |
| Dependency direction preserved | Pass | Verification targets are in `apps/web`; no lower-layer imports are planned. |
| No business logic added to apps | Pass | No implementation planned; existing export surface is client-side presentation behavior. |
| No connection string handling changes | Pass | Export JSON does not use MongoDB connection strings. |
| No unrelated scope changes | Pass | Plan excludes feedback regeneration, direct seeding, rollback, and preview editing. |
| Required check remains available | Pass | If tasks are generated, final verification should use `npx.cmd turbo build lint test` when any file changes are made. |

## Project Structure

### Documentation (this feature)

```text
specs/010-export-json/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── export-json-ui.md
└── checklists/
    └── requirements.md
```

### Verification Targets

```text
apps/web/
├── app/generate/page.tsx
└── components/generation/
    ├── export-drawer.tsx
    ├── generation-workbench.tsx
    └── validation-summary.tsx

packages/types/
└── src/generation.ts
```

**Structure Decision**: Use existing TestSeed workbench architecture. This feature is already implemented in the web layer and should be verified there. Shared types are reference-only for the generated dataset and validation result contracts.

## Phase 0: Research

Research confirms this is a verification-only feature. See [research.md](./research.md).

## Phase 1: Design & Contracts

Design artifacts document the existing user-facing export behavior:

- [data-model.md](./data-model.md) defines the export-relevant entities.
- [contracts/export-json-ui.md](./contracts/export-json-ui.md) defines the UI behavior contract to verify.
- [quickstart.md](./quickstart.md) defines manual verification steps.

## Verification Plan

1. Verify `apps/web/app/generate/page.tsx` controls export visibility through `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT === "true"` and passes `showExport`, `exportOpen`, and `onExportOpenChange` to the workbench.
2. Verify `apps/web/components/generation/generation-workbench.tsx` mounts `ExportDrawer` only when export is enabled and passes the active accepted dataset plus active validation results.
3. Verify `apps/web/components/generation/export-drawer.tsx` serializes `dataset.collections` as the JSON payload, preserving grouped-by-collection output.
4. Verify `export-drawer.tsx` implements copy with the same JSON payload used for download.
5. Verify `export-drawer.tsx` implements download with a JSON file payload.
6. Verify `export-drawer.tsx` blocks copy/download when there is no dataset, the dataset status is not valid, or active validation results contain blocking errors.
7. Verify `apps/web/components/generation/validation-summary.tsx` displays validation errors in the workbench when export is blocked by invalid records.
8. Verify no export plan or task requires changes to feedback regeneration, direct seeding, rollback, or preview editing.

## Complexity Tracking

No complexity violations. No new implementation architecture is planned.
