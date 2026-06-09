# Contract: Core JavaScript Seed Script Export

This contract describes the core package use case. It does not introduce a web route or UI behavior.

## Function

`exportJsSeedScript(input)`

## Input

```ts
{
  schema: ParsedSchema;
  dataset: GeneratedDataset;
  collectionCounts?: Record<string, number>;
}
```

## Success Output

```ts
{
  script: string;
  orderedCollections: string[];
  warnings: GenerationValidationResult[];
}
```

## Error Output

The use case should fail with a clear export error when script generation is blocked.

Expected error information:

```ts
{
  code:
    | "SCRIPT_EXPORT_DATASET_EMPTY"
    | "SCRIPT_EXPORT_VALIDATION_FAILED"
    | "SCRIPT_EXPORT_UNRESOLVED_REFERENCE"
    | "SCRIPT_EXPORT_DEPENDENCY_ORDER_UNSAFE";
  message: string;
  validationResults?: GenerationValidationResult[];
}
```

## Script Contract

The generated script must:

- Be CommonJS JavaScript.
- Require the MongoDB native driver.
- Read the connection string from `MONGODB_URI`.
- Include comments explaining environment setup and required dependency installation.
- Insert records by collection in dependency order.
- Emit `_id` and ObjectId reference fields as `ObjectId("...")`.
- Avoid destructive cleanup, drops, or deletes.
- Be deterministic for identical inputs.

## Blocking Conditions

The use case must not return a script when:

- Dataset is missing or contains no records.
- Validation finds any blocking error.
- Any blocking error is an unresolved reference.
- Dependency order cannot be determined safely.

## Out of Scope

- Web UI export controls.
- API route wiring.
- Direct MongoDB insertion from TestSeed.
- Rollback.
- JSON export.
- Feedback regeneration.
- Preview editing.
