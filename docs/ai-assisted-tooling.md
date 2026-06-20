# AI-Assisted Tooling (TestSeed)

Living inventory of AI agents, MCP servers, skills, rules, plugins, and planning workflows used in this repo.

**Maintainers:** Update this file when you add/remove MCPs, skills, Spec Kit features, Superpowers docs, or agent rules. Bump **Last updated** and add a row to the changelog at the bottom.

**Last updated:** 2026-06-08

---

## Quick reference

| Layer | Location | Purpose |
| --- | --- | --- |
| Agent guide | `AGENTS.md` | Architecture rules, dependency direction, active Spec Kit feature |
| Spec Kit | `.specify/` | Spec-driven development: specify → clarify → plan → tasks → implement |
| Feature specs | `specs/` | Per-epic `spec.md`, `plan.md`, `tasks.md`, contracts |
| Project skills | `.agents/skills/` | Slash-command workflows for Spec Kit + TestSeed conventions |
| Superpowers | `docs/superpowers/` | Older agent-facing plans/workflows (pre–Spec Kit slice) |
| MCP config | `.mcp.json`, `.cursor/mcp.json` | Model Context Protocol servers for Cursor/Codex |
| Active feature | `.specify/feature.json` | Points agents at current Spec Kit feature directory |

**Active Spec Kit feature:** `specs/007-preview-editing` (Preview and Editing — canvas-like cell editing)

---

## 1. Spec Kit (`.specify/`)

[Spec Kit](https://github.com/github/spec-kit)-style spec-driven development, integrated for **Codex** (`integration.json` → `"integration": "codex"`).

### What it does

Structured product delivery: natural-language feature → `spec.md` → optional clarify → `plan.md` + contracts → `tasks.md` → implementation, with git hooks and agent-context updates.

### Key paths

| Path | Role |
| --- | --- |
| `.specify/templates/` | `spec-template.md`, `plan-template.md`, `tasks-template.md` |
| `.specify/memory/constitution.md` | Project principles template (governance) |
| `.specify/extensions.yml` | Lifecycle hooks (git branch, auto-commit, agent-context) |
| `.specify/feature.json` | Current feature directory (`specs/007-preview-editing`) |
| `.specify/workflows/speckit/workflow.yml` | Full SDD cycle: specify → plan → tasks → implement |
| `.specify/scripts/powershell/` | `setup-plan.ps1`, `check-prerequisites.ps1`, `create-new-feature.ps1` |

### Extensions

| Extension | Commands | Used for |
| --- | --- | --- |
| **git** | `speckit.git.feature`, `speckit.git.commit`, `speckit.git.initialize`, … | Feature branches (`007-preview-editing`), optional auto-commit after each phase |
| **agent-context** | `speckit.agent-context.update` | Syncs `<!-- SPECKIT START -->` block in `AGENTS.md` to latest `plan.md` |

### Slash commands (repo skills)

Invoke in Cursor/Codex chat; skills live in `.agents/skills/`.

| Command | Skill file | Purpose |
| --- | --- | --- |
| `/speckit-specify` | `speckit-specify/SKILL.md` | Create feature spec from description |
| `/speckit-clarify` | `speckit-clarify/SKILL.md` | Resolve ambiguities (≤5 questions) → update spec |
| `/speckit-plan` | `speckit-plan/SKILL.md` | `plan.md`, `research.md`, `data-model.md`, contracts |
| `/speckit-tasks` | `speckit-tasks/SKILL.md` | Generate `tasks.md` |
| `/speckit-implement` | `speckit-implement/SKILL.md` | Execute tasks in `tasks.md` |
| `/speckit-checklist` | `speckit-checklist/SKILL.md` | Feature quality checklist |
| `/speckit-analyze` | `speckit-analyze/SKILL.md` | Cross-check spec / plan / tasks consistency |
| `/speckit-constitution` | `speckit-constitution/SKILL.md` | Update project constitution |
| `/speckit-taskstoissues` | `speckit-taskstoissues/SKILL.md` | Sync tasks to GitHub issues |
| `/speckit-git-feature` | `speckit-git-feature/SKILL.md` | Create numbered feature branch |
| `/speckit-git-commit` | `speckit-git-commit/SKILL.md` | Auto-commit after a Spec Kit phase |
| `/speckit-agent-context-update` | `speckit-agent-context-update/SKILL.md` | Refresh `AGENTS.md` Spec Kit section |

### Feature specs (`specs/`)

| ID | Directory | Status (high level) |
| --- | --- | --- |
| 001 | `specs/001-project-context-setup/` | Shipped |
| 002 | `specs/002-account-management/` | Shipped |
| 003 | `specs/003-mongodb-schema-discovery/` | Shipped |
| 004 | `specs/004-schema-review/` | Shipped |
| 005 | `specs/005-ai-seed-generation/` | Shipped |
| 006 | `specs/006-generation-workbench/` | Shipped (wizard + workbench + dataset versions) |
| 007 | `specs/007-preview-editing/` | Shipped — canvas editing, fork-on-save, export gating |
| 008 | `specs/008-feedback-based-regeneration/` | Shipped — feedback regenerate + pre-refine snapshots |
| 012 | `specs/012-direct-mongodb-seeding/` | Shipped — direct insert, `savedDatasetId` link |
| 013 | `specs/013-rollback-seed-batch/` | Shipped — MongoDB batch rollback by `seedBatchId` |
| 015 | `specs/015-dataset-version-history/` | Planned — design in `docs/dataset-version-history.md` |

Roadmap pointer: `docs/generation-ux-roadmap.md` · Version history: `docs/dataset-version-history.md`

---

## 2. Superpowers (`docs/superpowers/`)

Earlier **agent-facing documentation layer** (plans + workflows) used before Spec Kit was fully adopted for newer epics.

| Path | Purpose |
| --- | --- |
| `docs/superpowers/README.md` | How agents should read plans/workflows |
| `docs/superpowers/workflows/` | Feature behavior notes (e.g. project history, dashboard session) |
| `docs/superpowers/plans/` | Task-by-task implementation guides |
| `docs/superpowers/specs/` | Formal design docs for specific slices |

**When to use:** Legacy/history features (project history, rollback, dashboard session). **New epics:** prefer Spec Kit under `specs/`.

---

## 3. Project agent rules

### `AGENTS.md` (repo root)

Primary **coding agent guide** for TestSeed:

- Package dependency rule (`types → db → core → api → web`)
- Hard rules (no business logic in apps, no connection strings persisted, etc.)
- Stack versions, `npx turbo build lint test` gate
- Managed **Spec Kit** section (`<!-- SPECKIT START -->` … `<!-- SPECKIT END -->`) — points to active `spec.md` + `plan.md`

### Cursor user rules (IDE, not in repo)

Team members may have global Cursor **user rules** (commit protocol, PR workflow, prose style). Those apply in chat but are not versioned here unless copied into `AGENTS.md` or this doc.

### Cursor project rules

No `.cursor/rules/` files in repo currently. Add rule files there if you want versioned, project-scoped agent instructions.

---

## 4. TestSeed custom skills (`.agents/skills/`)

Domain-specific skills agents should load for implementation work:

| Skill | Use when |
| --- | --- |
| `testseed-feature` | End-to-end feature across types, core, API, web |
| `testseed-core-module` | Business logic in `packages/core` |
| `testseed-api-route` | Express routes in `apps/api` |
| `testseed-ai-generation` | OpenAI prompts, validation, refinement, AI JSON |
| `testseed-tdd-change` | Test-first changes, README-runnable |
| `testseed-security-review` | Secrets, connection strings, auth, rollback safety |
| `testseed-readme-update` | Setup, env vars, ports, user-visible flows changed |

---

## 5. MCP servers (project config)

Defined in **`.mcp.json`** and **`.cursor/mcp.json`** (same content). Agents call these via Cursor MCP integration.

| Server ID | Package / URL | Purpose | Env / notes |
| --- | --- | --- | --- |
| `github` | `@modelcontextprotocol/server-github` | Issues, PRs, repo metadata | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `mongodb` | `mongodb-mcp-server` (read-only) | Queries, schema context against Atlas/local | `MDB_MCP_CONNECTION_STRING` ← `MONGODB_URI` |
| `context7` | `@upstash/context7-mcp` | Up-to-date library/framework docs | `CONTEXT7_API_KEY` |
| `chrome-devtools` | `chrome-devtools-mcp` | Browser debugging, performance, DOM | Local Chrome |
| `next-devtools` | `next-devtools-mcp` | Next.js dev server introspection | Dev server running |
| `shadcn` | `shadcn@latest mcp` | UI components registry (`apps/web` cwd) | Workbench / generate UI |
| `figma` | `https://mcp.figma.com/mcp` | Design ↔ code, FigJam diagrams | Figma auth in Cursor |
| `vercel` | `https://mcp.vercel.com` | Deployments, env, project linking | Vercel account |
| `v0` | `https://mcp.v0.dev` via `mcp-remote` | v0 component generation | `V0_API_KEY` |

**Security:** MCP MongoDB is **read-only**. Never commit tokens; use env vars or Cursor secret storage.

### Cursor marketplace plugins (IDE-level)

Cursor may also load **cached plugins** (Figma, Vercel, MongoDB skill packs) from the user’s Cursor install. These add skills under `~/.cursor/plugins/cache/…` (e.g. Next.js, shadcn, Turbopack, AI SDK). They are **not** duplicated in this repo—enable/disable in Cursor Settings → MCP / Plugins.

---

## 6. Cursor built-in agent capabilities

Used in chat but not stored as repo files:

| Capability | Purpose |
| --- | --- |
| **Task tool / subagents** | `explore`, `generalPurpose`, `shell`, `ci-investigator`, `deployment-expert`, etc. |
| **Agent transcripts** | Past chat logs under Cursor project folder (for handoff context) |
| **Browser / verification skills** | E2E checks when dev servers are running |
| **Global Cursor skills** | `create-skill`, `create-rule`, `canvas`, `loop`, `sdk`, … in user skills dir |

---

## 7. Recommended agent workflows

### New feature (current standard)

1. `/speckit-specify` → `specs/NNN-feature/spec.md`
2. `/speckit-clarify` (optional)
3. `/speckit-plan` → `plan.md`, contracts, `research.md`
4. `/speckit-tasks` → `tasks.md`
5. Implement with `testseed-*` skills; `npx turbo build lint test`
6. Update **this file** if tooling changed

### Bugfix / small change

- Load `testseed-tdd-change` + relevant domain skill (`testseed-api-route`, `testseed-core-module`, …)
- No Spec Kit unless the change needs a new epic spec

### Security-sensitive change

- `testseed-security-review` before merge (connection strings, seeding, rollback)

---

## 8. Environment variables for AI / MCP tooling

| Variable | Used by |
| --- | --- |
| `OPENAI_API_KEY` | TestSeed AI generation (app, not MCP) |
| `MONGODB_URI` | App DB + MongoDB MCP (read-only) |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub MCP |
| `CONTEXT7_API_KEY` | Context7 MCP |
| `V0_API_KEY` | v0 MCP |

See `.env.example` for app defaults; add MCP-only secrets locally as needed.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-08 | Initial doc: Spec Kit 007 active, MCP list, skills inventory, Superpowers note |
| 2026-06-08 | Documented 007 UX decisions: edited indicator + enum dropdown (in spec/plan) |
| 2026-06-08 | `/speckit-tasks` generated `specs/007-preview-editing/tasks.md` (54 tasks) |
| 2026-06-08 | `/speckit-implement` completed 007: inline editing, dataset-edits API, save/patch, validation UX |

### How to update

1. Edit sections above when adding/removing MCPs, skills, or features.
2. Update **Active Spec Kit feature** and `specs/` table when switching `feature.json`.
3. Append a line to **Changelog**.
4. Optionally add one sentence to `AGENTS.md` if the active feature pointer changes (Spec Kit block).
