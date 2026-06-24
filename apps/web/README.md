# TestSeed Web App

This package is the Next.js 14 frontend for TestSeed. It renders the authenticated workspace, project lifecycle screens, setup wizard, generation workbench, dataset version panel, export drawer, account pages, and GitHub OAuth callback UI.

## Getting Started

Run from the repository root so workspace packages and shared env values resolve correctly:

```sh
npm run setup:dev
npm run dev --workspace @testseed/web
```

Or run the full stack from the root:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The web app expects the API at `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:3001` in the root `.env.example`.

## Key Paths

| Path | Purpose |
| --- | --- |
| `app/` | App Router pages, layouts, and route-level UI |
| `components/generation/` | Setup wizard, workbench, tables, saved dataset versions, export drawer |
| `components/projects/` | Project detail/history/schema panels |
| `components/layout/` | Authenticated app shell |
| `components/ui/` | Local shadcn-style primitives |
| `src/lib/api-client.ts` | All browser API calls |
| `src/lib/generation-stream.ts` | Server-Sent Events helpers for generation/refinement |
| `src/store/` | Redux Toolkit store, including theme state |

## Architecture Rules

- `apps/web` may import `@testseed/types` only from workspace packages.
- Do not import `@testseed/core`, `@testseed/db`, database clients, or server-side business logic.
- All backend behavior goes through `src/lib/api-client.ts`.
- Follow [`../../docs/ui-design.md`](../../docs/ui-design.md) for layout, tokens, components, and page patterns.

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING=true
NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true
WEB_APP_URL=http://localhost:3000
```

## Commands

```sh
npm run dev --workspace @testseed/web
npm run build --workspace @testseed/web
npm run lint --workspace @testseed/web
npm run test --workspace @testseed/web
```

The production deployment is managed from the repository root through Vercel workflows documented in [`../../README.md`](../../README.md).
