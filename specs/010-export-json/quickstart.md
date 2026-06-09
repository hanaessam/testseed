# Quickstart: Export Generated Data as JSON Verification

## Goal

Verify the existing JSON export behavior. Do not modify export implementation unless a real gap is found.

## Feature Flag Check

1. Inspect the generation page export flag wiring.
2. Confirm JSON export is visible only when `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT` is set to `true`.
3. Record whether the target environment has the flag enabled.

## Valid Dataset Verification

1. Open the generation workbench with JSON export enabled.
2. Generate or load a valid dataset.
3. Open the export surface.
4. Confirm the displayed JSON is grouped by collection.
5. Use copy JSON.
6. Confirm the copied content matches the grouped JSON shown in the export surface.
7. Use download JSON.
8. Confirm the downloaded file contains the same grouped JSON.

## Invalid Dataset Verification

1. Produce or load a dataset with a blocking validation error.
2. Open the export surface.
3. Confirm copy JSON is disabled.
4. Confirm download JSON is disabled.
5. Confirm validation errors are visible in the workbench.

## Scope Regression Check

Confirm verification did not require changes to:

- Feedback regeneration.
- Direct seeding.
- Rollback.
- Preview editing.

## Recommended Outcome

If all checks pass, mark the sheet row **Completed**. If the only concern is that the feature flag is disabled in a target environment, track that as configuration follow-up rather than export implementation work.
