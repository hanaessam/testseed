# TestSeed Web UI Design Context

## Direction

The web app uses a dark developer-tool aesthetic: precise, dense, and utilitarian, closer to Linear, Vercel, and Raycast than a consumer landing page.

## Tokens

All pages must use CSS variables from `apps/web/app/globals.css` and Tailwind aliases from `apps/web/tailwind.config.ts`.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#09090B` | App background |
| `--surface` | `#111113` | Panels, cards, sidebar |
| `--border` | `#27272A` | 1px borders and dividers |
| `--foreground` | `#FAFAFA` | Primary text |
| `--muted` | `#71717A` | Secondary text |
| `--accent` | `#4ADE80` | Primary actions, success, focus |
| `--error` | `#EF4444` | Error states |

Do not use Tailwind default colors directly in feature UI. Use semantic classes such as `bg-background`, `bg-surface`, `border-border`, `text-foreground`, `text-muted`, `bg-accent`, `text-error`, and `text-success`.

## Typography

- Geist Sans is the default UI font, loaded through `next/font/local` from the bundled Geist files in `apps/web/app/fonts/`.
- Geist Mono is available as `font-mono`.
- Schema inputs, code previews, and system labels use Geist Mono.

## Layout

- App pages use `AppShell`: fixed 240px left sidebar plus main content.
- Auth pages use a centered card on a dark CSS grid background.
- Panels use 1px borders, no heavy shadows, and tight spacing.
- Focus states use the accent border/glow defined as `shadow-focus`.

## Components

Local shadcn-style primitives live in `apps/web/components/ui/`.

- `Button`: `primary`, `secondary`, and `ghost` variants.
- `Input`: dark surface, accent focus.
- `Textarea`: terminal-like mono input.
- `Card`: bordered surface panels.
- `Label`: small muted field labels.

All API calls from UI components must go through `apps/web/src/lib/api-client.ts`.
