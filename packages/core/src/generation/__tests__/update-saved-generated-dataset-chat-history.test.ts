import type { Project, SavedGeneratedDataset } from "@testseed/types";
import { updateSavedGeneratedDatasetChatHistory } from "../update-saved-generated-dataset-chat-history";

const project: Project = {
  id: "project-1",
  ownerId: "user-1",
  name: "Demo",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  activeSchemaVersion: 1,
  activeSchemaSnapshotId: "snapshot-1"
};

describe("updateSavedGeneratedDatasetChatHistory", () => {
  it("updates chat history on an owned saved dataset", async () => {
    const updatedDataset: SavedGeneratedDataset = {
      id: "saved-1",
      source: "generation",
      projectId: "project-1",
      schemaSnapshotId: "snapshot-1",
      status: "valid",
      generationOrder: ["users"],
      collectionCounts: { users: 1 },
      collections: { users: [{ _id: "1", email: "a@example.com" }] },
      validationResults: [],
      warnings: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      chatHistory: [
        { role: "user", content: "Use university emails" },
        { role: "assistant", content: "Updated email domains." }
      ]
    };

    const result = await updateSavedGeneratedDatasetChatHistory(
      {
        projectId: "project-1",
        datasetId: "saved-1",
        ownerId: "user-1",
        chatHistory: updatedDataset.chatHistory
      },
      {
        findProjectById: async () => project,
        updateGeneratedDatasetChatHistory: async () => updatedDataset
      }
    );

    expect(result.chatHistory).toHaveLength(2);
  });
});
