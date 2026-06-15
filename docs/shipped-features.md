# TestSeed Shipped Features

**Status**: Living inventory of production-ready capabilities  
**Last updated**: 2026-06-10  
**Audience**: Product, engineering, QA, and agents onboarding to the repo

This document lists **everything that ships today** in TestSeed — including areas without a Spec Kit folder (account management, projects, dashboard, etc.). For architecture rules see [`DESIGN.md`](../DESIGN.md). For product requirements see [`docs/requirements.md`](requirements.md).

---

## Summary

TestSeed is a full-stack MongoDB seed-data product: users register, create projects, define schema (paste or discover), generate AI seed data in a workbench, refine it via chat, edit cells, export or insert into MongoDB, and roll back inserts by `seedBatchId`. All generation and seed operations are scoped to authenticated users and their projects.

| Area | Shipped highlights |
| --- | --- |
| Account | Email OTP registration, login, GitHub OAuth, profile, password reset, delete account |
| Projects | CRUD, archive/restore, context, GitHub repo link, versioned schema snapshots |
| Schema | Parse Mongoose, MongoDB discovery, field review, snapshot history |
| Generation | AI generate (sync + stream), plan, validate, refine chat, feedback regeneration |
| Workbench | Setup wizard, three-pane UI, tables, counts, saved runs, cell editing |
| Export & seed | JSON, JS script, direct MongoDB insert, connection test, confirmation |
| Rollback | Delete records by `seedBatchId` in reverse dependency order |
| History | Append-only project events and seed batch metadata |

---

## Environment gates

Some UI capabilities require explicit env flags on the **web** app:

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING` | enabled (`!== "false"`) | Streamed generation + refinement in workbench |
| `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT` | **disabled** unless `"true"` | Export drawer: JSON, JS script, direct seed, rollback |

API features (export script, direct seed, rollback) exist regardless; the workbench **Export** button is hidden when export is disabled.

---

## Master feature index

| # | Feature | Shipped | UI | API / core | Spec / doc |
| --- | --- | --- | --- | --- | --- |
| **Account & auth** |
| 1 | Email + password registration (OTP) | Yes | `/register` | `POST /auth/register/request-otp`, `verify-otp` | `specs/002-account-management/`, `docs/auth-email-otp.md` |
| 2 | Email + password login | Yes | `/login` | `POST /auth/login` | `specs/002-account-management/` |
| 3 | GitHub OAuth login | Yes* | `/login`, `/auth/github/callback` | `GET /auth/github`, callback | `docs/github-auth-design.md` |
| 4 | Logout | Yes | App shell | `POST /auth/logout` | — |
| 5 | Session / JWT | Yes | Client session storage | `GET /auth/me`, middleware | — |
| 6 | Account profile (display name) | Yes | `/account` → Profile | `PATCH /auth/me` | `specs/002-account-management/` |
| 7 | Email change (OTP verify) | Yes | `/account` → Profile | `POST /auth/me/verify-email` | `docs/auth-email-otp.md` |
| 8 | Password change | Yes | `/account` → Security | `POST /auth/change-password` | `specs/002-account-management/` |
| 9 | Forgot / reset password (OTP) | Yes | `/forgot-password`, `/reset-password` | `POST /auth/forgot-password`, `reset-password` | `docs/auth-email-otp.md` |
| 10 | Delete account | Yes | `/account` → Danger zone | `DELETE /auth/me` | `specs/002-account-management/` |
| **Projects & workspace** |
| 11 | Create project | Yes | `/generate` wizard, `/projects` | `POST /projects` | `specs/001-project-context-setup/` |
| 12 | List projects | Yes | `/projects`, `/dashboard` | `GET /projects` | — |
| 13 | Project detail | Yes | `/projects/[projectId]` | `GET /projects/:id` | — |
| 14 | Rename / update description | Yes | Project detail → Management | `PATCH /projects/:id` | — |
| 15 | Archive project | Yes | `/projects` | `DELETE /projects/:id?mode=archive` | — |
| 16 | Hard delete project | Yes | Project detail | `DELETE /projects/:id?mode=hard` | — |
| 17 | Restore archived project | Yes | `/projects` (Archived filter) | `PATCH /projects/:id/restore` | — |
| 18 | Dashboard overview | Yes | `/dashboard` | Aggregates projects + history | — |
| **Project context** |
| 19 | Project description (domain context) | Yes | Wizard, project Context tab | `PUT /projects/:id/context` | `specs/001-project-context-setup/` |
| 20 | GitHub repository context (OAuth) | Yes* | Wizard, project Context tab | `POST /projects/:id/context/github/authorize`, callback | `specs/001-project-context-setup/` |
| 21 | Remove repository context | Yes | Project Context tab | `DELETE /projects/:id/context/github` | — |
| 22 | Context sources summary in workbench | Yes | Generate workbench left rail | Reads project detail | `specs/006-generation-workbench/` |
| **Schema input & review** |
| 23 | Paste Mongoose schema | Yes | Generate wizard | `POST /schemas/parse` | `specs/004-schema-review/` |
| 24 | Upload schema file(s) | Yes | Generate wizard | `POST /schemas/parse` (files) | `specs/004-schema-review/` |
| 25 | MongoDB connection test (discovery) | Yes | Generate wizard | `POST /schemas/mongodb/test-connection` | `specs/003-mongodb-schema-discovery/` |
| 26 | MongoDB schema discovery | Yes | Generate wizard | `POST /schemas/mongodb/discover` | `specs/003-mongodb-schema-discovery/` |
| 27 | Schema field review UI | Yes | Wizard review, project Schema tab | — | `specs/004-schema-review/` |
| 28 | Save schema snapshot to project | Yes | Wizard, project Schema tab | `PUT /projects/:id/schema` | `specs/004-schema-review/` |
| 29 | Versioned schema snapshots | Yes | Project detail | `activeSchemaSnapshotId`, history | `specs/004-schema-review/` |
| 30 | Archive / restore / delete schema snapshot | Yes | Project Schema tab | `PATCH/DELETE /projects/:id/schema` | — |
| **AI seed generation** |
| 31 | Generation plan (dependency order) | Yes | Workbench left rail | `GET /projects/:id/generation-plan` | `specs/005-ai-seed-generation/` |
| 32 | Generate seed data (sync) | Yes | Workbench Generate | `POST /projects/:id/generations` | `specs/005-ai-seed-generation/` |
| 33 | Generate seed data (stream / SSE) | Yes | Workbench | `POST /projects/:id/generations/stream` | `specs/006-generation-workbench/` |
| 34 | OpenAI-backed generation | Yes* | — | `packages/core` providers | Requires `OPENAI_API_KEY` |
| 35 | Validation gate (types, enums, refs) | Yes | Workbench badges | `validateGeneratedDataset` | `specs/005-ai-seed-generation/` |
| 36 | Per-collection record counts | Yes | Workbench left rail | Passed to generation APIs | `specs/006-generation-workbench/` |
| **Refinement & regeneration** |
| 37 | AI chat refinement (sync) | Yes | Agent dock | `POST .../generations/refinements` | `specs/005-ai-seed-generation/` |
| 38 | AI chat refinement (stream) | Yes | Agent dock | `POST .../generations/refinements/stream` | `specs/006-generation-workbench/` |
| 39 | Guidance-only refinement (no data change) | Yes | Agent dock | Updates chat on active saved run | — |
| 40 | Feedback-based regeneration | Yes | Agent dock | `POST .../generations/regenerate` | `specs/008-feedback-based-regeneration/` |
| 41 | Regeneration candidate review | Yes | Workbench banner | Accept / reject UI | `specs/009-review-regeneration/` |
| 42 | Quick prompt chips | Yes | Agent dock | Client presets | `specs/006-generation-workbench/` |
| **Saved datasets (runs)** |
| 43 | Auto-save on successful generation | Yes | — | Creates `generated_dataset_records` | `specs/006-generation-workbench/` |
| 44 | New saved run on dataset-changing refine | Yes | Saved runs panel | `saveGeneratedDataset` | `specs/006-generation-workbench/` |
| 45 | List / load saved runs | Yes | Workbench + project overview | `GET .../generated-datasets` | `specs/006-generation-workbench/` |
| 46 | Patch active saved run (manual edits) | Yes | Save bar | `PATCH .../generated-datasets/:id` | `specs/007-preview-editing/` |
| 47 | Save as new run | Yes | Save bar | `POST .../generated-datasets` | `specs/007-preview-editing/` |
| 48 | Persist refinement chat per run | Yes | Agent dock restore on load | `chatHistory` on record | `specs/006-generation-workbench/` |
| **Preview & editing** |
| 49 | Per-collection data tables | Yes | Workbench center | — | `specs/006-generation-workbench/` |
| 50 | Inline cell editing | Yes | Data canvas | `POST .../dataset-edits` | `specs/007-preview-editing/` |
| 51 | Field editability rules | Yes | Read-only `_id`, refs, objects | `packages/core` editability | `specs/007-preview-editing/` |
| 52 | Revalidate on cell commit | Yes | Inline errors | `applyCellEditToDataset` | `specs/007-preview-editing/` |
| 53 | Edited cell indicators | Yes | Table cells | Client state | `specs/007-preview-editing/` |
| 54 | Unsaved edits warning | Yes | Navigate away | `beforeunload` + click guard | `specs/007-preview-editing/` |
| 55 | Export / seed blocked when invalid | Yes | Export drawer | Client + API gates | `specs/007-preview-editing/` |
| **Export** |
| 56 | Export drawer | Gated | Workbench (Export button) | — | `specs/010-export-json/` |
| 57 | Download / copy JSON | Gated | Export drawer | Client-side from dataset | `specs/010-export-json/` |
| 58 | JavaScript seed script export | Gated | Export drawer | `POST .../datasets/javascript-seed-script` | `specs/011-export-js-seed-script/` |
| **Direct MongoDB seeding** |
| 59 | Connection test (direct seed) | Gated | Export drawer | `POST .../direct-seeding/test-connection` | `specs/012-direct-mongodb-seeding/` |
| 60 | Pre-insert confirmation summary | Gated | Export drawer | `POST .../direct-seeding/confirmation` | `specs/012-direct-mongodb-seeding/` |
| 61 | Direct insert with `seedBatchId` tag | Gated | Export drawer | `POST .../direct-seeding` | `specs/012-direct-mongodb-seeding/` |
| 62 | Insertion report | Gated | Export drawer | Response `DirectSeedingReport` | `specs/012-direct-mongodb-seeding/` |
| 63 | Upsert / stable `_id` on re-seed | Gated | Core seeding | `prepareDatasetIdsForInsertion` | — |
| **Rollback & history** |
| 64 | Record seed batch metadata | Yes | — | `POST /projects/:id/seed-batches` | `docs/superpowers/plans/` |
| 65 | List project history & seed batches | Yes | Project History tab, dashboard | `GET /projects/:id/history` | — |
| 66 | Rollback seed batch by ID | Gated | Export drawer after seed | `POST /projects/:id/rollback` | `specs/013-rollback-seed-batch/` |
| 67 | Append-only project events | Yes | History tab | `appendProjectEvent` | — |
| **UI platform** |
| 68 | App shell (sidebar nav) | Yes | All authenticated pages | — | `docs/ui-design.md` |
| 69 | Light / dark / system theme | Yes | Sidebar toggle | Redux + `localStorage` | `docs/ui-design.md` |
| 70 | Session expiry banner | Yes | App shell | 401 → login redirect | — |
| 71 | Branded logos & favicon | Yes | Shell, auth pages | Static assets | `README.md` |
| 72 | Projects list views (cards/list/compact) | Yes | `/projects` | — | `docs/ui-design.md` |
| 73 | Projects filters & search | Yes | `/projects` | Client-side | `docs/ui-design.md` |

\* **GitHub OAuth** and **OpenAI** require server env configuration; features degrade gracefully when not configured.

---

## Detailed feature reference

### 1. Account management & authentication

**Shipped.** No single “account” spec marked Shipped in front matter, but full implementation exists in `packages/core/src/auth/` and `apps/api/src/routes/auth.ts`.

| Capability | Behavior |
| --- | --- |
| Registration | User submits email + password → 6-digit OTP emailed → verify → account created |
| Login | Email/password → JWT returned → stored client-side |
| GitHub login | OAuth redirect → callback creates/links user → session |
| Profile | Update display name; email change staged until OTP verified |
| Security | Change password with current password check |
| Recovery | Forgot password flow with emailed OTP |
| Delete | Requires password + typing `DELETE`; removes user data per core rules |

**Web routes:** `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account`, `/auth/github/callback`

**Security:** Passwords hashed server-side; JWT for API auth; connection strings never stored (see below).

---

### 2. Projects & workspace

**Shipped.** Core project lifecycle without requiring users to open the generation workbench first.

| Capability | Behavior |
| --- | --- |
| Create | Name + optional description; from wizard or API |
| List | Active and archived; dashboard shows recent with history summary |
| Detail | Overview, Context, Schema, History, Management tabs |
| Update | Rename, edit description |
| Archive | Soft-delete; hidden from default list |
| Restore | Reactivate archived project |
| Hard delete | Permanent removal (with confirmation) |

**Web routes:** `/dashboard`, `/projects`, `/projects/[projectId]`

**API:** `apps/api/src/routes/projects.ts` — `createProject`, `listUserProjects`, `getProjectDetail`, `updateProject`, `deleteProject`, `restoreProject`

---

### 3. Project context

**Shipped.** Improves AI realism via plain-language description and optional GitHub repo summary.

| Capability | Behavior |
| --- | --- |
| Description | Free-text domain context; included in generation prompts |
| GitHub connect | OAuth to read repo metadata/summary for context |
| Disconnect | Removes repo context from project |
| Warnings | UI shows when context is generic or missing |

**Spec:** `specs/001-project-context-setup/` (implementation-complete; spec status Draft)

---

### 4. Schema input, discovery & review

**Shipped.** Two input paths converge on a reviewed `ParsedSchema` saved as a versioned snapshot.

| Input method | Flow |
| --- | --- |
| Paste / upload | `POST /schemas/parse` → review UI → save to project |
| MongoDB | Test connection → discover collections from samples → review inferred fields → save |

| Review features | |
| --- | --- |
| Collections & fields | Names, types, required, unique |
| Enums | Declared or inferred |
| References | ObjectId refs with confidence |
| Warnings | Low-confidence inference flagged |
| Snapshots | Each save bumps schema version; restore/archive/delete on project detail |

**Specs:** `003-mongodb-schema-discovery`, `004-schema-review`

---

### 5. Generation workbench

**Shipped.** Primary post-schema UX on `/generate`.

#### Setup wizard (new projects)

Stepper: **Project** → **GitHub** (optional) → **Schema** (paste / upload / MongoDB) → **Review** → open workbench.

Returning users: `?projectId=…&mode=generate` or `?mode=edit` for wizard.

#### Three-pane workbench

| Pane | Contents |
| --- | --- |
| Left | Setup link, context sources, collection counts, generation plan, **saved runs** |
| Center | Collection tabs, tables, validation badges, progress |
| Right | Agent dock (refinement chat), quick prompts |

#### Generation

- Builds plan from schema + counts (dependency order, risk warnings).
- **Generate** calls OpenAI via API; validates output.
- **Streaming** (default): progressive table updates via SSE.
- Successful run creates a **saved dataset** record (`source: generation`).

**Spec:** `specs/006-generation-workbench/`

---

### 6. AI refinement & feedback regeneration

**Shipped.**

| Flow | Behavior |
| --- | --- |
| Chat refine | User message → AI returns updated dataset or guidance |
| Stream refine | Token streaming in agent dock |
| Dataset updated | New saved run + full chat history |
| Guidance only | Chat history updated on active run; dataset unchanged |
| Feedback regenerate | Sends accepted dataset + feedback → **candidate** for review |
| Accept candidate | Patches active run or creates new; becomes accepted baseline |
| Reject candidate | Discards candidate; user can revise feedback |

**Specs:** `005-ai-seed-generation`, `008-feedback-based-regeneration`, `009-review-regeneration`

---

### 7. Saved datasets (“saved runs”)

**Shipped.** Persisted in MongoDB collection `generated_dataset_records`.

| Event | Persistence |
| --- | --- |
| Generate success | New record, empty chat |
| Refine (data changed) | New record with chat |
| Manual save (first time) | `POST` new record (`manual_edit`) |
| Manual save (active run) | `PATCH` updates record in place |
| Save as new | `POST` duplicate |
| Load run | Restores tables + agent dock chat |

**UI:** Left rail **Saved runs** panel; project overview shows recent summaries.

**Note:** Design for immutable **dataset version history** (fork on every change, re-seed any version) is documented in [`dataset-version-history.md`](dataset-version-history.md) and [`adr/0003-immutable-dataset-versions.md`](adr/0003-immutable-dataset-versions.md). That fork/re-seed UX is **not yet implemented** in the current codebase; saves still patch the active run.

---

### 8. Preview & inline editing

**Shipped** (`specs/007-preview-editing/`).

- Click-to-edit on scalar fields; enum dropdowns.
- `_id`, references, objects/arrays read-only.
- Commit on blur/Enter; Escape cancels.
- Server revalidates full dataset on each commit.
- Save bar when dirty; blocks export/seed while invalid.

---

### 9. Export (env-gated UI)

**Shipped** when `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true`.

| Export type | Behavior |
| --- | --- |
| JSON | Download or copy `collections` payload |
| JS seed script | API generates insert script in dependency order |
| Direct seed | See next section |

**Specs:** `010-export-json`, `011-export-js-seed-script`

---

### 10. Direct MongoDB seeding

**Shipped** (API + export drawer UI when export enabled).

1. User pastes connection string (transient — not stored server-side).
2. **Test connection** → fingerprint + token.
3. **Prepare** → confirmation summary (DB name, collections, counts, warning).
4. **Confirm** → insert in generation order; tag every document with `seedBatchId`.
5. **Report** → per-collection counts, batch id, rollback metadata.

Partial failure: report shows which collections succeeded/failed.

**Spec:** `specs/012-direct-mongodb-seeding/`, integration notes `014-direct-seeding-integration/`

---

### 11. Rollback & project history

**Shipped.**

| Capability | Behavior |
| --- | --- |
| Seed batches | Metadata per direct seed (id, counts, order, status, document ids) |
| Project events | Append-only log (generation, chat, seed, rollback, schema, etc.) |
| Rollback | Delete only documents matching `seedBatchId`; reverse collection order; mark batch `rolled_back` |
| UI | History tab on project detail; rollback button in export drawer after successful seed |

**Spec:** `specs/013-rollback-seed-batch/`

---

### 12. UI platform & navigation

**Shipped** — see [`docs/ui-design.md`](ui-design.md).

- **App shell:** Dashboard, New project, Projects; user pane → account.
- **Theme:** Light, dark, system via Redux.
- **Projects page:** Lifecycle filter, schema readiness filter, sort, search, cards/list/compact.
- **Confirmations:** Mix of `window.confirm` (archive, delete, rollback) — AlertDialog migration partial.

---

## Security & data handling (shipped)

| Rule | Implementation |
| --- | --- |
| Auth required for projects/generation | JWT middleware on API |
| Owner-scoped data | Project `ownerId` checks in core |
| Transient MongoDB URIs | Used per request only; not persisted or logged |
| AI output validation | Required before save/export/seed |
| `seedBatchId` scoped rollback | Never deletes untagged or other-batch records |

---

## API route map (quick reference)

| Prefix | Router | Purpose |
| --- | --- | --- |
| `/auth` | `auth.ts` | Registration, login, GitHub, account |
| `/schemas` | `schema.ts` | Parse, MongoDB test/discover |
| `/projects` | `projects.ts` | Projects, context, schema snapshots |
| `/projects` | `generation.ts` | Generation, datasets, export, direct seed |
| `/projects` | `history.ts` | History, seed batch recording |
| `/projects` | `rollback.ts` | Seed batch rollback |

---

## Not shipped / out of scope

| Item | Notes |
| --- | --- |
| Immutable dataset version history + panel re-seed | Designed in `dataset-version-history.md`; code still uses patch-in-place saved runs |
| Team workspaces / RBAC | Requirements list as non-core |
| SQL / Prisma / Sequelize | Out of scope |
| Long-term cross-project seed analytics | Out of scope |
| Native mobile app | Web only |
| Stored MongoDB connection profiles | By design — transient only |

---

## Related documentation

| Document | Purpose |
| --- | --- |
| [`requirements.md`](requirements.md) | Epics, user stories, acceptance criteria |
| [`generation-ux-roadmap.md`](generation-ux-roadmap.md) | Workbench evolution |
| [`ui-design.md`](ui-design.md) | Visual system & page patterns |
| [`dataset-version-history.md`](dataset-version-history.md) | Target versioning design (partial implementation) |
| [`auth-email-otp.md`](auth-email-otp.md) | OTP flows |
| [`github-auth-design.md`](github-auth-design.md) | GitHub OAuth |
| [`ai-assisted-tooling.md`](ai-assisted-tooling.md) | Spec Kit epic index |
| [`../specs/`](../specs/) | Per-feature specs, plans, contracts |

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-10 | Initial complete shipped feature inventory |
