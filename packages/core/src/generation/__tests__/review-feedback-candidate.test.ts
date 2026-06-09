import type { GeneratedDataset, GenerationValidationResult } from "@testseed/types";
import {
  buildCandidateChangeSummary,
  canAcceptCandidate,
  resolveCandidateReviewState
} from "../review-feedback-candidate";

const acceptedDataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "snapshot-1",
  status: "valid",
  generationOrder: ["User", "Order"],
  collectionCounts: { User: 2, Order: 1 },
  collections: {
    User: [
      { _id: "665f1a000000000000000001", email: "maya@example.com", country: "US" },
      { _id: "665f1a000000000000000002", email: "hana@example.com", country: "US" }
    ],
    Order: [{ _id: "665f1a000000000000000010", userId: "665f1a000000000000000001" }]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-06-07T00:00:00.000Z"
};

describe("review feedback candidate helpers", () => {
  it("summarizes changed collections, notable fields, and preserved collections", () => {
    const candidate: GeneratedDataset = {
      ...acceptedDataset,
      collections: {
        ...acceptedDataset.collections,
        User: acceptedDataset.collections.User.map((record) => ({
          ...record,
          country: "CA"
        }))
      }
    };

    const summary = buildCandidateChangeSummary({
      acceptedDataset,
      candidateDataset: candidate,
      mode: "accepted",
      message: "Updated users to Canadian examples.",
      validationResults: []
    });

    expect(summary.status).toBe("changed");
    expect(summary.collectionsChanged).toEqual(["User"]);
    expect(summary.preservedCollections).toEqual(["Order"]);
    expect(summary.notableFieldsChanged).toEqual([
      { collectionName: "User", fieldName: "country", count: 2 }
    ]);
    expect(summary.noMeaningfulChanges).toBe(false);
  });

  it("reports no meaningful changes when candidate records match accepted records", () => {
    const summary = buildCandidateChangeSummary({
      acceptedDataset,
      candidateDataset: acceptedDataset,
      mode: "accepted",
      message: "",
      validationResults: []
    });

    expect(summary.status).toBe("unchanged");
    expect(summary.collectionsChanged).toEqual([]);
    expect(summary.noMeaningfulChanges).toBe(true);
    expect(summary.appliedFeedbackSummary).toContain("No meaningful changes");
  });

  it("marks partial and invalid candidate summaries", () => {
    const validationResults: GenerationValidationResult[] = [
      {
        severity: "error",
        collectionName: "User",
        fieldName: "email",
        code: "UNIQUE_VALUE_DUPLICATE",
        message: "User.email duplicates another generated value."
      }
    ];

    const partial = buildCandidateChangeSummary({
      acceptedDataset,
      candidateDataset: acceptedDataset,
      mode: "partial",
      message: "Skipped duplicate email changes.",
      validationResults: []
    });
    const invalid = buildCandidateChangeSummary({
      acceptedDataset,
      candidateDataset: acceptedDataset,
      mode: "rejected",
      message: "Could not apply feedback.",
      validationResults
    });

    expect(partial.status).toBe("partial");
    expect(partial.skippedFeedbackSummary).toContain("Skipped duplicate email changes.");
    expect(invalid.status).toBe("invalid");
    expect(invalid.skippedFeedbackSummary).toContain("User.email duplicates another generated value.");
  });

  it("blocks acceptance when validation has errors", () => {
    expect(canAcceptCandidate([])).toBe(true);
    expect(
      canAcceptCandidate([
        {
          severity: "error",
          code: "REFERENCE_NOT_FOUND",
          message: "Order.userId must reference an existing User record."
        }
      ])
    ).toBe(false);
  });

  it("resolves review state transitions", () => {
    expect(resolveCandidateReviewState({ mode: "accepted", validationResults: [] })).toBe("pending_review");
    expect(
      resolveCandidateReviewState({
        mode: "accepted",
        validationResults: [{ severity: "error", code: "FIELD_TYPE_INVALID", message: "Invalid" }]
      })
    ).toBe("invalid");
    expect(resolveCandidateReviewState({ mode: "rejected", validationResults: [] })).toBe("rejected");
    expect(
      resolveCandidateReviewState({
        mode: "rejected",
        validationResults: [{ severity: "error", code: "REFERENCE_NOT_FOUND", message: "Invalid" }],
        retryAttempt: 1
      })
    ).toBe("awaiting_revised_feedback");
  });
});
