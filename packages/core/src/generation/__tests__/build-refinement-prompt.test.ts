import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import {
  REFINEMENT_SYSTEM_PROMPT,
  buildRefinementUserPromptContent
} from "../build-refinement-prompt";

const schema: ParsedSchema = {
  collections: [
    {
      name: "User",
      fields: [
        { name: "email", type: "String", required: true, unique: true },
        { name: "country", type: "String", required: false, unique: false }
      ]
    }
  ]
};

const currentDataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "snapshot-1",
  status: "valid",
  generationOrder: ["User"],
  collectionCounts: { User: 2 },
  collections: {
    User: [
      { _id: "665f1a000000000000000001", email: "a@example.com", country: "US" },
      { _id: "665f1a000000000000000002", email: "b@example.com", country: "US" }
    ]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-06-07T00:00:00.000Z"
};

describe("build-refinement-prompt", () => {
  it("includes preservation constraints and full dataset context", () => {
    const payload = JSON.parse(
      buildRefinementUserPromptContent({
        schema,
        currentDataset,
        message: "Make users Canadian",
        projectContext: "Canadian marketplace app",
        repositoryContext: "E-commerce monorepo"
      })
    );

    expect(payload.task).toBe("refine_seed_dataset");
    expect(payload.instruction).toBe("Make users Canadian");
    expect(payload.projectContext).toBe("Canadian marketplace app");
    expect(payload.repositoryContext).toBe("E-commerce monorepo");
    expect(payload.constraints.preserveRecordIds).toBe(true);
    expect(payload.constraints.collectionCounts).toEqual({ User: 2 });
    expect(payload.currentDataset.collections.User).toHaveLength(2);
  });

  it("omits empty optional context fields", () => {
    const payload = JSON.parse(
      buildRefinementUserPromptContent({
        schema,
        currentDataset,
        message: "Use university.edu emails"
      })
    );

    expect(payload.projectContext).toBeUndefined();
    expect(payload.repositoryContext).toBeUndefined();
    expect(payload.validationFeedback).toBeUndefined();
  });

  it("documents mutation and guidance modes in the system prompt", () => {
    expect(REFINEMENT_SYSTEM_PROMPT).toContain('mode: "updated_dataset"');
    expect(REFINEMENT_SYSTEM_PROMPT).toContain('mode: "guidance"');
    expect(REFINEMENT_SYSTEM_PROMPT).toContain("Minimal edits");
    expect(REFINEMENT_SYSTEM_PROMPT).toContain("Preserve record identity");
  });
});
