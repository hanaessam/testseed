# TestSeed Figma Design System

Production design reference for TestSeed web UI — tokens, components, pages, and user flows.

## Figma File

**[TestSeed Design System](https://www.figma.com/design/m6yMxvltXRTpuPxnOc4zRJ/TestSeed-Design-System)**

| Property | Value |
| --- | --- |
| File key | `m6yMxvltXRTpuPxnOc4zRJ` |
| Team | testseed |
| Created | June 2026 |
| Run ID | `testseed-ds-2026-001` |

## Structure

### Foundations

| Page | Contents |
| --- | --- |
| Cover | Brand intro, version, theme note |
| Getting Started | Purpose, aesthetic, fonts, themes, navigation, key flows |
| Foundations / Colors | Light + dark swatches for all semantic tokens |
| Foundations / Typography | Type ramp specimens (Inter + Roboto Mono stand-ins for Geist) |
| Foundations / Spacing | Spacing scale (4–240px) |

### Variable Collections

| Collection | Modes | Tokens |
| --- | --- | --- |
| Primitives | Value | Raw zinc, green, red, indigo, amber palette |
| Color | Light, Dark | `--background`, `--surface`, `--foreground`, `--muted`, `--accent`, status tones |
| Spacing | Value | `spacing/1` through `spacing/60` (sidebar = 240px) |
| Radius | Value | `radius/sm` (4), `md` (6), `lg` (8), `full` |

All semantic color variables include WEB code syntax (`var(--token-name)`).

### Components

| Page | Component | Variants |
| --- | --- | --- |
| Components / Button | Button | Primary, Secondary, Ghost |
| Components / Input | Input / Default | — |
| Components / Card | Card / Default | Header + Content |
| Components / Alert | Alert | Info, Success, Warning, Danger |
| Components / Stepper | *(planned)* | Wizard steps |

### Pages & Flows

| Page | Screen | Description |
| --- | --- | --- |
| Pages / Auth | Login / Dark | Centered auth card, email/password, GitHub OAuth |
| Pages / Dashboard | Dashboard / Light | App shell, metrics grid |
| Pages / Projects | Projects / Light | Workspace header, project cards |
| Pages / Generate | Workbench / Dark | Three-pane workbench (setup rail, data canvas, agent dock) |
| Pages / Account | *(planned)* | Profile, Security, Danger zone |

## Code Alignment

This file mirrors:

- `apps/web/app/globals.css` — CSS variables (light `:root` + dark `.dark`)
- `apps/web/tailwind.config.ts` — semantic Tailwind aliases
- `docs/ui-design.md` — layout patterns, component notes, page composition

**Fonts:** Geist Sans + Geist Mono in code and in Figma text styles. Screen captures inherit Geist from the running app.

## Re-capturing screens (pixel-perfect)

Authenticated pages must be captured **while logged in**. From repo root:

```sh
# Option A: API login (recommended)
TESTSEED_CAPTURE_EMAIL=you@example.com TESTSEED_CAPTURE_PASSWORD=secret node scripts/figma-capture-authenticated.mjs

# Option B: reuse a JWT from your browser session
TESTSEED_CAPTURE_TOKEN=eyJ... node scripts/figma-capture-authenticated.mjs
```

Or open `http://localhost:3000/<route>#figmacapture=<id>&figmaendpoint=...` in a **logged-in** browser tab (see Figma MCP `generate_figma_design` output for capture IDs).

## Key User Flow

```text
Auth (Login) → Dashboard → Projects → Project Detail → Generate Wizard → Workbench → Finish
```

## Continuing the Build

To extend this design system in a new session:

> Load the figma-generate-library skill and resume Run ID `testseed-ds-2026-001` on file `m6yMxvltXRTpuPxnOc4zRJ`.

Suggested next additions: Stepper component, Account page, dark-mode page variants, variable bindings on components, Code Connect mappings.
