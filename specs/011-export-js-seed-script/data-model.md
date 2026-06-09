# Data Model: Export JavaScript Seed Script

## JavaScriptSeedScriptRequest

Represents the inputs needed to generate a seed script.

Fields:

- `schema`: reviewed parsed schema for validation and ObjectId/reference field discovery.
- `dataset`: generated dataset to serialize.
- `collectionCounts`: optional requested collection counts; defaults to dataset collection counts.

Validation rules:

- Dataset must exist and include at least one record.
- Dataset must validate with no blocking errors.
- Unresolved references block script generation.
- Collection ordering must be derivable from existing generation order or schema dependency planning.

## JavaScriptSeedScriptResult

Represents the successful export result.

Fields:

- `script`: deterministic readable CommonJS JavaScript source.
- `orderedCollections`: collection names in insertion order.
- `warnings`: non-blocking validation warnings preserved for callers.

Validation rules:

- `script` is returned only when there are no blocking validation errors.
- `orderedCollections` must match the insert sections in the script.

## JavaScriptSeedScriptError

Represents a rejected export.

Fields:

- `code`: stable error code for caller handling.
- `message`: clear developer-facing explanation.
- `validationResults`: blocking validation details, when available.

Error categories:

- Missing or empty dataset.
- Blocking validation errors.
- Unresolved references.
- Unsafe dependency order.

## Script Record Literal

Represents generated records serialized into JavaScript source.

Rules:

- Plain values remain deterministic JavaScript literals.
- `_id` values are emitted as `ObjectId("...")`.
- Schema ObjectId reference fields are emitted as `ObjectId("...")`.
- Field ordering is stable so repeated exports produce identical output.

## Collection Dependency Order

Represents the insert sequence.

Rules:

- Parent collections appear before child collections.
- Existing generation order may be used when valid.
- Schema dependency planning should be used to verify or derive safe ordering.
