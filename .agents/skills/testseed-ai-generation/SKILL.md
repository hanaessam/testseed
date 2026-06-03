---
name: testseed-ai-generation
description: Use when working on TestSeed AI seed generation, regeneration feedback, OpenAI prompts, AI JSON parsing, generated record validation, or AI-output error handling.
---

# TestSeed AI Generation

AI output is draft data. Validate it before export, insertion, or display as trusted.

## Workflow

1. Read `docs/requirements.md`, root `AGENTS.md`, and relevant package `AGENTS.md`.
2. Keep prompt construction and validation behavior in the layer that owns the use case.
3. Pass API keys and AI clients through adapter dependencies; do not read secrets in core.
4. Validate AI JSON shape and generated records before returning them as usable data.
5. Preserve schema constraints: required fields, types, enums, unique fields, references, and dependency order.
6. For regeneration, include previous output and user feedback while preserving schema validity.
7. Add tests for malformed JSON, invalid records, duplicates, unresolved references, and conflicting feedback when behavior changes.

## Guardrails

- Do not store OpenAI keys, prompts containing secrets, user MongoDB connection strings, or raw sensitive data.
- Do not trust model output without validation.
- Do not let feedback override schema constraints.
- Do not change direct seeding, rollback, or auth behavior as part of AI generation work unless explicitly requested.
