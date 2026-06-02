# Email OTP Registration

TestSeed creates email/password accounts only after the user proves control of the email address with a one-time code.

## Flow

1. The web app posts `email`, `password`, and `confirmPassword` to `POST /auth/register/request-otp`.
2. The API validates the body with Zod, then calls `requestRegistrationOtp()` in `@testseed/core`.
3. Core validates the password policy, rejects duplicate emails, hashes the password, hashes the OTP, and asks the adapter layer to cache the pending registration.
4. The API sends a styled HTML email through SMTP/Nodemailer.
5. The web app posts `email` and `otp` to `POST /auth/register/verify-otp`.
6. Core validates the OTP, creates the user, deletes the cached pending registration, and returns a JWT.

## Password Policy

- At least 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Password and confirmation must match

The web UI displays the same checklist for immediate feedback. The core package still enforces the policy so UI bypasses cannot create weak accounts.

## Cache

Pending registrations live in Redis under `testseed:registration-otp:{email}`. They include only the normalized email, password hash, OTP hash, expiry timestamp, and remaining attempts. Raw passwords and raw OTP codes are never stored.

Required environment:

```env
REDIS_URL=https://your-upstash-redis-url.upstash.io
REDIS_TOKEN=your-upstash-rest-token
OTP_TTL_SECONDS=600
OTP_MAX_ATTEMPTS=5
```

## Email

The API sends the verification code with Nodemailer. Use real SMTP credentials in local `.env` when testing with a real email account.

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM="TestSeed <no-reply@example.com>"
```

## Edge Cases

- Duplicate email on OTP request: `400 Email is already registered`
- Weak password: `400 Password does not meet security requirements`
- Invalid or expired OTP: generic `400 Invalid or expired verification code`
- Too many OTP attempts: `429 Too many verification attempts`
- Duplicate email between OTP request and verification: pending registration is deleted and `400` is returned
