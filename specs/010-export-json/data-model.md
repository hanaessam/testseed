# Data Model: Export Generated Data as JSON

This is a verification-only data model for the existing export behavior.

## Generated Dataset

Represents the active dataset preview available for export.

Relevant fields:

- `status`: determines whether the dataset is valid enough to export.
- `collections`: grouped generated records by collection name; this is the JSON export payload.
- `validationResults`: blocking validation errors associated with the dataset.
- `warnings`: non-blocking issues that may remain visible while export is allowed.

Validation rules:

- Export is unavailable when no generated dataset exists.
- Export is unavailable when `status` is not valid.
- Export is unavailable when validation results include a blocking error.
- Export remains available for warnings only.

## Collection Group

Represents one top-level collection entry in the exported JSON.

Relevant fields:

- Collection name.
- Ordered generated records for that collection.
- Record references already present in generated fields.

Validation rules:

- Collection groups are exported exactly from the active generated dataset.
- References are considered valid when dataset validation has no blocking reference errors.

## Validation Error

Represents a blocking issue that prevents safe manual use of exported JSON.

Relevant fields:

- Severity.
- Collection name.
- Field name.
- Message.

Validation rules:

- Any blocking validation error disables JSON copy and download.
- Validation errors should remain visible in the workbench while export is blocked.
