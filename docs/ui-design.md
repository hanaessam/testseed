# TestSeed Web UI Design Context

## Direction

The web app uses a dark developer-tool aesthetic: precise, dense, and utilitarian, closer to Linear, Vercel, and Raycast than a consumer landing page.

Surfaces should feel layered, not boxed in. Prefer soft dividers (`border-border`), subtle fills (`bg-background/60`, `bg-accent/10`), and rounded cards over harsh nested outlines.

## Tokens

All pages must use CSS variables from `apps/web/app/globals.css` and Tailwind aliases from `apps/web/tailwind.config.ts`.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#09090B` | App background |
| `--surface` | `#111113` | Panels, cards, sidebar |
| `--border` | `color-mix(in srgb, var(--foreground) 7%, var(--surface))` | Soft 1px borders and dividers |
| `--foreground` | `#FAFAFA` | Primary text |
| `--muted` | `#71717A` | Secondary text |
| `--accent` | `#4ADE80` | Primary actions, success, focus |
| `--error` | `#EF4444` | Error states |

Do not use Tailwind default colors directly in feature UI. Use semantic classes such as `bg-background`, `bg-surface`, `border-border`, `text-foreground`, `text-muted`, `bg-accent`, `text-error`, and `text-success`.

## Typography

- Geist Sans is the default UI font, loaded through `next/font/local` from the bundled Geist files in `apps/web/app/fonts/`.
- Geist Mono is available as `font-mono`.
- Schema inputs, code previews, system labels, and section tags use Geist Mono (e.g. `settings.account`, `account.profile`).

## Layout

- App pages use `AppShell`: fixed `w-60` (240px) left sidebar plus main content.
- Auth pages use a centered card on a dark CSS grid background.
- Page content uses `p-6` with section headers separated by `border-b border-border pb-6`.
- Panels use soft borders, light shadows on cards, and tight spacing.
- Focus states use the accent border/glow defined as `shadow-focus`.
- Tab and section navigation uses tinted active states (`bg-accent/10 text-accent`), not heavy box borders around each tab.

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

## Dashboard

`apps/web/app/dashboard/page.tsx`:

- Matches projects list spacing (`p-6`, soft dividers).
- Metric and summary cards use subtle fills, not nested harsh white borders.
- Primary actions use borderless accent buttons.

## Projects List

`apps/web/app/projects/page.tsx`:

- Header with mono tag, description, and **New project** primary action.
- **Summary metrics:** Active, Ready to generate (schema saved), Archived.
- **Toolbar:** search by name/description; Active / Archived filter tabs; Recent / Name sort.
- **Project cards** in a responsive grid (`md:grid-cols-2`), soft `bg-background/50` fills (no nested harsh borders).
- Each card shows status badge (`Ready`, `Needs schema`, `Archived`), relative updated time, and description.
- **Actions:** Open (primary), smart continue (**Generate** if schema exists, **Add schema** otherwise), Archive as ghost (active) or Restore + Delete (archived).
- Empty states: illustrated CTA for no projects; clear-search action when filters match nothing.
- Loading uses `Skeleton`; feedback uses `Alert` (success after archive/restore/delete).

## Generate Flow

**Active UI (today):** linear wizard in `apps/web/app/generate/page.tsx`.

**Planned UI:** Generation Workbench (`specs/006-generation-workbench/`) — documented, not implemented. See `docs/generation-ux-roadmap.md`.

### Current: Generate Wizard

Step-based wizard (one primary card per step):

1. **Project** — name and description.
2. **GitHub** — optional repository context; after OAuth, user stays on this step and continues manually (no auto-advance to schema).
3. **Schema choose** — paste, upload, or MongoDB.
4. **Schema input** — branch step (paste / upload / mongodb).
5. **Review** — save schema at bottom; **Next** enabled after save.
6. **Generate** — AI seed generation; raw JSON preview in `<pre>`.
7. **Refine** — optional AI chat refinement (separate step).

Optional steps expose **Skip**. Repository warnings shown in UI are filtered to meaningful messages only (generic AI placeholders hidden).

Finish actions use `router.push` (not `<a href>`) to navigate to `/projects/[projectId]`.

### Planned: Generation Workbench (006)

Three-pane layout on the same `/generate` route:

| Pane | Contents |
| --- | --- |
| **Left — Setup rail** | Collapsible: project context, GitHub, schema input, generation plan, per-collection counts |
| **Center — Data canvas** | Collection tabs, table preview, validation badges, generation progress (later) |
| **Right — Agent dock** | Chat refinement, quick prompts, message history |

**Sticky action bar:** Generate · Regenerate · Export (phase 2) · Finish.

**Behavior changes vs wizard:**

- No separate refine wizard step; chat lives in the agent dock after first valid dataset.
- Generation plan visible before run (collection order, references, warnings).
- Table preview replaces JSON-only inspection (JSON remains as secondary/export view).
- Returning users with saved schema land directly in the workbench (`?projectId=&mode=generate`).

Do not remove wizard code until workbench Phase 1 passes the manual test plan in `specs/006-generation-workbench/plan.md`.

## Project Details

`apps/web/app/projects/[projectId]/page.tsx`:

- **Tabs:** Overview, Schema, History, Project settings (formerly Management).
- Tab buttons: no box borders; active tab uses accent tint.
- **Overview:** stats row → continue actions → context/schema cards → recent activity.
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

- Nested `border border-border` stacks that read as bright white outlines on dark backgrounds.
- Primary buttons with visible borders (use `border-transparent` on accent fills).
- Spinners inside heavy bordered loading boxes when `Skeleton` fits the layout.
- Ad-hoc `<p className="border ...">` message blocks — use `Alert`.
- Putting Account in the main sidebar nav (use the user pane instead).
