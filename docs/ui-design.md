# TestSeed Web UI Design Context

## Direction

The web app uses a dark developer-tool aesthetic: precise, dense, and utilitarian, closer to Linear, Vercel, and Raycast than a consumer landing page.

Surfaces should feel layered, not boxed in. Use soft dividers (`border-border`), subtle fills (`bg-background/60`, `bg-accent/10`), and rounded cards. **Dense data views** (project lists, tables) use explicit `border border-border`, `divide-y divide-border`, and light `shadow-sm shadow-black/10` so sections and rows remain scannable on dark backgrounds.

## Tokens

All pages must use CSS variables from `apps/web/app/globals.css` and Tailwind aliases from `apps/web/tailwind.config.ts`. Themes are applied via the `dark` class on `<html>` (light mode uses `:root` defaults).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--background` | `#FAFAFA` | `#09090B` | App background |
| `--surface` | `#FFFFFF` | `#111113` | Panels, cards, sidebar |
| `--border` | `color-mix(…)` | `color-mix(…)` | Soft borders and dividers |
| `--foreground` | `#09090B` | `#FAFAFA` | Primary text |
| `--muted` | `#71717A` | `#71717A` | Secondary text |
| `--accent` | `#16A34A` | `#4ADE80` | Primary actions, success, focus |
| `--error` | `#DC2626` | `#EF4444` | Error states |
| `--info-*` / `--warning-*` / `--danger-*` | subtle, border, text | subtle, border, text | Alert tones and status badges |

Do not use raw Tailwind palette colors in feature UI. Use semantic classes: `bg-background`, `bg-surface`, `border-border`, `text-foreground`, `text-muted`, `bg-accent`, `text-warning-text`, `bg-warning-subtle`, etc.

## Theme (light / dark / system)

- **State:** Redux Toolkit slice `theme` in `apps/web/src/store/` (`mode`: `light` | `dark` | `system`, `resolved`: `light` | `dark`).
- **Persistence:** `localStorage` key `testseed:theme`.
- **FOUC prevention:** inline init script in `app/layout.tsx` applies class before paint.
- **Sync:** `ThemeSync` listens for system preference when mode is `system`.
- **Toggle:** `ThemeToggle` in app shell sidebar and auth pages (compact).
- Wrap app with `AppProviders` (Redux `StoreProvider` + `ThemeSync`).

## Typography

- Geist Sans is the default UI font, loaded through `next/font/local` from the bundled Geist files in `apps/web/app/fonts/`.
- Geist Mono is available as `font-mono`.
- Schema inputs, code previews, system labels, and section tags use Geist Mono (e.g. `settings.account`, `account.profile`).

## Layout

- App pages use `AppShell`: fixed `w-60` (240px) left sidebar plus main content.
- Auth pages use a centered card on a dark CSS grid background.
- Page content uses `p-6` with `space-y-6` between major blocks.
- **Page sections** use a mono tag, title, optional description, and `border-b border-border pb-3` before content (see Page composition below).
- Panels use soft borders, light shadows on cards, and tight spacing.
- Focus states use the accent border/glow defined as `shadow-focus`.
- Tab and section navigation uses tinted active states (`bg-accent/10 text-accent`), not heavy box borders around each tab.
- **Internal navigation** uses Next.js `Link` or `router.push` — never raw `<a href>` to app routes (avoids full reloads and dev chunk errors).

## App Shell

`apps/web/components/layout/app-shell.tsx` provides:

- **Sidebar nav:** Dashboard, New project, Projects (no History or Account in the nav).
- **User pane (footer):** Shows initials, email, and session expiry. The whole pane links to `/account`.
- **Session banner:** When the token is expired or inactive, a `SessionNotice` appears above main content with a sign-in action.
- **Session polling:** Re-checks stored session every 30s and listens for `testseed:session-expired`.

Account settings are reached from the user pane, not the primary nav.

## Session UX

- `auth-session.shared.ts` holds pure session helpers (safe for any import boundary).
- `auth-session.ts` is client-only: redirects, `requireStoredSession`, `notifySessionExpired`.
- API 401 responses clear the session and dispatch `testseed:session-expired`.
- Protected pages call `requireStoredSession` on mount; login page uses `Suspense` around `useSearchParams` for redirect reasons.

Do not import client auth modules from server components.

## Components

Local shadcn-style primitives live in `apps/web/components/ui/`.

| Component | Notes |
| --- | --- |
| `Button` | `primary` (borderless green fill), `secondary` (surface + border), `ghost`. Icons via lucide-react. |
| `Input` / `Textarea` | Dark surface, soft border, accent focus ring. |
| `Card` / `CardHeader` / `CardContent` | `rounded-lg`, `shadow-sm`, section headers with mono label + title. |
| `Label` | Small muted field labels. |
| `Alert` | Tones: `neutral`, `info`, `success`, `warning`, `danger`. Use instead of ad-hoc bordered message paragraphs. |
| `Skeleton` | Loading placeholders; prefer over spinners in bordered boxes. |
| `Stepper` | Wizard step indicator for multi-step flows. |

All API calls from UI components must go through `apps/web/src/lib/api-client.ts`.

## Page Composition

Reusable layout patterns (implemented inline on feature pages until extracted to `components/layout/`):

### Page section

Major blocks on a page (e.g. overview metrics vs browse list):

```text
section.space-y-4
  header.border-b.border-border.pb-3
    p.font-mono.text-xs.text-accent     → e.g. projects.overview
    h2.text-lg.font-semibold            → section title
    p.text-sm.text-muted                → optional description
  {children}
```

### Filter group

Toolbar controls grouped with visible labels (Search, Status, Schema, Sort, View):

- Container: `rounded-lg border border-border bg-surface px-3 py-3 shadow-sm shadow-black/5`
- Label: `text-[11px] font-semibold uppercase tracking-wide text-muted`
- Controls: `flex flex-wrap gap-1` with `FilterButton` / `ViewModeButton` (accent tint when active)

### List container

For list and compact view modes:

- Outer: `overflow-hidden rounded-lg border border-border bg-surface shadow-sm shadow-black/10`
- Header row (list mode): `border-b border-border bg-background/60` with uppercase column labels
- Items: `divide-y divide-border`; each row `bg-surface` with `hover:bg-background/60`
- Empty state: `border border-dashed border-border bg-surface/50`

### Clickable row / card

- Whole item is clickable (`role="button"`, Enter/Space) → navigates to detail route.
- Action buttons sit in a child with `onClick={stopPropagation}` so Open / Generate / Archive do not trigger row navigation.
- Cards: `border border-border bg-surface`; hover `hover:border-accent/30`.

### View preference persistence

Multi-view pages may store layout mode in `localStorage` (e.g. `testseed:projects-view` → `cards` | `list` | `compact`).

## Dashboard

`apps/web/app/dashboard/page.tsx`:

- Matches projects list spacing (`p-6`, soft dividers).
- Metric and summary cards use subtle fills, not nested harsh white borders.
- Primary actions use borderless accent buttons.

## Projects List

`apps/web/app/projects/page.tsx` — reference implementation for sections, filters, and multi-view lists.

### Page structure

1. **Page header** — mono tag `projects.workspace`, title, description, **New project** CTA; `border-b border-border pb-6`.
2. **Section: Workspace summary** (`projects.overview`) — four metric cards in a grid (`sm:grid-cols-2`, `xl:grid-cols-4`).
3. **Section: Project list** (`projects.list`) — dynamic title (All / Active / Archived) + result count; contains the browse card.

### Metrics

| Tile | Meaning |
| --- | --- |
| Active | Non-archived projects |
| Ready to generate | Active projects with `activeSchemaVersion > 0` |
| Needs schema | Active projects without a saved schema |
| Archived | Archived projects |

Metric cards: `Card` with `border-border bg-surface shadow-sm shadow-black/10`.

### Filters and toolbar

Inside the browse `Card`, header uses `border-b border-border bg-background/30`; content uses `bg-background/20`.

| Filter group | Options |
| --- | --- |
| **Search** | Full-width input with search icon |
| **Status** | All · Active · Archived (with counts) |
| **Schema** | All · Ready · Needs schema (hidden meaning on Archived-only filter: shows helper text) |
| **Sort by** | Recent · Name · Created |
| **View** | Cards · List · Compact |

Filter groups use the **Filter group** pattern above. View mode persists to `localStorage` key `testseed:projects-view`.

### View modes and separators

| Mode | Layout | Separators |
| --- | --- | --- |
| **Cards** | `grid gap-4`, `sm:grid-cols-2`, `xl:grid-cols-3` | Each card: `border border-border bg-surface shadow-sm`; internal action bar `border-t border-border` |
| **List** | Bordered table-like container | Column header `border-b`; rows `divide-y divide-border` |
| **Compact** | Single bordered container | Rows `divide-y divide-border` |

### Project items

- **Clickable:** card body or row opens `/projects/[id]` via `router.push`; keyboard accessible.
- **Status badges:** `Ready` (accent), `Needs schema` (amber), `Archived` (muted).
- **Actions:** Open · Generate or Add schema · Archive (active) or Restore · Delete (archived); compact mode uses icon-only destructive/archive where space is tight.
- **Empty states:** dashed border panel; search miss shows **Clear search**; no projects shows **Create your first project**.

Feedback: `Alert` for errors and success (archive/restore/delete). Loading: `Skeleton` matched to active view mode.

## Generate Flow

**Active UI:** Setup wizard + Generation Workbench in `apps/web/app/generate/page.tsx`. See `docs/generation-ux-roadmap.md`.

### Setup wizard (new projects)

Stepper flow on `/generate` until the user opens the workbench:

1. **Project** — name and description  
2. **GitHub** — optional repository context  
3. **Schema** — paste, upload, or MongoDB discovery  
4. **Review** — field review, save schema snapshot, **Open generation workbench**

`?mode=edit` returns to the wizard for an existing project. GitHub OAuth callback lands on the GitHub step.

### Generation Workbench (006 — shipped)

Three-pane layout after setup (`?projectId=…&mode=generate`):

| Pane | Contents |
| --- | --- |
| **Left — Setup rail** | Edit setup link, context sources, **collection counts**, generation plan, **dataset versions** |
| **Center — Data canvas** | Collection tabs, table preview, validation badges, generation progress |
| **Right — Agent dock** | Streamed refinement chat (You / TestSeed bubbles), quick prompts |

**Sticky action bar:** Setup wizard · Generate · Finish. Export when `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true`.

**Behavior:**

- Collection counts are editable in the left rail; the generation plan refreshes when counts change.
- Context sources panel shows project description and GitHub summary before Generate.
- **Dataset versions** (left rail): immutable snapshots per project with `versionLabel`, `parentDatasetId` lineage, record counts, and chat message count. Click a row to load preview + agent dock transcript. **Re-seed** applies that version to MongoDB after `AlertDialog` confirmation (requires tested connection from Export drawer).
- Before each refine or feedback regeneration, the API saves a **Before refine** snapshot when an active version exists.
- Refinement that changes data creates a new version (`Refined: …`); guidance-only refinements update chat on the active version without a new data snapshot.
- Manual saves and accept-candidate flows **fork** new versions (`Manual edits`, `Accepted refinement`) — they never overwrite in place.
- Refinement streaming is on by default (`NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING` — set to `false` to disable).
- Finish navigates to `/projects/[projectId]`.
- **Editable cells** shipped in epic 007 (`collection-data-table.tsx`, dataset save bar).
- Export drawer: JSON/JS export, connection test, direct seed of active dataset, seed batch history. Connection string stored per project in browser `localStorage` after successful test (for version re-seed).

See `docs/dataset-version-history.md`.

## Project Details

`apps/web/app/projects/[projectId]/page.tsx`:

- **Tabs:** Overview, Schema, History, Project settings (formerly Management).
- Tab buttons: no box borders; active tab uses accent tint.
- **Overview:** stats row → continue actions → context/schema cards → recent activity.
- **Overview schema snapshot:** collections shown as clickable cards (icon, field count, required/ref badges); opens Schema tab on the selected collection.
- **Schema:** master-detail — collections list left, single fields table right; archive/restore/delete on schema tab.
- **Project settings:** rename, archive, delete, and related management actions.

## Account Settings

`apps/web/app/account/page.tsx`:

- Header with mono tag `settings.account` and short description.
- **Summary card:** avatar initials, display name, email, member since, verification badges.
- **Warning alert** when `pendingEmail` exists, pointing user to Profile.
- **Section nav (left on desktop, horizontal scroll on mobile):** Profile | Security | Danger zone.
- **Profile:** `AccountProfileForm` + `EmailVerificationPanel` in separate cards.
- **Security:** `PasswordChangeForm`.
- **Danger zone:** `DeleteAccountPanel` in a card with `border-error/30`.
- Forms use `Alert` for success/error; loading uses `Skeleton`.

Account form components live in `apps/web/components/account/` and must not duplicate outer borders when wrapped by page-level `Card`.

## Project Context Controls

- Project context controls belong in existing workflow panels, not a standalone landing-style page.
- Description editing uses the existing `Textarea` and compact action buttons.
- Repository context uses an `owner/repo` input, a clear authorize action, status text, warnings, and a remove action when repository context is connected.
- Context review should show description-only, repository-enhanced, or generic-fallback status without blocking schema input.

## Patterns to Avoid

- Nested `border border-border` stacks on **the same visual level** that read as bright white outlines — prefer one outer container + `divide-y` for siblings.
- Primary buttons with visible borders (use `border-transparent` on accent fills).
- Spinners inside heavy bordered loading boxes when `Skeleton` fits the layout.
- Ad-hoc `<p className="border ...">` message blocks — use `Alert`.
- Raw `<a href="/...">` for in-app navigation — use `Link` or `router.push`.
- Putting Account in the main sidebar nav (use the user pane instead).
- Action buttons inside clickable rows without `stopPropagation` (causes accidental navigation).
