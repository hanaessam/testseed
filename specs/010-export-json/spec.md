# Feature Specification: Export Generated Data as JSON

**Feature Branch**: `011-export-json`

**Created**: 2026-06-09

**Status**: Shipped

**Input**: User description: "Feature: Export Generated Data as JSON. As a developer, I want to export generated data as JSON so I can use it manually. Acceptance Criteria: The user can download JSON grouped by collection. The user can copy JSON grouped by collection. The JSON includes valid records and references. If records are invalid, the system blocks export and shows validation errors. Important: Before creating implementation tasks, analyze the latest code and determine whether this feature is already implemented. If it is already implemented, the spec should document the existing behavior and recommend marking the sheet row Completed. Do not modify export implementation unless a real gap exists. Do not modify feedback regeneration, direct seeding, rollback, or preview editing."

## Existing Behavior Assessment

Latest code analysis indicates this feature is already implemented for generated dataset previews. The product already lets a developer open a JSON export surface, download grouped JSON, copy grouped JSON, and prevents export when the active dataset has blocking validation errors. The sheet row should be marked **Completed** unless the team requires JSON export to be enabled by default in every deployment environment.

This specification documents the existing behavior and intentionally avoids new implementation scope unless a real regression or product gap is later discovered.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export Valid Dataset JSON (Priority: P1)

As a developer with a valid generated dataset, I can export the records as JSON grouped by collection so I can use the seed data manually outside TestSeed.

**Why this priority**: This is the primary value of the feature: generated data must be portable for manual use.

**Independent Test**: Can be tested by opening a valid generated dataset and confirming both download and copy actions provide JSON grouped by collection.

**Acceptance Scenarios**:

1. **Given** a generated dataset with valid records and references, **When** the developer chooses to download JSON, **Then** the downloaded content contains the dataset records grouped by collection.
2. **Given** a generated dataset with valid records and references, **When** the developer chooses to copy JSON, **Then** the copied content contains the dataset records grouped by collection.
3. **Given** exported JSON from a valid dataset, **When** the developer inspects the content, **Then** the records and references shown in the preview are preserved in the exported grouped JSON.

---

### User Story 2 - Block Invalid Dataset Export (Priority: P1)

As a developer viewing a dataset with validation errors, I am prevented from exporting it until the blocking issues are fixed so I do not accidentally use invalid seed data.

**Why this priority**: Exporting invalid records would undermine trust in generated data and could create manual cleanup work.

**Independent Test**: Can be tested by creating or loading a dataset with a blocking validation error and confirming export actions are unavailable while validation errors are visible.

**Acceptance Scenarios**:

1. **Given** a generated dataset with one or more blocking validation errors, **When** the developer opens the export surface, **Then** the download and copy actions are blocked.
2. **Given** export is blocked by validation errors, **When** the developer reviews the workbench, **Then** the validation errors are shown clearly enough to identify what must be fixed before export.

---

### Edge Cases

- If no dataset exists, export actions remain unavailable.
- If the dataset exists but is not currently valid, export actions remain unavailable.
- If the dataset has non-blocking warnings only, export remains available because the records are still valid.
- If the export surface is disabled by product configuration for a deployment, the feature is not user-visible in that environment even though the behavior exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a JSON export option for the active generated dataset when JSON export is enabled for the workbench.
- **FR-002**: Users MUST be able to download JSON grouped by collection for a valid generated dataset.
- **FR-003**: Users MUST be able to copy JSON grouped by collection for a valid generated dataset.
- **FR-004**: Exported JSON MUST include the same valid records and references represented in the active generated dataset preview.
- **FR-005**: The system MUST block JSON export when the active dataset is missing, invalid, or has blocking validation errors.
- **FR-006**: When JSON export is blocked due to invalid records, the system MUST show validation errors so the developer can understand why export is unavailable.
- **FR-007**: This feature MUST NOT change feedback regeneration, direct seeding, rollback, or preview editing behavior unless a direct export regression is found.
- **FR-008**: If no real product gap is found in the latest code, planning should recommend no export implementation changes and should mark the sheet row Completed.

### Key Entities

- **Generated Dataset**: The active preview data the developer intends to export, including grouped collections, records, references, validation status, and validation messages.
- **Collection Group**: A named group of generated records that appears as a top-level grouping in exported JSON.
- **Validation Error**: A blocking issue that prevents the dataset from being safely exported until fixed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can export a valid generated dataset as grouped JSON in no more than two user actions after opening the export surface.
- **SC-002**: Copy and download produce equivalent grouped JSON content for the same valid dataset in 100% of manual verification attempts.
- **SC-003**: Invalid datasets are blocked from JSON export in 100% of validation-error scenarios tested.
- **SC-004**: When export is blocked, developers can see at least one relevant validation error without leaving the workbench.
- **SC-005**: No feedback regeneration, direct seeding, rollback, or preview editing behavior changes are required to satisfy this feature.

## Assumptions

- The active generated dataset has already passed through the product's existing validation flow.
- "Grouped by collection" means the exported JSON uses collection names as the top-level grouping for records.
- "Valid records and references" means the active dataset has no blocking validation errors at export time.
- JSON export may remain controlled by deployment configuration; enabling that configuration is an operational decision, not a new implementation requirement.
- Direct seeding, rollback, preview editing, and feedback regeneration are out of scope for this feature.
