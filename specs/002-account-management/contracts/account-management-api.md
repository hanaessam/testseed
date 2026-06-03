# Account Management API Contract

All authenticated endpoints require the existing bearer token authentication. Request bodies are validated before handlers call core use cases. Responses must never include password hashes, plaintext passwords, one-time codes, session secrets, or database connection strings.

## GET /auth/me

Returns the current authenticated account profile.

### Response 200

```json
{
  "user": {
    "id": "user_123",
    "email": "developer@example.com",
    "displayName": "Developer Name",
    "pendingEmail": "new@example.com",
    "emailVerificationPending": true,
    "status": "active",
    "createdAt": "2026-06-03T00:00:00.000Z"
  }
}
```

### Failure Modes

- `401`: Missing or invalid authentication.
- `404`: Authenticated identity no longer resolves to an active user.

## PATCH /auth/me

Updates editable account profile fields.

### Request

```json
{
  "displayName": "Developer Name",
  "email": "new@example.com"
}
```

### Response 200

```json
{
  "user": {
    "id": "user_123",
    "email": "developer@example.com",
    "displayName": "Developer Name",
    "pendingEmail": "new@example.com",
    "emailVerificationPending": true,
    "status": "active",
    "createdAt": "2026-06-03T00:00:00.000Z"
  },
  "message": "Profile updated"
}
```

### Validation and Failure Modes

- `400`: Invalid email, missing required profile value, or value exceeds visible limits.
- `409`: Requested email is already used by another account.
- `401`: Missing or invalid authentication.

## POST /auth/me/email/verify

Completes pending email verification.

### Request

```json
{
  "code": "123456"
}
```

### Response 200

```json
{
  "user": {
    "id": "user_123",
    "email": "new@example.com",
    "displayName": "Developer Name",
    "emailVerificationPending": false,
    "status": "active",
    "createdAt": "2026-06-03T00:00:00.000Z"
  },
  "message": "Email verified"
}
```

### Validation and Failure Modes

- `400`: Code is invalid, expired, already used, or the new email is no longer available.
- `429`: Too many verification attempts.
- `401`: Missing or invalid authentication.

## POST /auth/me/password

Changes the password for an authenticated user.

### Request

```json
{
  "currentPassword": "Current-password-123!",
  "newPassword": "New-password-123!",
  "confirmPassword": "New-password-123!"
}
```

### Response 200

```json
{
  "message": "Password updated"
}
```

### Validation and Failure Modes

- `400`: New password entries do not match, fail password requirements, or match the current password.
- `401`: Missing authentication or incorrect current password.

## POST /auth/password/forgot

Starts password recovery. The response pattern is the same whether or not the email is registered.

### Request

```json
{
  "email": "developer@example.com"
}
```

### Response 202

```json
{
  "message": "If an account exists for that email, a reset code has been sent.",
  "expiresInSeconds": 600
}
```

### Validation and Failure Modes

- `400`: Email format is invalid.
- `202`: Unknown email still receives the same user-facing response pattern.

## POST /auth/password/reset

Completes password recovery with a one-time code.

### Request

```json
{
  "email": "developer@example.com",
  "code": "123456",
  "newPassword": "New-password-123!",
  "confirmPassword": "New-password-123!"
}
```

### Response 200

```json
{
  "message": "Password reset complete"
}
```

### Validation and Failure Modes

- `400`: Reset code is invalid, expired, already used, new password entries do not match, or new password fails password requirements.
- `429`: Too many reset attempts.

## DELETE /auth/me

Confirms account deletion.

### Request

```json
{
  "currentPassword": "Current-password-123!",
  "confirmationPhrase": "DELETE"
}
```

### Response 202

```json
{
  "message": "Account deactivated and scheduled for permanent deletion.",
  "deactivatedAt": "2026-06-03T00:00:00.000Z",
  "scheduledDeletionAt": "2026-07-03T00:00:00.000Z"
}
```

### Validation and Failure Modes

- `400`: Confirmation phrase is missing or incorrect.
- `401`: Missing authentication or incorrect current password.
- `409`: Account is already deactivated or deleted.

## UI Contract

- Login screen includes a forgot password link.
- Account settings includes separate profile, password, and danger areas.
- Profile area displays active email and pending email verification state.
- Password forms collect password and verification fields without displaying saved secrets.
- Delete account area uses a distinct destructive style and requires current password plus `DELETE`.
- All account-management actions show loading, success, error, and cancellation states.
