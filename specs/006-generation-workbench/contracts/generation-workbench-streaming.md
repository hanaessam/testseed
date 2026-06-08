# Contract: Generation Workbench Streaming (Phase 2a)

Server-Sent Events (SSE) extensions for progressive generation and streamed refinement chat. Batch endpoints from `005` remain available as fallback.

## Generation stream

`POST /projects/:projectId/generations/stream`

Request body: same as `POST /projects/:projectId/generations` (`collectionCounts`).

Response: `Content-Type: text/event-stream`

### Events

| Event | Payload | When |
| --- | --- | --- |
| `plan` | `{ orderedCollections, totalRecords }` | Stream starts |
| `collection_start` | `{ collectionName, index, total }` | Before generating a collection |
| `collection_complete` | `{ collectionName, records[], validationResults[] }` | After collection validates |
| `collection_error` | `{ collectionName, message, code }` | Collection failed after retries |
| `complete` | `{ dataset }` | Full valid dataset assembled |
| `error` | `{ message, code }` | Terminal failure |
| `cancelled` | `{}` | Client disconnected or explicit cancel |

### Guarantees

- Events arrive in plan order for `collection_*` events.
- `complete.dataset` MUST match shape of batch `201` response dataset.
- Partial `collection_complete` records are valid for that collection only.
- Sanitization rules from `005` apply to all payloads.

### Client behavior

- Render rows on each `collection_complete`.
- Update `GenerationProgress` on `collection_start` / `collection_complete`.
- On navigation away: close EventSource / abort fetch; server emits `cancelled`.

## Refinement stream

`POST /projects/:projectId/generations/refinements/stream`

Request body: same as batch refinement (`currentDataset`, `message`, `chatHistory`).

Response: `Content-Type: text/event-stream`

### Events

| Event | Payload | When |
| --- | --- | --- |
| `token` | `{ content: string }` | Assistant text chunk (sanitized) |
| `complete` | `{ dataset?, guidance?, message }` | Refinement finished |
| `error` | `{ message, validationResults? }` | Validation failed or provider error |

### Guarantees

- `token` events MUST NOT contain prompts, secrets, or raw provider errors.
- If validation fails, emit `error` without mutating client-held dataset.
- If guidance-only (no mutation), `complete` has `guidance` and no `dataset`.
- On success with mutation, `complete.dataset` is full replacement grouped by collection.

### Client behavior

- Append user message immediately on submit.
- Append/stream assistant `token` content into dock.
- Replace table data only after `complete` with valid `dataset`.
- AbortController on navigate away (FR-016).

## Fallback

If stream endpoints return `501 Not Implemented` or client feature flag off, workbench uses batch `POST` endpoints (Phase 1 behavior).
