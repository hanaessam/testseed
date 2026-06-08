import type { GeneratedDataset, Project, SavedGeneratedDataset } from "@testseed/types";
import { updateSavedGeneratedDataset } from "../update-saved-generated-dataset";

const project: Project = {
  id: "project-1",
  ownerId: "user-1",
  name: "Demo",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  activeSchemaVersion: 1,
  activeSchemaSnapshotId: "snapshot-1"
};

const validDataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "snapshot-1",
  status: "valid",
  generationOrder: ["users"],
  collectionCounts: { users: 1 },
  collections: {
    users: [{ _id: "665f1a000000000000000001", email: "a@example.com" }]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-01-01T00:00:00.000Z"
};

const savedDataset: SavedGeneratedDataset = {
  ...validDataset,
  id: "saved-1",
  source: "generation",
  chatHistory: []
};

describe("updateSavedGeneratedDataset", () => {
  it("patches a valid dataset for an owned saved run", async () => {
    const updated = await updateSavedGeneratedDataset(
      {
        projectId: "project-1",
        datasetId: "saved-1",
        ownerId: "user-1",
        dataset: validDataset
      },
      {
        findProjectById: async () => project,
        findGeneratedDatasetById: async () => savedDataset,
        updateGeneratedDatasetRecord: async () => ({
          ...savedDataset,
          collections: validDataset.collections
        })
      }
    );

    expect(updated.id).toBe("saved-1");
  });

  it("rejects invalid datasets", async () => {
    await expect(
      updateSavedGeneratedDataset(
        {
          projectId: "project-1",
          datasetId: "saved-1",
          ownerId: "user-1",
          dataset: {
            ...validDataset,
            status: "invalid",
            validationResults: [
              {
                severity: "error",
                code: "ENUM_VALUE_INVALID",
                message: "Invalid enum"
              }
            ]
          }
        },
        {
          findProjectById: async () => project,
          findGeneratedDatasetById: async () => savedDataset,
          updateGeneratedDatasetRecord: async () => savedDataset
        }
      )
    ).rejects.toThrow("Only valid datasets can be saved.");
  });
});
