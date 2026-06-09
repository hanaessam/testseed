import type { PendingRegenerationCandidate } from "@/src/lib/generation-workbench-state";

const reviewableCandidate: PendingRegenerationCandidate = {
  dataset: {
    projectId: "project-1",
    schemaSnapshotId: "snapshot-1",
    status: "valid",
    generationOrder: ["User"],
    collectionCounts: { User: 1 },
    collections: {
      User: [{ _id: "665f1a000000000000000001", email: "hana@example.com" }]
    },
    validationResults: [],
    warnings: [],
    createdAt: "2026-06-09T00:00:00.000Z"
  },
  message: "Candidate ready for review.",
  validationResults: [],
  warnings: [],
  chatHistory: [
    { role: "user", content: "Use realistic emails" },
    { role: "assistant", content: "Candidate ready for review." }
  ],
  candidateReview: {
    state: "pending_review",
    retryAttempt: 0,
    changeSummary: {
      status: "changed",
      collectionsChanged: ["User"],
      notableFieldsChanged: [{ collectionName: "User", fieldName: "email", count: 1 }],
      preservedCollections: [],
      appliedFeedbackSummary: "Updated emails.",
      noMeaningfulChanges: false
    }
  }
};

void reviewableCandidate;
