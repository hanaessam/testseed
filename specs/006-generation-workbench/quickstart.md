# Quickstart: Generation Workbench

## Prerequisites

- Node.js 20+, npm 10+, `npm install`
- `.env` with valid `OPENAI_API_KEY`
- Authenticated user with at least one project
- `005` generation APIs available
- Branch `006-generation-workbench` for implementation work

## Phase 1 demo flow

1. Start API and web: `npm run dev`
2. Sign in.
3. Open `/generate` (new project) or `/generate?projectId={id}&mode=generate` (returning).
4. Confirm **workbench layout** (setup rail | data canvas | agent dock) — no wizard stepper.
5. Expand Setup: enter project description; optionally connect GitHub.
6. Confirm **context sources** show description and/or repository before Generate.
7. Paste/upload schema or run MongoDB discovery; review and save snapshot.
8. Set per-collection counts; confirm **generation plan** shows order and references.
9. If plan shows blocking warnings, confirm **risk notice** appears and Generate is still enabled.
10. Click Generate; wait for **full response**; confirm **per-collection tables** (not JSON-only).
11. Send refinement in agent dock; confirm tables update on success, unchanged on failure.
12. Navigate away during refinement; confirm in-flight request cancels.
13. Click **Finish**; confirm project detail loads without navigation error.
14. Confirm **no export** controls in Phase 1.

```sh
npx turbo build lint test
```

## Phase 2a demo flow (streaming)

1. Complete Phase 1 prerequisites with a multi-collection schema (e.g. users + orders).
2. Generate using stream endpoint (or workbench when wired).
3. Confirm **first collection rows** appear before last collection completes.
4. Confirm **progress checklist** updates per collection.
5. Refine with stream endpoint; confirm **assistant text streams** into dock within ~2s.
6. Navigate away during generation; confirm partial state clears.

## Phase 2b demo flow (export)

1. Generate valid dataset.
2. Open export drawer; download JSON — file matches preview structure.
3. Introduce validation error (or use invalid dataset fixture); confirm export disabled.
4. Confirm validation badges on affected rows/fields.

## API smoke — plan (Phase 1)

```sh
GET /projects/{projectId}/generation-plan?collectionCounts={"users":3,"orders":5}
Authorization: Bearer {token}
```

Expect `200` with `orderedCollections` and `riskLevel`.

## API smoke — batch (Phase 1, unchanged)

```sh
POST /projects/{projectId}/generations
POST /projects/{projectId}/generations/refinements
```

See `specs/005-ai-seed-generation/contracts/ai-seed-generation-api.md`.

## API smoke — stream (Phase 2a)

```sh
POST /projects/{projectId}/generations/stream
Accept: text/event-stream
```

Expect `collection_complete` events in dependency order, then `complete`.

## Troubleshooting

| Issue | Check |
| --- | --- |
| Wizard still shows | Phase 1 not shipped; workbench flag / branch |
| Generic data | Context sources empty; add description |
| Finish 500 | Use client navigation, not `<a href>` |
| No streaming | Phase 2a not deployed; batch fallback expected |
