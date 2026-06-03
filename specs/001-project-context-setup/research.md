# Research: Project Context Setup

## Decision: Project context is stored on the generation project

**Rationale**: The existing project record already owns name, description, schema snapshot pointer, lifecycle status, and history. Attaching context to the project keeps generation setup, schema review, and future seed generation aligned with one workspace.

**Alternatives considered**:

- Separate project context collection: rejected for MVP because the context has one active value per project and does not need independent lifecycle yet.
- Store context only in browser state: rejected because project detail, generation, and regeneration need durable context.

## Decision: Description is the core context path

**Rationale**: A plain-language description works without GitHub access, schema discovery, or repository availability and directly supports the requirement that generated data match a domain such as e-commerce.

**Alternatives considered**:

- Require repository context before generation: rejected because repository context is optional and must not block manual schema input.
- Infer domain only from schemas: rejected because schemas often reveal structure but not business tone, geography, product category, or realistic value style.

## Decision: Repository context is implemented as optional MVP enrichment

**Rationale**: Clarification chose GitHub repository context as part of the MVP feature. It should improve relevance when available while preserving a description-only fallback.

**Alternatives considered**:

- Future/non-core only: rejected by clarification.
- UI placeholder only: rejected because the spec now requires an implemented optional path.

## Decision: Repository access is limited to repositories accessible through the connected GitHub account

**Rationale**: This gives the user a clear authorization boundary and avoids accepting arbitrary repository claims. Existing GitHub login patterns can be extended, but repository authorization must be treated as separate from account login because account login currently requests only identity/email access.

**Alternatives considered**:

- Public repositories only: rejected by clarification.
- All private repositories by default: rejected because access must be explicitly user-approved and bounded.

## Decision: GitHub tokens and raw repository files are transient

**Rationale**: The spec requires only generated repository context summary and warnings to be stored. Tokens and raw files are sensitive and bulky; retaining them would create unnecessary security risk.

**Alternatives considered**:

- Store raw files with the summary: rejected by clarification.
- Re-read the repository for every generation: rejected because the summary gives stable context and avoids repeated token/file access for routine generation setup.

## Decision: Repository connection uses a one-operation authorization flow

**Rationale**: Existing account login requests identity/email access and discards the GitHub access token. Repository context needs stronger repository access but the plan must not store tokens. A project-scoped authorization flow can carry the target repository through state, exchange the code, verify access, read bounded relevant files, summarize, save summary/warnings, and discard the token in one operation.

**Alternatives considered**:

- Store GitHub access tokens for later repository listing: rejected because token persistence increases security risk and is not required by the spec.
- Ask the web app to call GitHub directly: rejected because the web app must not handle repository tokens or business filtering rules.
- List all accessible repositories after login: rejected because identity login does not provide repository access and broad token storage is out of scope.

## Decision: Core receives GitHub and AI/repository summarization dependencies as injected ports

**Rationale**: Core cannot import framework or database adapters. Injected ports allow tests to verify filtering, warning, and summary behavior without network calls.

**Alternatives considered**:

- Fetch GitHub files directly in Express route handlers: rejected because repository selection, filtering, and warning decisions are product behavior.
- Put summarization in the web app: rejected because web must not contain business logic and cannot safely handle repository tokens.

## Decision: Relevant repository signals are bounded

**Rationale**: The feature should search for schemas, models, seed scripts, README documentation, package metadata, and domain terminology while ignoring secrets, dependency folders, generated output, binary files, and unrelated large files.

**Alternatives considered**:

- Read the entire repository: rejected for security, performance, and token usage.
- Require users to select individual files first: deferred because automatic filtering gives a better MVP workflow; manual file selection can be a later refinement.
