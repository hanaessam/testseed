# Generation UX Roadmap

**Status**: Workbench + setup wizard + dataset version history shipped. Streaming enabled by default. Export and direct seeding gated by `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true`.

## Purpose

This document summarizes why TestSeed uses a **Generation Workbench**, how that compares to [Tonic Fabricate](https://www.tonic.ai/products/fabricate), and which epics own each slice of work.

## Current state (shipped)

| Capability | Location | Notes |
| --- | --- | --- |
| Setup wizard | `apps/web/components/generation/project-setup-wizard.tsx` | New projects: context → GitHub → schema → review |
| Generation Workbench | `apps/web/app/generate/page.tsx` | Three-pane: setup rail · tables · agent dock |
| **Dataset versions** | `generated_dataset_records` + `saved-datasets-panel.tsx` | Immutable snapshots with labels, lineage, load + re-seed |
| AI generation | `packages/core/src/generation/` | Dependency order, validation, OpenAI via API |
| Chat refinement | Agent dock (streamed) | Pre-refine snapshot + new version on dataset change |
| Feedback regeneration | `regenerateWithFeedback` | Candidate review; accept forks `Accepted refinement` version |
| Collection counts | `collection-counts-panel.tsx` | Editable in workbench left rail |
| Preview editing | `collection-data-table.tsx` + save bar | Inline edit; save **forks** version via PATCH |
| Export + direct seed | `export-drawer.tsx` | JSON, JS script, MongoDB insert, seed batch history |
| Confirm dialogs | `confirm-dialog.tsx` + `alert-dialog.tsx` | Re-seed, rollback, destructive actions |
| Schema review | Wizard review step + project schema tab | Save snapshot before workbench |

See `docs/dataset-version-history.md` and `docs/ui-design.md` § Generate Flow.

## Dataset versions (shipped)

Every meaningful change creates a new persisted version — never an in-place overwrite:

| Event | Version label (typical) |
| --- | --- |
| Generate | `Initial generation` |
| Before refine | `Before refine: {feedback}` |
| Refine success | `Refined: {message}` |
| Accept candidate | `Accepted refinement` |
| Manual save | `Manual edits` |

Users browse versions in the left rail, load any into the workbench, and **Re-seed** to MongoDB after confirmation.

## Target state (remaining)

| Epic | Priority | Scope |
| --- | --- | --- |
| **005** AI Seed Generation | Done | Generate, validate, refine (core + API) |
| **006** Generation Workbench | Done | Wizard + workbench, tables, plan, streaming, versions panel |
| **007** Preview and Editing | Done | Cell editing, revalidation, fork-on-save |
| **010–012** Export + direct seed | Done (env-gated) | JSON, JS script, MongoDB insert |
| **013** Rollback seed batch | Done (core + API) | `seedBatchId` deletion; UI in export/history |
| Polish | Ongoing | Project detail version list, cross-device connection UX |

## Phased delivery (006 — complete)

| Phase | Focus | User-visible outcome |
| --- | --- | --- |
| **1** | Workbench shell | One screen; setup rail + tables + refine; Finish |
| **2a** | Streaming | Streamed chat + progressive tables + progress |
| **2b** | Export + trust | JSON export, validation badges, quick prompts |
| **3** | Handoff | Direct insert, seed history, version re-seed |

Details: [`specs/006-generation-workbench/plan.md`](../specs/006-generation-workbench/plan.md)

## Research reference

Tonic-inspired patterns: [`specs/006-generation-workbench/research.md`](../specs/006-generation-workbench/research.md)

## Rules for implementers

1. **Keep the setup wizard** for new projects; workbench is for generation after schema save.
2. **No business logic in `apps/web`** — workbench components render API state only.
3. **Never patch saved datasets in place** — use `forkSavedGeneratedDataset` for saves and PATCH.
4. **Distinguish versions from seed batches** in docs and UI copy.
5. Update `docs/ui-design.md` and `docs/dataset-version-history.md` when version behavior changes.

## Related files

- `docs/requirements.md` — product epics
- `docs/dataset-version-history.md` — version + re-seed contract
- `docs/adr/0003-immutable-dataset-versions.md` — ADR
- `specs/005-ai-seed-generation/spec.md` — generation behavior
- `DESIGN.md` — architecture boundaries
