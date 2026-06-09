# Contract: Export JSON UI

This contract documents existing JSON export behavior for verification. It does not introduce a new API.

## Visibility

The JSON export surface is available in the generation workbench only when JSON export is enabled for the environment.

Verification target:

- `apps/web/app/generate/page.tsx`

Expected behavior:

- Export visibility is controlled by the workbench export feature flag.
- When disabled, no JSON export UI is shown.
- When enabled, the workbench receives export state and renders the export drawer.

## Payload

Verification target:

- `apps/web/components/generation/export-drawer.tsx`

Expected behavior:

- The exported payload is JSON grouped by collection.
- The copy and download actions use the same grouped JSON payload.
- The payload reflects the active generated dataset, not pending candidates or unrelated saved datasets.

## Copy JSON

Verification target:

- `apps/web/components/generation/export-drawer.tsx`

Expected behavior:

- Copy writes grouped JSON to the clipboard.
- Copy is disabled when export is blocked.

## Download JSON

Verification target:

- `apps/web/components/generation/export-drawer.tsx`

Expected behavior:

- Download creates a JSON file from the grouped payload.
- Download is disabled when export is blocked.

## Validation Blocking

Verification targets:

- `apps/web/components/generation/export-drawer.tsx`
- `apps/web/components/generation/validation-summary.tsx`
- `apps/web/components/generation/generation-workbench.tsx`

Expected behavior:

- Export is blocked when there is no dataset.
- Export is blocked when the active dataset is invalid.
- Export is blocked when active validation results include a blocking error.
- Validation errors are shown in the workbench when present.

## Out of Scope

- Feedback regeneration changes.
- Direct seeding changes.
- Rollback changes.
- Preview editing changes.
- New export formats.
- New backend export endpoints.
