# Quickstart: Schema Review

1. Start TestSeed.

```sh
npm run dev
```

2. Sign in and open the Generate screen.

3. Create or load a project.

4. Use either input method:

- Paste or upload Mongoose schema files and select Analyze schema.
- Enter a MongoDB connection string, test the connection, and select Discover schema.

5. Review the detected collections and fields.

- Switch collections with the collection tabs.
- Correct supported field details: type, required status, non-explicit references, inferred enum-like values, and warnings.
- Confirm declared enum values and explicit refs remain read-only.
- Confirm low-confidence warnings remain visible and do not block saving.

6. Save the reviewed schema.

7. Open project details and confirm the active schema snapshot includes the reviewed edits and warnings.

8. Run verification before handoff.

```sh
npx turbo build lint test
```

