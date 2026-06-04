# Research: Account Management

## Decision: Use existing one-time-code email pattern for password recovery

**Rationale**: The project already uses registration OTP codes with email delivery, hashing, expiration, and attempt limits. Reusing that product pattern gives users a familiar recovery flow and keeps implementation aligned with existing auth tests.

**Alternatives considered**: Time-limited reset links were standard, but the clarified spec chose in-app one-time codes. Security questions were rejected because they are weaker and add personal-data storage. Manual support resets were rejected because this is a self-service feature.

## Decision: Store one-time reset and verification codes hashed

**Rationale**: Reset and email-change codes are credentials. Storing only hashes protects the account if application storage is inspected and matches the current registration OTP approach.

**Alternatives considered**: Plaintext code storage would simplify lookup but violates the security posture. Encrypted code storage still leaves recoverable credentials and is unnecessary when code comparison can use hashes.

## Decision: Keep current email active until pending email is verified

**Rationale**: This prevents users from losing access because of a typo or inaccessible new email address. It also gives the system one active login email while separately tracking the pending replacement.

**Alternatives considered**: Immediate email replacement was simpler but risked lockout. Immediate replacement with unverified status was rejected because protected access semantics become muddier. Disallowing email changes did not satisfy the spec.

## Decision: Account deletion uses deactivation plus 30-day deletion scheduling

**Rationale**: The clarified spec requires immediate access revocation and permanent account-owned data deletion after 30 days. A status and scheduled deletion timestamp make the lifecycle testable while preserving a recovery window.

**Alternatives considered**: Immediate hard delete was rejected because it can break historical seed batch/rollback traceability and gives no recovery window. Indefinite deactivation was rejected because the spec requires permanent deletion.

## Decision: Revoke protected access by treating inactive/deleted users as non-authenticated

**Rationale**: Existing protected API flows already resolve current users. Ensuring deactivated users cannot resolve as valid protected identities prevents access even if an older token still exists.

**Alternatives considered**: Maintaining a token blacklist would add a separate session store. Shortening token lifetime alone would not satisfy immediate access revocation.

## Decision: Keep UI as a dedicated account page with focused components

**Rationale**: The feature includes distinct routine, recovery, and destructive actions. A dedicated page and focused components keep these actions visually separated and align with the web app guidance to keep pages thin.

**Alternatives considered**: Adding all controls to the dashboard would crowd the workflow screen. A modal-only account settings flow would make destructive deletion and pending email states harder to scan.
