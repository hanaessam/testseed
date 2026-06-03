# Dashboard, Projects, and Session Persistence Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this spec task-by-task. This spec defines the user-facing dashboard, project visibility, account summary, and client-side session lifetime behavior.

**Goal:** Make the dashboard show the authenticated user’s account info, projects, and project history, while keeping login sessions alive in local storage for a bounded period.

**Architecture:** The web app remains the presentation layer, but it needs real authenticated data instead of placeholder dashboard metrics. The client owns local session persistence and expiration checks, the API returns the authenticated user, projects, and history, and the dashboard shell consumes that data to render account info plus project and history views. Existing auth flows remain the login source of truth; the dashboard simply reflects the authenticated session.

**Tech Stack:** Next.js, React, TypeScript, localStorage-based client session state, authenticated API requests, existing TestSeed Express API.

---

### 1. Session Model

The client stores two values after login or GitHub callback: the token and an expiration timestamp. The default lifetime is seven days unless the user or product settings change it later. When the app boots, it reads both values; if either is missing or expired, it clears storage and redirects to login.

Recommended stored shape:

```ts
export interface StoredSession {
  token: string;
  expiresAt: string;
}
```

The client should never assume a token is valid just because it exists in local storage. The expiry timestamp is the gate for rehydrating the session.

### 2. Dashboard Data Model

The dashboard needs three kinds of data:

```ts
export interface DashboardAccount {
  id: string;
  email: string;
  createdAt: string;
}

export interface DashboardProjectSummary {
  id: string;
  name: string;
  description?: string;
  activeSchemaVersion: number;
  updatedAt: string;
  historyCount: number;
}

export interface DashboardProjectHistoryEntry {
  id: string;
  projectId: string;
  kind: string;
  message: string;
  createdAt: string;
}
```

The dashboard should render the account first, then the project list, then the history for the selected project or the most recent history block.

### 3. Component Boundaries

- `api-client.ts`: owns token-aware requests and session helpers.
- `AuthCard`: stores the session after login and GitHub callback.
- `AppShell`: shows the authenticated user info and logout action.
- `DashboardPage`: loads account and project data and renders summaries/history.
- `LogoutButton`: clears the stored session and returns the user to login.

These pieces should stay small and separate. The dashboard should not duplicate session parsing logic in multiple components.

### 4. Data Flow

1. Login returns a token and user payload.
2. The client stores the token and `expiresAt` in local storage.
3. The dashboard bootstraps by reading the stored session.
4. If the session is expired, the client clears storage and redirects to login.
5. If the session is valid, the dashboard fetches account data and project history from authenticated endpoints.
6. The shell shows the user’s email or account label and the project list/history in the main area.

### 5. Error Handling

- If storage is empty, treat the user as logged out.
- If the token is expired, clear storage immediately and redirect to login.
- If the API returns 401, clear storage and redirect to login.
- If project/history fetches fail, show a dashboard error state instead of blank placeholders.
- If a user has no projects, show an empty state that explains how to create the first project.

### 6. Testing

The implementation should be validated with tests that cover:

- storing token plus expiration after login and GitHub callback;
- clearing expired sessions on startup;
- rendering account info in the dashboard shell;
- fetching and displaying projects/history for the authenticated user;
- clearing the session on logout;
- showing an empty state when no projects exist.

Suggested test targets:

- `apps/web/components/auth/auth-card.tsx`
- `apps/web/components/auth/github-callback.tsx`
- `apps/web/components/layout/app-shell.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/src/lib/api-client.ts`
