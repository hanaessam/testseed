# Data Model: MongoDB Schema Discovery

## Discovery Request

- `connectionString`: string, required, operation-only
- `projectId`: string, optional active project context
- `sampleSize`: number, optional, bounded to 1-20

## Mongo Connection Test Response

- `ok`: boolean
- `databaseName`: string, optional
- `message`: sanitized user-facing message
- `errorCategory`: optional sanitized failure category

## Mongo Database Inspection

- `databaseName`: string, optional
- `collections`: Mongo Collection Sample[]

## Mongo Collection Sample

- `name`: string
- `documents`: sampled document records, max 20
- `sampleLimitReached`: boolean, optional, true when more than 20 documents exist

## Discovered Collection

- `name`: string
- `fields`: Inferred Field[]
- `sampleCount`: number
- `warnings`: string[]

## Inferred Field

- `name`: string
- `type`: string
- `required`: boolean
- `unique`: false for discovered fields unless later evidence supports it
- `confidence`: `high` | `medium` | `low`
- `warnings`: string[], optional
- `children`: Inferred Field[], optional nested object/array-object fields
- `itemType`: string, optional array item type
- `ref`: string, optional likely target collection
- `refConfidence`: `inferred` when a likely collection match is found

## Discovered Schema Review

- Uses `ParsedSchema.collections[]`.
- Includes collection sample counts and warnings.
- Remains transient until explicitly saved.
- Must not include connection strings.

