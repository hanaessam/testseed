# Data Model: Account Management

## User Account

Represents the authenticated identity that owns profile details, credentials, generation sessions, seed batches, and rollback access.

### Fields

- `id`: Stable account identifier.
- `displayName`: Optional user-facing profile name.
- `email`: Active login/contact email. Remains active until any pending replacement is verified.
- `pendingEmail`: Optional unverified replacement email.
- `passwordHash`: Stored password hash. Never exposed in API responses.
- `status`: `active`, `deactivated`, or `deleted`.
- `deactivatedAt`: Set when account deletion is confirmed.
- `scheduledDeletionAt`: Set to 30 days after confirmed account deletion.
- `createdAt`: Account creation time.
- `updatedAt`: Last account profile/security update time.

### Validation Rules

- Active email must be normalized, valid, and unique among active accounts.
- Pending email must be normalized, valid, and not already used by another account.
- `passwordHash` must exist for email/password accounts.
- Deactivated or deleted accounts cannot access protected workflows.
- `scheduledDeletionAt` is required when `status` is `deactivated` because of account deletion.

### State Transitions

```text
active -> active        # Profile/password updates
active -> active        # Pending email requested
active -> active        # Pending email verified; active email replaced
active -> deactivated   # Delete account confirmed; access revoked
deactivated -> deleted  # 30-day deletion window expires and account-owned data is permanently removed
```

## Email Change Verification

Represents an in-progress request to replace a user's active email address.

### Fields

- `userId`: Owner account.
- `currentEmail`: Active email at request time.
- `pendingEmail`: Requested replacement email.
- `verificationCodeHash`: Hash of the one-time email verification code.
- `expiresAt`: Verification expiry time.
- `attemptsRemaining`: Number of attempts before the verification is blocked.
- `createdAt`: Request creation time.

### Validation Rules

- Only one active pending email change per user.
- Code must be unexpired, unused, and have attempts remaining.
- Pending email uniqueness must be checked again before it becomes active.

## Password Reset Request

Represents a login-flow recovery request for a user who cannot sign in.

### Fields

- `email`: Normalized account email used to request recovery.
- `resetCodeHash`: Hash of the one-time reset code.
- `expiresAt`: Reset expiry time.
- `attemptsRemaining`: Number of attempts before the reset is blocked.
- `createdAt`: Request creation time.
- `usedAt`: Set when reset succeeds.

### Validation Rules

- User-facing request response must not reveal whether the email is registered.
- Reset code must be unexpired, unused, and have attempts remaining.
- New password and verification password must match and pass password requirements.
- Successful reset replaces the password hash and consumes the reset request.

## Password Change Request

Represents an authenticated password update attempt.

### Fields

- `userId`: Authenticated account.
- `currentPassword`: Transient proof input, never stored.
- `newPassword`: Transient new credential input, never stored.
- `confirmPassword`: Transient verification input, never stored.

### Validation Rules

- Current password must match the stored password hash.
- New password and confirmation must match.
- New password must satisfy existing password rules.
- New password must not be the same as the current password.

## Account Deletion Request

Represents the destructive confirmation for deleting an account.

### Fields

- `userId`: Authenticated account.
- `currentPassword`: Transient proof input, never stored.
- `confirmationPhrase`: Transient fixed-phrase input, never stored.
- `confirmedAt`: Time deletion is confirmed.
- `scheduledDeletionAt`: `confirmedAt` plus 30 days.

### Validation Rules

- Current password must match the stored password hash.
- Confirmation phrase must match the required fixed phrase exactly.
- Successful confirmation immediately changes the account status to `deactivated`.
- Deactivated accounts cannot sign in or use protected workflows during the 30-day window.
