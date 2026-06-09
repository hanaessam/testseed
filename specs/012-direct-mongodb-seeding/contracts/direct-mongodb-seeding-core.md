# Contract: Direct MongoDB Seeding Core

## Module

`packages/core/src/generation/direct-mongodb-seeding.ts`

Export through:

- `packages/core/src/generation/index.ts`
- `packages/core/src/index.ts`

## Types Location

Shared public contracts belong in `packages/types/src/generation.ts`.

## Dependency Boundary

Core may import:

- `@testseed/types`
- local core generation helpers
- Node built-ins such as `crypto`

Core must not import:

- `@testseed/db`
- `apps/api`
- `apps/web`
- Express
- Next.js
- Mongoose

Production MongoDB native-driver objects should be adapted to the minimal interfaces below.

## Minimal Mongo Interfaces

```ts
export interface DirectMongoClientFactory {
  create(connectionString: string, options: { timeoutMs: number }): DirectMongoClient;
}

export interface DirectMongoClient {
  connect(): Promise<void>;
  db(databaseName?: string): DirectMongoDatabase;
  close(): Promise<void>;
}

export interface DirectMongoDatabase {
  databaseName: string;
  command(command: { ping: 1 }): Promise<unknown>;
  collection(name: string): DirectMongoCollection;
}

export interface DirectMongoCollection {
  insertMany(records: Record<string, unknown>[]): Promise<{ insertedCount: number }>;
}
```

## testDirectMongoConnection

```ts
testDirectMongoConnection(
  request: DirectMongoConnectionTestRequest,
  deps: DirectMongoSeedingDeps
): Promise<DirectMongoConnectionTestResult>
```

Behavior:

- Requires a non-empty connection string.
- Creates a client with a 5-10 second timeout.
- Connects, runs `{ ping: 1 }`, and returns `ok: true` with database name when successful.
- Returns `ok: false` with a sanitized error summary when connection or ping fails.
- Always closes the client when it was created.
- Never stores, logs, or returns the connection string.

## buildDirectSeedingConfirmation

```ts
buildDirectSeedingConfirmation(
  request: DirectSeedingConfirmationRequest
): DirectSeedingConfirmationSummary
```

Behavior:

- Uses `dataset.generationOrder` for collection order.
- Uses actual `dataset.collections[collectionName].length` for counts.
- Includes total count and the irreversible-without-rollback warning.
- Rejects empty datasets and generationOrder missing non-empty collections.
- Does not need a database client.

## seedMongoDataset

```ts
seedMongoDataset(
  request: DirectSeedingRequest,
  deps: DirectMongoSeedingDeps
): Promise<DirectSeedingReport>
```

Behavior:

- Requires explicit confirmation.
- Validates the dataset with `validateGeneratedDataset`.
- Rejects empty or invalid datasets before connecting or inserting.
- Generates one UUID v4 `seedBatchId` per operation.
- Copies records and adds `seedBatchId` without mutating the input dataset.
- Inserts collections sequentially in `dataset.generationOrder`.
- Stops after the first collection failure.
- Returns a structured report for success or partial failure.
- Always closes the client when it was created.
- Never stores, logs, or returns the connection string.

## Stable Error Codes

Recommended direct seeding error codes:

- `DIRECT_SEED_CONNECTION_STRING_REQUIRED`
- `DIRECT_SEED_CONNECTION_FAILED`
- `DIRECT_SEED_CONFIRMATION_REQUIRED`
- `DIRECT_SEED_DATASET_EMPTY`
- `DIRECT_SEED_VALIDATION_FAILED`
- `DIRECT_SEED_GENERATION_ORDER_UNSAFE`

## Report Safety

Returned reports and errors may include:

- seedBatchId
- targetDatabaseName
- collection names
- inserted counts
- validation results
- sanitized error summaries

Returned reports and errors must not include:

- connection strings
- usernames/passwords extracted from connection strings
- raw driver error text that includes credentials
- saved dataset mutations
