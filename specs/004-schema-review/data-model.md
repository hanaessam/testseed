# Data Model: Schema Review

## Schema Review

- `collections`: Reviewed Collection[]
- `source`: `manual` | `mongodb` | `ai`
- Saved through `PUT /projects/:projectId/schema` as the active project schema snapshot.
- Must not include MongoDB connection strings, access tokens, passwords, or account secrets.

## Reviewed Collection

- `name`: string, required, read-only in review
- `fields`: Reviewed Field[], required
- `sampleCount`: number, optional, read-only evidence from MongoDB discovery
- `warnings`: string[], optional, collection-level uncertainty notes

## Reviewed Field

- `name`: string, required, read-only in review
- `type`: string, editable
- `required`: boolean, editable
- `unique`: boolean, read-only
- `enum`: string[], optional
- `enumSource`: `declared` | `inferred`, optional
- `ref`: string, optional
- `refConfidence`: `explicit` | `inferred` | `possible`, optional
- `defaultValue`: string, optional, read-only
- `confidence`: `high` | `medium` | `low`, optional, read-only marker
- `warnings`: string[], optional, editable
- `children`: Reviewed Field[], optional, read-only nested evidence in this feature
- `itemType`: string, optional, read-only array evidence

## Review Warning

- Plain text explanation of sparse data, mixed types, empty collections, low confidence, or weak reference evidence.
- Field warnings can be corrected in review.
- Collection warnings remain visible when saving or continuing.

## Reference Suggestion

- Explicit manual refs use `refConfidence: "explicit"` and are read-only evidence.
- Discovered or user-corrected refs use `refConfidence: "inferred"` or `"possible"`.

