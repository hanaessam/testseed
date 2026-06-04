# Implementation Plan: Account Management

**Branch**: `002-account-management` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-account-management/spec.md`

## Summary

Implement account management as a self-service workflow for authenticated TestSeed users and as a recovery path for users who cannot sign in. The feature adds profile editing with pending email verification, password change with current-password proof, forgot password with a one-time email code, and account deletion with current-password plus fixed-phrase confirmation. Account deletion deactivates protected access immediately and schedules account-owned data for permanent deletion after 30 days.

The implementation follows TestSeed's existing clean architecture: shared account contracts in `@testseed/types`, user persistence and reset/verification records in `@testseed/db`, framework-free account use cases in `@testseed/core`, Zod-validated Express routes in `apps/api`, and API-driven Next.js UI components in `apps/web`.

## Technical Context

**Language/Version**: TypeScript strict on Node.js 20+

**Primary Dependencies**: Turborepo 2, Express 4, Zod 3, Mongoose 8, Next.js 14, React 18, bcrypt, jsonwebtoken, existing registration OTP/email delivery pattern

**Storage**: TestSeed application MongoDB via `packages/db` Mongoose models and repositories; no plaintext passwords, reset codes, email verification codes, JWTs, database connection strings, or user MongoDB credentials stored

**Testing**: Jest for `packages/core`; TypeScript build checks for `packages/types`, `packages/db`, `apps/api`; API contract tests under `apps/api/src/routes/__tests__`; Next lint/build for `apps/web`; repo handoff check `npx turbo build lint test`

**Target Platform**: Web app with Express API and Next.js frontend

**Project Type**: Turborepo web application with shared packages and API/UI apps

**Performance Goals**: Users can update valid profile fields or change password in under 2 minutes; forgot password request and reset completion provide clear feedback in one form submission each; account deletion revokes protected access immediately after confirmation

**Constraints**: No business logic in `apps/`; `apps/web` imports only `@testseed/types`; API calls core use cases after Zod validation; core receives repositories, email sender, clock, and code generator as injected dependencies; user account actions affect only the authenticated user; account deletion schedules permanent data deletion after 30 days

**Scale/Scope**: One authenticated user updates their own account at a time; forgot password and email verification use one-time code records with expiration and attempt limits; no team workspaces, role-based account management, or organization-level account deletion in this feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The checked-in constitution is still the default placeholder and does not define enforceable project principles. TestSeed's binding gates come from `AGENTS.md`, package `AGENTS.md` files, and the clarified feature specification.

Pre-design gates:

- **Dependency direction**: PASS. Plan keeps `types -> db/core -> api -> web`; web remains API-only.
- **Business logic location**: PASS. Profile update, password validation, reset-code verification, email-change state, and deletion lifecycle decisions belong in core use cases, not route handlers or UI components.
- **Secret handling**: PASS. Passwords and one-time codes are transient inputs; only hashes and lifecycle metadata are stored.
- **DB singleton rule**: PASS. Persistence goes through existing connection factory and repositories.
- **Validation boundary**: PASS. API request bodies are validated with Zod before handlers call core.
- **Core framework isolation**: PASS. Core receives injected repositories/email sender and does not import Express, Next.js, or Mongoose.

Post-design gates:

- **Dependency direction**: PASS. Contracts and artifacts preserve the same layer boundaries.
- **Business logic location**: PASS. Planned use cases own account scoping, credential checks, verification-code state, and deletion scheduling.
- **Secret handling**: PASS. Data model stores hashed passwords and hashed one-time codes only; account-management responses exclude sensitive values.
- **DB singleton rule**: PASS. DB work is limited to user model/repository additions and feature-owned verification/deletion records under `packages/db`.
- **Validation boundary**: PASS. API contracts include request validation requirements for profile, email verification, password change, forgot password, reset completion, and deletion.
- **Core framework isolation**: PASS. Account use cases stay framework-free and adapter dependencies are passed in.

## Project Structure

### Documentation (this feature)

```text
specs/002-account-management/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- account-management-api.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md              # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
packages/types/src/
|-- auth.ts               # Account profile, email verification, password reset/change/delete DTOs
`-- api.ts                # Re-export updated auth contracts if needed

packages/db/src/
|-- models/user.ts        # Add displayName, active/pending email, status, deletion schedule fields
|-- models/password-reset.ts
|-- models/email-change.ts
`-- repositories/user-repository.ts
    # Profile, password hash, email-change, reset-code, deactivate/delete repository methods

packages/core/src/auth/
|-- index.ts              # Export account-management use cases with existing auth use cases
`-- __tests__/
    |-- account-profile.test.ts
    |-- change-password.test.ts
    |-- forgot-password.test.ts
    |-- email-change.test.ts
    `-- delete-account.test.ts

apps/api/src/
|-- email/
|   |-- password-reset-email.ts
|   `-- email-change-verification-email.ts
`-- routes/
    |-- auth.ts           # Forgot password, reset completion, /me, account settings routes
    `-- __tests__/
        `-- account-management.contracts.test.ts

apps/web/src/lib/
`-- api-client.ts         # Account-management API client methods

apps/web/app/
|-- account/page.tsx      # Authenticated account settings page
|-- forgot-password/page.tsx
`-- reset-password/page.tsx

apps/web/components/
`-- account/
    |-- account-profile-form.tsx
    |-- email-verification-panel.tsx
    |-- password-change-form.tsx
    |-- forgot-password-form.tsx
    |-- reset-password-form.tsx
    `-- delete-account-panel.tsx
```

**Structure Decision**: Implement as an end-to-end TestSeed feature in the existing monorepo layers. Keep account-management behavior in `packages/core/src/auth`, keep persistence shape and repository operations in `packages/db`, keep HTTP validation/response shaping in `apps/api`, and keep UI state/API calls in `apps/web`.

## Complexity Tracking

No constitution or project-rule violations are planned.
