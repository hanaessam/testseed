# Generation UX Roadmap

**Status**: Documented 2026-06-08 — **implementation not started**. The linear wizard remains the active UI until `006-generation-workbench` Phase 1 ships.

## Purpose

This document summarizes why TestSeed is moving from a **generate wizard** to a **Generation Workbench**, how that compares to [Tonic Fabricate](https://www.tonic.ai/products/fabricate), and which epics own each slice of work.

## Current state (shipped)

| Capability | Location | Notes |
| --- | --- | --- |
| Linear wizard | `apps/web/app/generate/page.tsx` | Project → GitHub → schema → review → generate → refine |
| AI generation | `packages/core/src/generation/` | Dependency order, validation, OpenAI via API |
| Chat refinement | Same page, separate step | Uses `refineGeneratedDataset` API |
| Schema review | Wizard review step + project schema tab | Save snapshot before generate |
| Raw JSON preview | Generate step | `<pre>` block |

See `docs/ui-design.md` § Generate Wizard for UI conventions.

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
| **005** AI Seed Generation | Done (API/core) | Generate, validate, refine |
| **006** Generation Workbench | Next | UI restructure, tables, plan, merged refine |
| Export (requirements §2.2) | After 006 Phase 2 | JSON download, seed script |
| Direct insert + rollback | Later | Workbench entry points only |

## Phased delivery (006)

| Phase | Focus | User-visible outcome |
| --- | --- | --- |
| **1** | Workbench shell | One screen: setup rail + tables + chat; no refine step |
| **2** | Export + trust | JSON export, validation badges, refinement summaries |
| **3** | Streaming | Collections appear as they complete |
| **4** | Handoff | Insert, rollback links, CI snippets |

Details: [`specs/006-generation-workbench/plan.md`](../specs/006-generation-workbench/plan.md)

## Research reference

Tonic-inspired patterns and gap analysis: [`specs/006-generation-workbench/research.md`](../specs/006-generation-workbench/research.md)

Demo reference: [YouTube — Tonic-style workflow](https://www.youtube.com/watch?v=qAtGUNLav5k)

## Rules for implementers

1. **Do not remove the wizard** until Phase 1 manual tests pass (see plan verification).
2. **No business logic in `apps/web`** — workbench components render API state only.
3. **Use `router.push` or `Link`** for finish/navigation; never raw `<a href>` to internal routes.
4. Update `docs/ui-design.md` when workbench ships; keep wizard section until deprecation.

## Related files

- `docs/requirements.md` — product epics (export, insert, rollback)
- `specs/005-ai-seed-generation/spec.md` — generation behavior contract
- `DESIGN.md` — architecture boundaries
