# Research: MongoDB Schema Discovery

## Decision: Keep Connection Strings Operation-Only

Connection strings are accepted only on test/discovery requests and are never returned in responses, stored in project context, stored in schema snapshots, or logged.

**Rationale**: MongoDB connection strings often include credentials and host details.

**Alternatives considered**: Save connection profiles for reuse. Rejected because it adds credential storage and security scope not required for this feature.

## Decision: Sample Up To 20 Documents Per Collection

Discovery defaults to 20 sampled documents per collection and caps user-provided sample sizes at 20.

**Rationale**: This gives useful inference while keeping large databases fast and safe to inspect.

**Alternatives considered**: Inspect all documents or expose a UI sample-size picker. Rejected for v1 because both add performance and UX risk.

## Decision: Detect Sample Cap With One Extra Internal Read

The DB inspector fetches `sampleSize + 1`, returns only the first `sampleSize`, and marks `sampleLimitReached` when more data exists.

**Rationale**: This supports accurate warnings without returning more than the allowed sample.

## Decision: Use Core Dependency Injection For Inspection

Core receives a `MongoSchemaDiscoveryInspector`; DB owns the Mongoose connection implementation.

**Rationale**: Core stays framework-free and testable while DB owns infrastructure.

## Decision: Sanitize Connection Errors

API routes map raw errors into categories such as invalid format, unreachable host, authentication failed, timeout, or unknown.

**Rationale**: Raw driver messages can expose sensitive hostnames, usernames, or URI fragments.

