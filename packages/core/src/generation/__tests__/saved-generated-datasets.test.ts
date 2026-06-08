import type { GeneratedDataset, Project, SavedGeneratedDataset } from "@testseed/types";
import { getSavedGeneratedDataset } from "../get-saved-generated-dataset";
import { listSavedGeneratedDatasets } from "../list-saved-generated-datasets";
import { saveGeneratedDataset } from "../save-generated-dataset";

const project: Project = {
  id: "project-1",
  ownerId: "user-1",
  name: "Demo",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  activeSchemaVersion: 1,
  activeSchemaSnapshotId: "snapshot-1"
};

const dataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "snapshot-1",
  status: "valid",
  generationOrder: ["users"],
  collectionCounts: { users: 2 },
  collections: {
    users: [
      { _id: "1", email: "a@example.com" },
      { _id: "2", email: "b@example.com" }
    ]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-01-01T00:00:00.000Z"
};

describe("saved generated datasets", () => {
  it("saves a dataset snapshot for an owned project", async () => {
    let appendedPayload: Record<string, unknown> | undefined;

    const saved = await saveGeneratedDataset(
      {
        projectId: "project-1",
        ownerId: "user-1",
        dataset,
        source: "generation"
      },
      {
        findProjectById: async () => project,
        createGeneratedDatasetRecord: async (input) => ({
          id: "saved-1",
          source: input.source,
          projectId: input.projectId,
          schemaSnapshotId: input.schemaSnapshotId,
          status: input.status,
          generationOrder: input.generationOrder,
          collectionCounts: input.collectionCounts,
          collections: input.collections,
          validationResults: input.validationResults,
          warnings: input.warnings,
          chatHistory: input.chatHistory,
          createdAt: input.createdAt.toISOString()
        }),
        appendProjectEvent: async (input) => {
          appendedPayload = input.payload;
        }
      }
    );

    expect(saved.id).toBe("saved-1");
    expect(appendedPayload?.savedDatasetId).toBe("saved-1");
  });

  it("lists saved dataset summaries for an owned project", async () => {
    const summaries = await listSavedGeneratedDatasets(
      { projectId: "project-1", ownerId: "user-1" },
      {
        findProjectById: async () => project,
        listGeneratedDatasetSummaries: async () => [
          {
            id: "saved-1",
            projectId: "project-1",
            schemaSnapshotId: "snapshot-1",
            status: "valid",
            source: "generation",
            collectionCounts: { users: 2 },
            totalRecords: 2,
            chatMessageCount: 3,
            createdAt: "2026-01-01T00:00:00.000Z"
          }
        ]
      }
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.totalRecords).toBe(2);
    expect(summaries[0]?.chatMessageCount).toBe(3);
  });

  it("loads a saved dataset by id", async () => {
    const savedDataset: SavedGeneratedDataset = {
      id: "saved-1",
      source: "generation",
      chatHistory: [{ role: "user", content: "Make emails Canadian" }],
      ...dataset
    };

    const result = await getSavedGeneratedDataset(
      { projectId: "project-1", datasetId: "saved-1", ownerId: "user-1" },
      {
        findProjectById: async () => project,
        findGeneratedDatasetById: async () => savedDataset
      }
    );

    expect(result.id).toBe("saved-1");
    expect(result.collections.users).toHaveLength(2);
  });
});
