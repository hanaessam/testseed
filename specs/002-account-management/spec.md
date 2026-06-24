# Feature Specification: Account Management

**Feature Branch**: `002-account-management`

**Created**: 2026-06-03

**Status**: Shipped

**Input**: User description: "i want to add full acccount managment features like edit account info and edit account password and verify new password . add delete account feature , and create ui components for them , check the md files for account managment"

## Clarifications

### Session 2026-06-03

- Q: What should happen to account-owned data after account deletion is confirmed? -> A: Deactivate the account immediately, revoke protected access, then permanently delete account-owned data after the clarified 30-day retention period.
- Q: What confirmation should be required before account deletion proceeds? -> A: Require the current password plus typing a fixed confirmation phrase.
- Q: How should the forgot password flow verify the user's reset request? -> A: Send a one-time code to the account email and let the user enter it in the app.
- Q: How long should account-owned data remain recoverable after deletion deactivates the account? -> A: 30 days before permanent deletion.
- Q: What should happen when a user changes their email address? -> A: Keep the current email active until the new email is verified.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit Account Information (Priority: P1)

As an authenticated developer, I want to update my account information so my TestSeed profile stays accurate while my generation sessions and seed batches remain tied to the same identity.

**Why this priority**: Account information editing is the core account-management value path and improves the existing account creation and login requirements without changing the user's seed generation workflow.

**Independent Test**: Can be fully tested by signing in, opening account settings, changing profile details, saving, and confirming the updated information appears on the account settings screen and in user-facing account areas.

**Acceptance Scenarios**:

1. **Given** an authenticated developer is on account settings, **When** they update editable account information with valid values, **Then** the system saves the changes and shows the updated account details.
2. **Given** an authenticated developer enters an invalid, duplicate, or incomplete account value, **When** they try to save, **Then** the system prevents the update and explains what must be corrected.
3. **Given** an authenticated developer changes their email address, **When** the new email has not been verified yet, **Then** the current email remains active and the system clearly shows the pending verification status.

---

### User Story 2 - Change Account Password (Priority: P2)

As an authenticated developer, I want to change my account password and verify the new password entry so my TestSeed account remains secure.

**Why this priority**: Password updates are a core self-service account-management need and reduce security risk when a user believes their password should be rotated.

**Independent Test**: Can be fully tested by signing in, entering the current password, entering and confirming a valid new password, saving, and confirming the old password no longer works while the new password does.

**Acceptance Scenarios**:

1. **Given** an authenticated developer is changing their password, **When** they provide the correct current password and matching valid new password entries, **Then** the password is updated and the user receives a clear success confirmation.
2. **Given** the current password is incorrect, **When** the developer tries to save a new password, **Then** the system denies the update without revealing sensitive account details.
3. **Given** the new password and verification entry do not match, **When** the developer tries to save, **Then** the system blocks the update and asks the developer to correct the mismatch.
4. **Given** the new password does not meet password requirements, **When** the developer tries to save, **Then** the system explains the unmet requirements without saving the change.

---

### User Story 3 - Recover Forgotten Password (Priority: P3)

As a developer who cannot remember my password, I want a forgot password option in the authentication flow so I can regain access to my TestSeed account without creating a new account.

**Why this priority**: Password recovery is a core support path for account access and complements login, registration, and password-change requirements.

**Independent Test**: Can be fully tested by opening the login flow, choosing forgot password, completing the reset process for an existing account, and confirming the new password works while the old password does not.

**Acceptance Scenarios**:

1. **Given** a developer is on the login screen, **When** they choose forgot password and provide an account email, **Then** the system starts a password reset flow without revealing whether the email belongs to an account.
2. **Given** the developer receives a valid one-time reset code by email, **When** they enter the code in the app with matching valid new password entries, **Then** the password is updated and the developer can sign in with the new password.
3. **Given** the one-time reset code is expired, invalid, already used, or the new password entries do not match, **When** the developer tries to complete the reset, **Then** the system blocks the reset and explains the correction or restart path.

---

### User Story 4 - Delete Account (Priority: P4)

As an authenticated developer, I want to delete my account when I no longer want to use TestSeed so my profile and account-owned workspace access can be removed intentionally.

**Why this priority**: Account deletion is important for user control and privacy, but it must be guarded because it can remove access to generation sessions and seed batch records.

**Independent Test**: Can be fully tested by signing in, starting account deletion, completing the required confirmation, and confirming the user can no longer access protected account areas after deletion.

**Acceptance Scenarios**:

1. **Given** an authenticated developer is on account settings, **When** they choose delete account, **Then** the system displays a clear confirmation flow describing the consequences before deletion occurs.
2. **Given** the developer enters their current password and the required fixed confirmation phrase, **When** they submit the deletion request, **Then** the account is immediately deactivated, protected access is revoked, the user is signed out, and account-owned data is scheduled for permanent deletion after 30 days.
3. **Given** the developer cancels the deletion confirmation, **When** they return to account settings, **Then** no account information is deleted and the account remains usable.
4. **Given** deletion cannot be completed because the current password or confirmation phrase is missing or invalid, **When** the developer submits the request, **Then** the system blocks deletion and explains the missing confirmation.

---

### User Story 5 - Use Account Management UI (Priority: P5)

As an authenticated developer, I want clear account management screens and reusable UI sections so editing profile details, changing password, and deleting the account feel understandable and difficult to trigger accidentally.

**Why this priority**: The requested features need discoverable UI components with appropriate visual separation between routine updates and destructive actions.

**Independent Test**: Can be fully tested by navigating to account settings and confirming the profile form, password form, and delete-account confirmation flow are visible, usable, and give clear feedback for success and errors.

**Acceptance Scenarios**:

1. **Given** an authenticated developer opens account settings, **When** the page loads, **Then** they can clearly distinguish profile information editing, password changing, and account deletion areas.
2. **Given** a save, password update, or delete action is processing, **When** the developer interacts with the UI, **Then** the interface prevents duplicate submissions and provides understandable progress feedback.
3. **Given** an account-management action succeeds or fails, **When** the result is returned, **Then** the UI shows a clear confirmation or correction message without disrupting unrelated settings.

### Edge Cases

- The user attempts to access account settings while not authenticated.
- The user tries to update an email address that is already used by another account.
- The user starts an email change but never verifies the new email address.
- The user submits account information with missing required fields, invalid email format, or values that exceed visible limits.
- The user enters a current password that is wrong, a new password that matches the current password, or a new password that fails password-strength requirements.
- The user enters a new password and verification password that differ only by accidental whitespace.
- The user requests password reset for an email address that does not belong to an account.
- The user tries to complete password reset with an expired, invalid, or already used one-time reset code.
- The user starts account deletion but cancels before final confirmation.
- The user tries to delete an account with the wrong current password or an incorrect confirmation phrase.
- The user tries to delete an account that owns generation sessions, exported seed data, direct seeding reports, or rollback references.
- The user tries to sign in or use protected workflows during the 30-day retention period after account deletion has deactivated the account.
- The user has an active session in another browser after password change or account deletion.
- A save, password update, or deletion request fails because of a temporary service problem.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an account settings area available only to authenticated users.
- **FR-002**: System MUST display the user's current editable account information in account settings.
- **FR-003**: System MUST allow authenticated users to update editable account information such as display name and email address.
- **FR-004**: System MUST validate account information before saving and show clear user-facing correction messages for invalid, duplicate, or missing values.
- **FR-005**: System MUST preserve the user's ownership of existing generation sessions, seed batches, and rollback records when account information is updated.
- **FR-006**: System MUST keep the current email active until a newly requested email address is verified.
- **FR-006a**: System MUST clearly indicate when an email change is pending verification.
- **FR-007**: System MUST allow authenticated users to change their password from account settings.
- **FR-008**: System MUST require the user's current password before changing to a new password.
- **FR-009**: System MUST require the new password to be entered twice and MUST verify that both entries match before saving.
- **FR-010**: System MUST enforce password requirements and explain unmet requirements before saving a new password.
- **FR-011**: System MUST prevent password changes when the current password is incorrect.
- **FR-012**: System MUST provide a clear success confirmation after account information or password changes are completed.
- **FR-012a**: System MUST provide a forgot password option from the authentication flow.
- **FR-012b**: System MUST allow users to request password recovery with an account email without revealing whether that email is registered.
- **FR-012c**: System MUST send a one-time password reset code to the account email when password recovery is requested.
- **FR-012d**: System MUST allow users with a valid one-time reset code to enter the code in the app and verify a new password.
- **FR-012e**: System MUST block password reset completion when the one-time reset code is expired, invalid, already used, the new password entries do not match, or the new password fails password requirements.
- **FR-013**: System MUST provide an account deletion flow that is visually and procedurally separate from routine account edits.
- **FR-014**: System MUST describe the consequences of account deletion before the user can confirm deletion.
- **FR-015**: System MUST require the user's current password and a fixed confirmation phrase before deleting an account.
- **FR-016**: System MUST immediately deactivate the account and sign the user out after successful account deletion confirmation.
- **FR-017**: System MUST prevent deactivated or deleted accounts from accessing protected TestSeed workflows.
- **FR-017a**: System MUST schedule account-owned data for permanent deletion 30 days after account deletion is confirmed.
- **FR-018**: System MUST provide account-management UI sections for editing account information, changing password, and deleting the account.
- **FR-019**: System MUST prevent duplicate submissions while account-management actions are in progress.
- **FR-020**: System MUST show clear success, error, pending verification, and cancellation states for account-management actions.
- **FR-021**: System MUST avoid exposing passwords, password verification entries, session secrets, database connection strings, or other sensitive values in account-management displays or messages.
- **FR-022**: System MUST ensure account-management actions affect only the authenticated user's own account.

### Key Entities

- **User Account**: The authenticated identity that owns profile details, login credentials, generation sessions, seed batches, and rollback access.
- **Account Profile**: Editable user-facing account information such as display name, active email address, pending email address, verification status, and last update time.
- **Password Change Request**: A user-initiated request containing current-password proof, a new password, and a matching verification entry.
- **Password Reset Request**: A login-flow recovery request that sends a one-time reset code to an account email without disclosing account existence.
- **Account Deletion Request**: A deliberate confirmation containing current-password proof and a fixed confirmation phrase, indicating that the authenticated user wants to deactivate their account immediately, end protected access, and schedule account-owned data for permanent deletion after 30 days.
- **Account Management Message**: A user-facing success, error, pending, or warning message shown during account settings actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of authenticated users can find account settings and update valid profile information in under 2 minutes during usability testing.
- **SC-001a**: 100% of unverified email changes keep the previous email active until the new email is verified.
- **SC-002**: 95% of password-change attempts with valid current password and matching valid new password entries complete successfully on the first submission.
- **SC-003**: 100% of mismatched password verification attempts are blocked before the password is changed.
- **SC-003a**: 100% of forgot password requests provide the same user-facing response pattern whether or not the submitted email is registered.
- **SC-004**: 100% of account deletion attempts require current-password proof and a fixed confirmation phrase after the consequences are shown.
- **SC-005**: 100% of successful account deletion confirmations end protected access for that account immediately and schedule permanent account-owned data deletion after 30 days.
- **SC-006**: 0 account-management screens or messages expose plaintext passwords, password verification entries, database connection strings, or session secrets in security review samples.
- **SC-007**: 90% of tested users can correctly identify which area edits profile details, which changes password, and which deletes the account without assistance.

## Assumptions

- Users must already be registered and logged in before using account management.
- Account information editing includes display name and email address as the primary editable profile fields.
- Email changes keep the current email active until the new email is verified.
- Password changes require current-password confirmation plus a repeated new-password verification entry.
- Forgot password is part of the authentication flow and supports users who cannot sign in with their current password.
- Account deletion is treated as a deliberate destructive action and requires current-password confirmation plus a fixed confirmation phrase.
- Account deletion deactivates the account immediately, prevents further protected access, and permanently deletes account-owned data after 30 days.
- Existing account creation and login behavior remain in scope as dependencies, but this feature focuses on post-login account self-service.
