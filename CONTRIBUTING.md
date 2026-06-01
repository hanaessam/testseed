# Contributing

## Prerequisites

- Node.js 20+
- npm 10+
- Codex with Superpowers enabled
- GitHub Spec Kit commands available in the AI workflow

## Clone and Run

```sh
git clone <repository-url>
cd testseed
npm install
copy .env.example .env
npx turbo dev
```

On macOS or Linux, use `cp .env.example .env`.

## Branch Strategy

- `main`: stable, reviewed work only.
- `develop`: integration branch for completed features.
- `feature/NN-name`: one feature branch per issue or task, where `NN` is the task number.

## Pull Request Rules

- One feature per PR.
- Keep PRs small enough to review.
- Explain which layer changed and why.
- Must pass:

```sh
npx turbo build lint test
```

## AI Workflow

Use this sequence for AI-assisted implementation:

```text
specify init
/speckit-specify
/speckit-tasks
/speckit-implement
```

Before implementation, read the relevant `AGENTS.md` file for the layer being changed.

## Where Code Belongs

- Shared contracts belong in `packages/types`.
- Mongoose schemas, models, and connection factories belong in `packages/db`.
- Business rules and use cases belong in `packages/core`.
- Express routes and middleware belong in `apps/api`.
- Next.js components, pages, server actions, and API client calls belong in `apps/web`.

During review, reject changes that violate the dependency rule, add business logic to `apps/`, store connection strings, or use relative imports across packages.
