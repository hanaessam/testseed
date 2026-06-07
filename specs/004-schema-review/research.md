# Research: Schema Review

## Decision: Reuse `ParsedSchema` As The Review Payload

The reviewed schema is the same `ParsedSchema.collections[]` object used by parsing, discovery, seed generation, and project snapshots.

**Rationale**: The existing contract already carries the required metadata: confidence, warnings, nested children, array item type, enum source, reference confidence, sample counts, and collection warnings.

**Rejected Alternative**: Add an original-vs-reviewed snapshot model. This would add storage complexity without a current requirement to diff or audit every correction.

## Decision: Limit Edits To Existing Field Details

Schema Review supports correcting field type, required status, inferred enum-like values, non-explicit references, and warnings.

**Rationale**: The feature is a review checkpoint, not a schema authoring tool. Names and collection membership remain evidence from parsing/discovery.

**Rejected Alternative**: Full CRUD schema editor. This would require add/remove contracts, validation rules, and UX that are outside feature 004.

## Decision: Treat Declared Manual Metadata As Strong Evidence

Declared enum values are read-only, and explicit references are labeled explicit.

**Rationale**: Manual Mongoose definitions are stronger than sampled inference. Letting users silently alter declared constraints would blur the difference between source facts and review corrections.

## Decision: Validate Recursive Review Metadata In The API

`PUT /projects/:projectId/schema` accepts nested `children` and review metadata through a recursive Zod schema.

**Rationale**: The API is the trust boundary for reviewed snapshots. Validation must accept all supported schema metadata while rejecting malformed field names and invalid enum values.

