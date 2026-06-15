import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import {
  datasetUsesMongoObjectIds,
  isMongoObjectIdString,
  prepareDatasetIdsForInsertion
} from "../prepare-dataset-ids-for-insertion";

const schema: ParsedSchema = {
  collections: [
    {
      name: "users",
      fields: [{ name: "email", type: "String", required: true, unique: false }]
    }
  ]
};

const objectIdDataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "schema-1",
  status: "valid",
  generationOrder: ["users"],
  collectionCounts: { users: 1 },
  collections: {
    users: [{ _id: "605c72f1c26f493d0b92f1a7", email: "ada@example.com" }]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-06-09T00:00:00.000Z"
};

describe("prepareDatasetIdsForInsertion", () => {
  it("keeps preview ids when they are valid MongoDB ObjectIds", () => {
    expect(isMongoObjectIdString("605c72f1c26f493d0b92f1a7")).toBe(true);
    expect(datasetUsesMongoObjectIds(objectIdDataset)).toBe(true);
    expect(prepareDatasetIdsForInsertion(objectIdDataset, schema)).toEqual(objectIdDataset);
  });

  it("remaps decimal preview ids before insertion", () => {
    const decimalDataset: GeneratedDataset = {
      ...objectIdDataset,
      collections: {
        users: [{ _id: "123456789012", email: "ada@example.com" }]
      }
    };

    const prepared = prepareDatasetIdsForInsertion(decimalDataset, schema, {
      generateId: () => "605c72f1c26f493d0b92f1a8"
    });

    expect(prepared.collections.users[0]._id).toBe("605c72f1c26f493d0b92f1a8");
    expect(decimalDataset.collections.users[0]._id).toBe("123456789012");
  });
});
