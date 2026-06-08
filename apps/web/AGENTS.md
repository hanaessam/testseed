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
- **Cards:** wrap page sections in `Card` / `CardHeader` / `CardContent`; avoid double borders on nested forms.
- **Feedback:** use `Alert` for success, warning, and error messages; use `Skeleton` for loading states.
- **Buttons:** primary actions use `Button` variant `primary` (borderless green); destructive actions use `secondary` with `text-error`.
- **Navigation:** section tabs use accent tint when active (`bg-accent/10 text-accent`), not boxed tab borders.
- **App shell:** do not add Account to sidebar nav; account is linked from the user pane in `app-shell.tsx`.

## Auth and Session

- `src/lib/auth-session.shared.ts` — pure helpers, no `"use client"`; safe to import anywhere.
- `src/lib/auth-session.ts` — client-only redirects and `requireStoredSession`; do not import from server components.
- Login page must stay `"use client"` with `useSearchParams` inside `Suspense` (logout redirect compatibility).
- On API 401, `api-client.ts` clears session and fires `testseed:session-expired`; pages should use `requireStoredSession` on mount.

## Page Layout Patterns

| Page | Pattern |
| --- | --- |
| Dashboard / Projects list | `p-6`, header divider, metric cards, project cards with search/filter/sort |
| Generate (current) | Wizard `Stepper`, one step per card, Skip on optional steps |
| Generate (planned) | Three-pane workbench — see `specs/006-generation-workbench/` |
| Project details | Horizontal tabs; schema tab is master-detail |
| Account | Summary card + left section nav (Profile / Security / Danger zone) |
