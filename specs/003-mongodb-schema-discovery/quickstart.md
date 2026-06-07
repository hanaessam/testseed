# Quickstart: MongoDB Schema Discovery

1. Start TestSeed.

```sh
npm run dev
```

2. Sign in and open the Generate screen.

3. Create or load a project.

4. Enter a MongoDB connection string in the MongoDB Schema Discovery panel.

5. Select Test connection.

- Valid connection shows a success message and database name when available.
- Invalid, unreachable, unauthorized, or timed-out connections show sanitized messages.

6. Select Discover schema.

- Discovery samples up to 20 documents per collection.
- Empty databases and empty collections show warnings.
- Sparse or mixed fields show uncertainty markers.
- Nested objects, arrays, and likely references appear in schema review.

7. Review the discovered schema.

8. Select Save schema only when the reviewed schema should become the active project snapshot.

9. Verify no MongoDB connection string appears in project details, schema snapshots, logs, or review output.

10. Run:

```sh
npx turbo build lint test
```

