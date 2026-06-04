# Tasks: Account Management

**Input**: Design documents from `specs/002-account-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included because account management changes authentication/security behavior and `packages/core/AGENTS.md` requires tests for exported core use cases.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared account-management surfaces and make existing auth contracts ready for extension.

- [X] T001 Update account-management DTOs and account status/profile types in packages/types/src/auth.ts
- [X] T002 [P] Update exported type surface for auth contracts in packages/types/src/api.ts
- [X] T003 [P] Add password reset email helper scaffold in apps/api/src/email/password-reset-email.ts
- [X] T004 [P] Add email change verification helper scaffold in apps/api/src/email/email-change-verification-email.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared persistence and core helpers that must exist before any user story can be completed.

**Critical**: No user story work can finish until this phase is complete.

- [X] T005 Extend the user persistence model with displayName, pendingEmail, status, deactivatedAt, scheduledDeletionAt, and updatedAt fields in packages/db/src/models/user.ts
- [X] T006 [P] Add password reset persistence model with hashed one-time code fields in packages/db/src/models/password-reset.ts
- [X] T007 [P] Add email change persistence model with hashed one-time code fields in packages/db/src/models/email-change.ts
- [X] T008 Add user repository methods for profile update, password hash update, pending email, account status, password reset records, and email verification records in packages/db/src/repositories/user-repository.ts
- [X] T009 Update auth user mapping to exclude inactive accounts from protected access in packages/core/src/auth/index.ts
- [X] T010 Add shared account-management error codes and response mapping support in packages/core/src/auth/index.ts
- [X] T011 Update auth route configuration to accept password reset and email change email senders in apps/api/src/routes/auth.ts
- [X] T012 Update API bootstrap wiring for new auth email dependencies in apps/api/src/index.ts
- [X] T013 Update web API client shared auth response mapping for new profile fields in apps/web/src/lib/api-client.ts

**Checkpoint**: Foundation ready; user story implementation can now begin.

---

## Phase 3: User Story 1 - Edit Account Information (Priority: P1) MVP

**Goal**: Authenticated users can view and edit account profile information, request an email change, and keep the current email active until the pending email is verified.

**Independent Test**: Sign in, open account settings, update display name, request email change, verify pending email state, complete email verification, and confirm the new email becomes active.

### Tests for User Story 1

- [X] T014 [P] [US1] Add core tests for profile update and pending email behavior in packages/core/src/auth/__tests__/account-profile.test.ts
- [X] T015 [P] [US1] Add core tests for email change code verification in packages/core/src/auth/__tests__/email-change.test.ts
- [X] T016 [P] [US1] Add API contract tests for PATCH /auth/me and POST /auth/me/email/verify in apps/api/src/routes/__tests__/account-management.contracts.test.ts

### Implementation for User Story 1

- [X] T017 [US1] Implement get account profile and profile update use cases in packages/core/src/auth/index.ts
- [X] T018 [US1] Implement pending email change request and verification use cases in packages/core/src/auth/index.ts
- [X] T019 [US1] Add Zod schemas and handlers for PATCH /auth/me and POST /auth/me/email/verify in apps/api/src/routes/auth.ts
- [X] T020 [US1] Add updateProfile and verifyEmailChange API client methods in apps/web/src/lib/api-client.ts
- [X] T021 [P] [US1] Create account profile form component in apps/web/components/account/account-profile-form.tsx
- [X] T022 [P] [US1] Create email verification panel component in apps/web/components/account/email-verification-panel.tsx
- [X] T023 [US1] Create authenticated account settings page shell with profile section in apps/web/app/account/page.tsx
- [X] T024 [US1] Add account settings navigation link in apps/web/components/layout/app-shell.tsx

**Checkpoint**: User Story 1 is independently functional and demoable.

---

## Phase 4: User Story 2 - Change Account Password (Priority: P2)

**Goal**: Authenticated users can change their password by providing the current password and matching valid new password entries.

**Independent Test**: Sign in, change password, sign out, confirm the old password fails and the new password succeeds.

### Tests for User Story 2

- [X] T025 [P] [US2] Add core tests for password change success, wrong current password, weak password, mismatch, and same-password rejection in packages/core/src/auth/__tests__/change-password.test.ts
- [X] T026 [P] [US2] Add API contract tests for POST /auth/me/password in apps/api/src/routes/__tests__/account-management.contracts.test.ts

### Implementation for User Story 2

- [X] T027 [US2] Implement authenticated password change use case in packages/core/src/auth/index.ts
- [X] T028 [US2] Add Zod schema and handler for POST /auth/me/password in apps/api/src/routes/auth.ts
- [X] T029 [US2] Add changePassword API client method in apps/web/src/lib/api-client.ts
- [X] T030 [US2] Create password change form component in apps/web/components/account/password-change-form.tsx
- [X] T031 [US2] Integrate password change section into account settings page in apps/web/app/account/page.tsx

**Checkpoint**: User Stories 1 and 2 work independently.

---

## Phase 5: User Story 3 - Recover Forgotten Password (Priority: P3)

**Goal**: Users who cannot sign in can request a one-time reset code by email and set a new password without exposing account existence.

**Independent Test**: From login, request forgot password, complete reset with the one-time code, and confirm the old password fails while the reset password succeeds.

### Tests for User Story 3

- [X] T032 [P] [US3] Add core tests for forgot password request response privacy and reset code generation in packages/core/src/auth/__tests__/forgot-password.test.ts
- [X] T033 [P] [US3] Add core tests for reset completion with expired, invalid, used, weak, and mismatched code/password data in packages/core/src/auth/__tests__/forgot-password.test.ts
- [X] T034 [P] [US3] Add API contract tests for POST /auth/password/forgot and POST /auth/password/reset in apps/api/src/routes/__tests__/account-management.contracts.test.ts

### Implementation for User Story 3

- [X] T035 [US3] Implement forgot password request use case with one-time code hashing in packages/core/src/auth/index.ts
- [X] T036 [US3] Implement password reset completion use case with attempt limits and consumed-code handling in packages/core/src/auth/index.ts
- [X] T037 [US3] Add Zod schemas and handlers for POST /auth/password/forgot and POST /auth/password/reset in apps/api/src/routes/auth.ts
- [X] T038 [US3] Implement password reset email message creation in apps/api/src/email/password-reset-email.ts
- [X] T039 [US3] Add forgotPassword and resetPassword API client methods in apps/web/src/lib/api-client.ts
- [X] T040 [P] [US3] Create forgot password form component in apps/web/components/account/forgot-password-form.tsx
- [X] T041 [P] [US3] Create reset password form component in apps/web/components/account/reset-password-form.tsx
- [X] T042 [US3] Add forgot password page in apps/web/app/forgot-password/page.tsx
- [X] T043 [US3] Add reset password page in apps/web/app/reset-password/page.tsx
- [X] T044 [US3] Add forgot password link to login UI in apps/web/components/auth/auth-card.tsx

**Checkpoint**: User Story 3 works independently from authenticated account settings.

---

## Phase 6: User Story 4 - Delete Account (Priority: P4)

**Goal**: Authenticated users can delete their account only after current-password proof and the fixed confirmation phrase, with immediate access revocation and 30-day permanent deletion scheduling.

**Independent Test**: Sign in, attempt deletion with invalid proof/phrase, complete valid deletion, confirm sign-out and blocked protected access.

### Tests for User Story 4

- [X] T045 [P] [US4] Add core tests for delete account confirmation, wrong password, wrong phrase, deactivation, and 30-day scheduled deletion in packages/core/src/auth/__tests__/delete-account.test.ts
- [X] T046 [P] [US4] Add API contract tests for DELETE /auth/me in apps/api/src/routes/__tests__/account-management.contracts.test.ts

### Implementation for User Story 4

- [X] T047 [US4] Implement delete account use case with current password check and fixed DELETE phrase in packages/core/src/auth/index.ts
- [X] T048 [US4] Add repository support for account deactivation and scheduled deletion timestamp in packages/db/src/repositories/user-repository.ts
- [X] T049 [US4] Add Zod schema and handler for DELETE /auth/me in apps/api/src/routes/auth.ts
- [X] T050 [US4] Add deleteAccount API client method in apps/web/src/lib/api-client.ts
- [X] T051 [US4] Create delete account panel component in apps/web/components/account/delete-account-panel.tsx
- [X] T052 [US4] Integrate delete account danger section into account settings page in apps/web/app/account/page.tsx
- [X] T053 [US4] Ensure current-user and login flows reject deactivated accounts in packages/core/src/auth/index.ts

**Checkpoint**: User Story 4 works independently and revokes protected access.

---

## Phase 7: User Story 5 - Use Account Management UI (Priority: P5)

**Goal**: Account-management UI clearly separates profile editing, password change, forgot/reset flows, and destructive deletion with loading, success, error, pending, and cancellation states.

**Independent Test**: Navigate account settings and auth recovery screens; confirm each action area is distinguishable, prevents duplicate submissions, and shows appropriate feedback.

### Tests for User Story 5

- [X] T054 [P] [US5] Add web lint-safe UI smoke checks or inline coverage notes for account settings components in apps/web/components/account/account-profile-form.tsx
- [X] T055 [P] [US5] Add API contract coverage for loading/error relevant response shapes in apps/api/src/routes/__tests__/account-management.contracts.test.ts

### Implementation for User Story 5

- [X] T056 [US5] Add account component barrel exports in apps/web/components/account/index.ts
- [X] T057 [US5] Refine account settings layout states in apps/web/app/account/page.tsx
- [X] T058 [US5] Add user-facing loading, success, error, and cancellation handling across account components in apps/web/components/account/account-profile-form.tsx
- [X] T059 [US5] Add user-facing loading, success, error, and cancellation handling across password/delete components in apps/web/components/account/password-change-form.tsx and apps/web/components/account/delete-account-panel.tsx
- [X] T060 [US5] Add user-facing loading, success, error, and restart handling across recovery components in apps/web/components/account/forgot-password-form.tsx and apps/web/components/account/reset-password-form.tsx

**Checkpoint**: User Story 5 improves usability without changing core behavior.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation, and security review across all stories.

- [X] T061 [P] Update account-management quickstart notes if implementation paths differ in specs/002-account-management/quickstart.md
- [X] T062 [P] Review README setup for any new account-management email environment variables in README.md
- [X] T063 Run security review for password/code handling and inactive account access in packages/core/src/auth/index.ts and apps/api/src/routes/auth.ts
- [X] T064 Run full repository validation with npx turbo build lint test using package.json from repository root

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all user stories.
- **User Story Phases (Phase 3-7)**: Depend on Phase 2. Implement sequentially by priority for lowest risk, or in parallel after foundation if files are coordinated.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 Edit Account Information**: MVP; can start after foundation.
- **US2 Change Account Password**: Can start after foundation; shares password validation with existing auth.
- **US3 Recover Forgotten Password**: Can start after foundation; shares one-time code persistence with email verification.
- **US4 Delete Account**: Can start after foundation; must account for login/current-user changes.
- **US5 Use Account Management UI**: Depends on UI pieces from US1-US4 for final polish, though component scaffolds can be created earlier.

### Within Each User Story

- Core/API tests before implementation.
- Persistence models/repositories before core behavior that depends on them.
- Core use cases before API handlers.
- API client methods before UI form wiring.
- Page composition after reusable components exist.

---

## Parallel Opportunities

- T002, T003, and T004 can run in parallel after T001 starts.
- T006 and T007 can run in parallel because they create separate models.
- US1 tests T014, T015, and T016 can run in parallel.
- US1 components T021 and T022 can run in parallel after T020.
- US2 tests T025 and T026 can run in parallel.
- US3 tests T032, T033, and T034 can run in parallel.
- US3 components T040 and T041 can run in parallel after T039.
- US4 tests T045 and T046 can run in parallel.
- Polish documentation tasks T061 and T062 can run in parallel.

## Parallel Example: User Story 1

```text
Task: "T014 [P] [US1] Add core tests for profile update and pending email behavior in packages/core/src/auth/__tests__/account-profile.test.ts"
Task: "T015 [P] [US1] Add core tests for email change code verification in packages/core/src/auth/__tests__/email-change.test.ts"
Task: "T016 [P] [US1] Add API contract tests for PATCH /auth/me and POST /auth/me/email/verify in apps/api/src/routes/__tests__/account-management.contracts.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T040 [P] [US3] Create forgot password form component in apps/web/components/account/forgot-password-form.tsx"
Task: "T041 [P] [US3] Create reset password form component in apps/web/components/account/reset-password-form.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 User Story 1.
4. Validate: profile updates, pending email display, email verification, and no secret exposure.

### Incremental Delivery

1. Add US1 profile/email change and validate independently.
2. Add US2 password change and validate login credential rotation.
3. Add US3 forgot password and validate account-existence privacy.
4. Add US4 delete account and validate immediate protected-access revocation.
5. Add US5 UI state polish and final quickstart validation.

### Team Strategy

After Phase 2, assign one developer to persistence/core work, one to API contracts/routes, and one to web UI components. Coordinate edits to shared files: packages/core/src/auth/index.ts, apps/api/src/routes/auth.ts, apps/web/src/lib/api-client.ts, and apps/web/app/account/page.tsx.

---

## Notes

- Every task follows `- [X] T### [P?] [US?] Description with file path`.
- `[P]` means the task uses separate files or can be done without depending on incomplete tasks.
- `[US#]` labels map to prioritized user stories in spec.md.
- Keep business behavior in `packages/core`.
- Keep `apps/web` API-driven through `apps/web/src/lib/api-client.ts`.
- Never expose plaintext passwords, password confirmations, one-time codes, hashes, JWTs, or database connection strings in account-management responses or UI.

