import type { GeneratedDataset, Project, SavedGeneratedDataset } from "@testseed/types";
import { forkSavedGeneratedDataset } from "../fork-saved-generated-dataset";

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

const parentDataset: SavedGeneratedDataset = {
  ...validDataset,
  id: "saved-1",
  source: "generation",
  chatHistory: []
};

describe("forkSavedGeneratedDataset", () => {
  it("creates a new version linked to the parent dataset", async () => {
    const forkedDataset: GeneratedDataset = {
      ...validDataset,
      collections: {
        users: [{ _id: "665f1a000000000000000001", email: "updated@example.com" }]
      }
    };

    const saved = await forkSavedGeneratedDataset(
      {
        projectId: "project-1",
        parentDatasetId: "saved-1",
        ownerId: "user-1",
        dataset: forkedDataset,
        versionLabel: "Manual edits"
      },
      {
        findProjectById: async () => project,
        findGeneratedDatasetById: async () => parentDataset,
        createGeneratedDatasetRecord: async (input) => ({
          ...forkedDataset,
          id: "saved-2",
          source: input.source,
          chatHistory: input.chatHistory,
          parentDatasetId: input.parentDatasetId,
          versionLabel: input.versionLabel
        }),
        appendProjectEvent: async () => undefined
      }
    );

    expect(saved.id).toBe("saved-2");
    expect(saved.parentDatasetId).toBe("saved-1");
    expect(saved.versionLabel).toBe("Manual edits");
  });
});
