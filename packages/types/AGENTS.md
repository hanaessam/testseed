# `@testseed/types` Agent Guide

Purpose: entities layer, zero logic, zero runtime dependencies.

Allowed:

- Interfaces
- Type aliases
- Enums
- DTO shapes
- Literal union types

Forbidden:

- Functions
- Classes
- Runtime imports
- Imports from other `@testseed/*` packages
- Validation logic
- Business logic

This package defines contracts only. If a change needs behavior, put it in `packages/core`.
