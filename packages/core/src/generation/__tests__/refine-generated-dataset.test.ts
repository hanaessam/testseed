import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import { refineGeneratedDataset } from "../refine-generated-dataset";

const schema: ParsedSchema = {
  collections: [
    {
      name: "User",
      fields: [
        { name: "email", type: "String", required: true, unique: true },
        { name: "role", type: "String", required: true, unique: false, enum: ["member"] }
      ]
    }
  ]
};

const currentDataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "snapshot-1",
  status: "valid",
  generationOrder: ["User"],
  collectionCounts: { User: 1 },
  collections: {
    User: [{ _id: "665f1a000000000000000001", email: "maya@example.com", role: "member" }]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-06-07T00:00:00.000Z"
};

describe("refineGeneratedDataset", () => {
  it("accepts only validated updated datasets", async () => {
    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        currentDataset,
        message: "Use university email domains"
      },
      {
        refineRecords: async () => ({
          mode: "updated_dataset",
          message: "Updated emails.",
          collections: {
            User: [
              {
                _id: "665f1a000000000000000001",
                email: "maya@university.edu",
                role: "member"
              }
            ]
          }
        })
      }
    );

    expect(result.mode).toBe("updated_dataset");
    expect(result.dataset?.collections.User[0].email).toBe("maya@university.edu");
  });

  it("rejects invalid refinements without returning a replacement dataset", async () => {
    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        currentDataset,
        message: "Make everyone an admin",
        maxAttempts: 1
      },
      {
        refineRecords: async () => ({
          mode: "updated_dataset",
          message: "Changed roles.",
          collections: {
            User: [
              {
                _id: "665f1a000000000000000001",
                email: "maya@example.com",
                role: "admin"
              }
            ]
          }
        })
      }
    );

    expect(result.mode).toBe("rejected");
    expect(result.dataset).toBeUndefined();
    expect(result.validationResults).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "ENUM_VALUE_INVALID" })])
    );
  });

  it("supports non-mutating guidance responses", async () => {
    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        currentDataset,
        message: "What can I change?"
      },
      {
        refineRecords: async () => ({
          mode: "guidance",
          message: "You can ask for different emails or names."
        })
      }
    );

    expect(result.mode).toBe("guidance");
    expect(result.dataset).toBeUndefined();
  });
});
