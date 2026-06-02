# Dashboard, Projects, and Session Workflow

## Feature Goal

The dashboard should show the user who they are, which projects belong to them, and what history exists for each project. When the user is already logged in, the app should keep that session alive in local storage for a limited time so they do not have to sign in again on every reload.

## Runtime Flow

1. The user logs in or completes GitHub sign-in.
2. The client stores the access token and an expiration timestamp in local storage.
3. The app loads the current user session from local storage on startup.
4. The dashboard fetches account information, project summaries, and recent history for the authenticated user.
5. The sidebar or header shows the user’s account info and a visible sign-out action.
6. Each project card or table row can expand into history entries such as schema parses, chat feedback, generation runs, seed batch records, and rollbacks.
7. If the token is expired, the session is cleared and the user is sent back to login.

## Data Concepts

- `Session`: a client-side token plus expiry metadata used to keep the user logged in for a limited time.
- `Account Info`: display-only user details such as email, account status, and authenticated identity.
- `Project Summary`: a compact project record for the dashboard list.
- `Project History`: a chronological activity feed attached to a project.

## Storage Rules

- Keep the token in local storage only for the approved session window.
- Store an explicit expiration time alongside the token so the client can clear stale sessions.
- Never persist raw MongoDB connection strings as part of the dashboard session.
- The dashboard should not infer ownership from UI state alone; it must use authenticated API responses.

## UI Rules

- Show the current user’s account info in the dashboard chrome.
- Show project cards or rows in the main dashboard area.
- Show project history as an expandable section or adjacent detail panel.
- Show a clear empty state when the user has no projects yet.
- Keep logout visible so users can terminate the local session immediately.

## API / Client Boundary

- The API returns authenticated user identity, projects, and history records.
- The client stores session state and decides when the token is too old to trust.
- The dashboard page renders only what the authenticated API returns.
- Local storage is a convenience cache for the token and expiry, not the source of truth for authorization.

## What Agents Should Look For

- A login flow that stores the token but no expiry metadata.
- A dashboard that renders placeholder metrics instead of real project data.
- A shell component that shows a generic user label instead of real account info.
- Missing history data in the dashboard API or client fetch logic.
- Session handling that does not clear expired credentials on startup.
