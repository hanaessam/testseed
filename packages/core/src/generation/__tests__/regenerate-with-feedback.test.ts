import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import { regenerateWithFeedback } from "../regenerate-with-feedback";

const schema: ParsedSchema = {
  collections: [
    {
      name: "User",
      fields: [{ name: "email", type: "String", required: true, unique: true }]
    }
  ]
};

const acceptedDataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "snapshot-1",
  status: "valid",
  generationOrder: ["User"],
  collectionCounts: { User: 1 },
  collections: {
    User: [{ _id: "665f1a000000000000000001", email: "maya@example.com" }]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-06-07T00:00:00.000Z"
};

describe("regenerateWithFeedback", () => {
  it("maps updated dataset responses to accepted outcomes", async () => {
    const result = await regenerateWithFeedback(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        acceptedDataset,
        feedback: "Use university domains"
      },
      {
        refineRecords: async () => ({
          mode: "updated_dataset",
          message: "Updated emails.",
          collections: {
            User: [{ _id: "665f1a000000000000000001", email: "maya@university.edu" }]
          }
        })
      }
    );

    expect(result.mode).toBe("accepted");
    expect(result.dataset?.collections.User[0].email).toBe("maya@university.edu");
    expect(result.candidateReview?.state).toBe("pending_review");
    expect(result.candidateReview?.changeSummary?.collectionsChanged).toEqual(["User"]);
  });

  it("maps guidance responses to partial outcomes", async () => {
    const result = await regenerateWithFeedback(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        acceptedDataset,
        feedback: "What can I change?"
      },
      {
        refineRecords: async () => ({
          mode: "guidance",
          message: "You can change email domains."
        })
      }
    );

    expect(result.mode).toBe("partial");
    expect(result.dataset).toBeUndefined();
  });

  it("returns cancelled when aborted before execution", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await regenerateWithFeedback(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        acceptedDataset,
        feedback: "Use realistic addresses",
        signal: controller.signal
      },
      {
        refineRecords: async () => ({
          mode: "guidance",
          message: "This should never be reached."
        })
      }
    );

    expect(result.mode).toBe("cancelled");
  });

  it("rejects schema-invalid regenerated output and keeps validation details", async () => {
    const result = await regenerateWithFeedback(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        acceptedDataset,
        feedback: "Use duplicate email values",
        collectionCounts: { User: 2 }
      },
      {
        refineRecords: async () => ({
          mode: "updated_dataset",
          message: "Applied duplicate email values.",
          collections: {
            User: [
              { _id: "665f1a000000000000000001", email: "dup@example.com" },
              { _id: "665f1a000000000000000002", email: "dup@example.com" }
            ]
          }
        })
      }
    );

    expect(result.mode).toBe("rejected");
    expect(result.dataset).toBeUndefined();
    expect(result.validationResults).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "UNIQUE_VALUE_DUPLICATE" })])
    );
    expect(result.candidateReview?.state).toBe("awaiting_revised_feedback");
    expect(result.candidateReview?.retryAttempt).toBe(1);
  });

  it("retries once for duplicate unique values and returns the retried candidate", async () => {
    const refineRecords = jest
      .fn()
      .mockResolvedValueOnce({
        mode: "updated_dataset",
        message: "First attempt duplicated email values.",
        collections: {
          User: [
            { _id: "665f1a000000000000000001", email: "dup@example.com" },
            { _id: "665f1a000000000000000002", email: "dup@example.com" }
          ]
        }
      })
      .mockResolvedValueOnce({
        mode: "updated_dataset",
        message: "Retry fixed duplicate values.",
        collections: {
          User: [
            { _id: "665f1a000000000000000001", email: "maya@university.edu" },
            { _id: "665f1a000000000000000002", email: "hana@university.edu" }
          ]
        }
      });

    const result = await regenerateWithFeedback(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        acceptedDataset,
        feedback: "Use university domains",
        collectionCounts: { User: 2 }
      },
      { refineRecords }
    );

    expect(refineRecords).toHaveBeenCalledTimes(2);
    expect(result.mode).toBe("accepted");
    expect(result.dataset?.collections.User).toHaveLength(2);
    expect(result.candidateReview?.retryAttempt).toBe(0);
  });

  it("returns plain-language partial summary for guidance outcomes", async () => {
    const result = await regenerateWithFeedback(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        acceptedDataset,
        feedback: "Can we improve realism?"
      },
      {
        refineRecords: async () => ({
          mode: "guidance",
          message: ""
        })
      }
    );

    expect(result.mode).toBe("partial");
    expect(result.message).toContain("Partially applied feedback");
  });
});
