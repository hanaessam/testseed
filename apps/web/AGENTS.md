# `@testseed/web` Agent Guide

Purpose: UI layer, Next.js only.

Rules:

- The only allowed `@testseed/*` import is `@testseed/types`.
- All API calls go through `src/lib/api-client.ts`.
- Components render state and collect user input.
- Server actions may coordinate UI flow, but must not contain business logic.

Forbidden:

- `@testseed/core` imports
- `@testseed/db` imports
- Database clients
- Business logic in components
- Business logic in server actions

If UI needs behavior, call the API. If API needs behavior, call core.

## UI Conventions

Read [`docs/ui-design.md`](../../docs/ui-design.md) before changing layouts or styling.

- Use semantic tokens (`bg-surface`, `border-border`, `text-muted`, `bg-accent`) — not raw Tailwind palette colors.
- **Page sections:** mono label + title + `border-b border-border` before major blocks (metrics, browse lists, settings).
- **Filter groups:** labeled bordered panels (`rounded-lg border border-border bg-surface`) for toolbar controls.
- **Lists:** outer `border` + `divide-y` for rows; cards get individual `border border-border bg-surface shadow-sm`.
- **Cards:** wrap subsections in `Card` / `CardHeader` / `CardContent`; avoid double borders on nested forms.
- **Feedback:** use `Alert` for success, warning, and error messages; use `Skeleton` for loading states.
- **Buttons:** primary actions use `Button` variant `primary` (borderless green); destructive actions use `secondary` with `text-error`.
- **Navigation:** section tabs use accent tint when active (`bg-accent/10 text-accent`); in-app routes use `Link` or `router.push`, not `<a href>`.
- **Clickable rows:** row/card opens detail; action buttons must `stopPropagation`.
- **App shell:** do not add Account to sidebar nav; account is linked from the user pane in `app-shell.tsx`.

## Theme

- Redux Toolkit store: `apps/web/src/store/` — use `useAppSelector` / `useAppDispatch` from `src/store/hooks.ts`.
- Do not read `localStorage` for theme outside `src/store/theme/`; dispatch `setThemeMode` instead.
- New UI colors must use CSS variables in `globals.css` (light `:root` + dark `.dark`), not hardcoded `bg-amber-500` etc.
- `AppProviders` wraps the tree in `app/layout.tsx`; pages do not need their own provider.

## Auth and Session

- `src/lib/auth-session.shared.ts` — pure helpers, no `"use client"`; safe to import anywhere.
- `src/lib/auth-session.ts` — client-only redirects and `requireStoredSession`; do not import from server components.
- Login page must stay `"use client"` with `useSearchParams` inside `Suspense` (logout redirect compatibility).
- On API 401, `api-client.ts` clears session and fires `testseed:session-expired`; pages should use `requireStoredSession` on mount.

## Page Layout Patterns

| Page | Pattern |
| --- | --- |
| Dashboard | `p-6`, header divider, metric cards, recent projects list |
| Projects | `PageSection` ×2 (overview + list); `FilterGroup` toolbar; Cards/List/Compact views; `testseed:projects-view` in `localStorage` |
| Generate (workbench) | Three-pane layout — `docs/ui-design.md` § Generate Flow; **dataset versions** panel + re-seed — `docs/dataset-version-history.md` |
| Project details | Horizontal tabs; schema tab is master-detail |
| Account | Summary card + left section nav (Profile / Security / Danger zone) |
