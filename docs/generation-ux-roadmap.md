# Generation UX Roadmap

**Status**: Workbench + setup wizard shipped. Streaming enabled by default. Saved runs persist dataset, counts, and chat history per generation/refinement snapshot. Export (2b) still gated by env flag.

## Purpose

This document summarizes why TestSeed is moving from a **generate wizard** to a **Generation Workbench**, how that compares to [Tonic Fabricate](https://www.tonic.ai/products/fabricate), and which epics own each slice of work.

## Current state (shipped)

| Capability | Location | Notes |
| --- | --- | --- |
| Setup wizard | `apps/web/components/generation/project-setup-wizard.tsx` | New projects: context → GitHub → schema → review |
| Generation Workbench | `apps/web/app/generate/page.tsx` | Three-pane: setup rail · tables · agent dock |
| Saved runs | `generated_dataset_records` + left-rail panel | Data, counts, chat history per snapshot |
| AI generation | `packages/core/src/generation/` | Dependency order, validation, OpenAI via API |
| Chat refinement | Agent dock (streamed) | `refineGeneratedDataset` + persisted chat per run |
| Collection counts | `collection-counts-panel.tsx` | Editable in workbench left rail |
| Preview editing | `collection-data-table.tsx` + `editable-table-cell.tsx` | Inline edit, enum dropdown, edited indicator, save bar |
| Schema review | Wizard review step + project schema tab | Save snapshot before workbench |

See `docs/ui-design.md` § Generate Flow for UI conventions.

## Target state (planned)

**Generation Workbench** — three-pane layout on `/generate` (with `projectId`):

```text
┌─────────────────────────────────────────────────────────────┐
│  AppShell                                                    │
├──────────────┬──────────────────────────┬───────────────────┤
│ Setup rail   │ Data canvas              │ Agent dock        │
│ (collapsible)│                          │                   │
│ · Context    │ · Collection tabs        │ · Chat history    │
│ · GitHub     │ · Table preview          │ · Refine input    │
│ · Schema     │ · Validation badges      │ · Quick prompts   │
│ · Plan       │ · Progress (Phase 3)     │                   │
│ · Counts     │                          │                   │
├──────────────┴──────────────────────────┴───────────────────┤
│ Sticky bar: Generate · Regenerate · Export · Finish         │
└─────────────────────────────────────────────────────────────┘
```

Full specification: [`specs/006-generation-workbench/spec.md`](../specs/006-generation-workbench/spec.md)

## Epic map

| Epic | Priority | Scope |
| --- | --- | --- |
| **005** AI Seed Generation | Done | Generate, validate, refine (core + API) |
| **006** Generation Workbench | Done | Wizard + workbench, tables, plan, streaming, JSON export, saved runs |
| **007** Preview and Editing | **Done** | Canvas-like cell editing, revalidation on commit, export/save gating, persist patches |
| Export (requirements §2.2) | Partial | JSON shipped; JS seed script after 007 or 008 |
| Direct insert + rollback | Later | Workbench handoff (006 Phase 3 concept) |

## Phased delivery (006)

| Phase | Focus | User-visible outcome |
| --- | --- | --- |
| **1** | Workbench shell | All users on one screen; setup rail + static tables + merged refine; Finish only |
| **2a** | Streaming | Streamed chat + progressive tables + generation progress (Tonic-demo feel) |
| **2b** | Export + trust | JSON export, validation badges, quick prompts, refinement summaries |
| **3** | Handoff | Insert, rollback links, CI snippets |

Details: [`specs/006-generation-workbench/plan.md`](../specs/006-generation-workbench/plan.md)

## Research reference

Tonic-inspired patterns and gap analysis: [`specs/006-generation-workbench/research.md`](../specs/006-generation-workbench/research.md)

Demo reference: [YouTube — Tonic-style workflow](https://www.youtube.com/watch?v=qAtGUNLav5k)

## Rules for implementers

1. **Keep the setup wizard** for new projects; workbench is for generation after schema save.
2. **No business logic in `apps/web`** — workbench components render API state only.
3. **Use `router.push` or `Link`** for finish/navigation; never raw `<a href>` to internal routes.
4. Update `docs/ui-design.md` when workbench ships; keep wizard section until deprecation.

## Related files

- `docs/requirements.md` — product epics (export, insert, rollback)
- `specs/005-ai-seed-generation/spec.md` — generation behavior contract
- `DESIGN.md` — architecture boundaries
