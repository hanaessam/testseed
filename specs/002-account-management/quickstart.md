# Quickstart: Account Management

## Prerequisites

- Node.js 20+
- npm 10+
- TestSeed dependencies installed with `npm install`
- API and web environment variables configured as described in the project README
- Email sending adapter available for registration OTP, password reset code, and email-change verification code flows

## Validation Flow

1. Start the API and web apps.
2. Register a user and sign in.
3. Open the account settings page.
4. Update the display name and confirm the profile summary updates.
5. Request an email change and confirm the active email remains unchanged while the pending email is shown.
6. Complete email verification with the one-time code and confirm the new email becomes active.
7. Change password with the current password and matching valid new password entries.
8. Sign out and confirm the old password no longer works while the new password does.
9. From the login screen, choose forgot password.
10. Request password recovery with the account email and verify the response does not expose account existence.
11. Complete reset with the emailed one-time code and matching valid new password entries.
12. Sign in with the reset password.
13. Open account settings and start delete account.
14. Confirm deletion requires current password plus the fixed phrase `DELETE`.
15. Submit a valid deletion request and confirm the user is signed out.
16. Confirm the deactivated account cannot sign in or access protected workflows and is scheduled for permanent deletion after 30 days.

## Required Checks

Run before handoff:

```sh
npx turbo build lint test
```

## Expected Artifacts

- Account contracts in `packages/types/src/auth.ts`
- Core account-management use cases and Jest tests in `packages/core/src/auth`
- User persistence updates in `packages/db`
- Account-management API routes and contract tests in `apps/api`
- Account settings, forgot password, and reset password UI in `apps/web`
