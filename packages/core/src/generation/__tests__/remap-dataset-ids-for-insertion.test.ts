import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import { remapDatasetIdsForInsertion } from "../remap-dataset-ids-for-insertion";

const schema: ParsedSchema = {
  collections: [
    {
      name: "categories",
      fields: [{ name: "name", type: "String", required: true, unique: false }]
    },
    {
      name: "subcategories",
      fields: [
        { name: "name", type: "String", required: true, unique: false },
        { name: "categoryId", type: "ObjectId", required: true, unique: false, ref: "categories" }
      ]
    }
  ]
};

const dataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "schema-1",
  status: "valid",
  generationOrder: ["categories", "subcategories"],
  collectionCounts: { categories: 1, subcategories: 1 },
  collections: {
    categories: [{ _id: "605c72f1c26f493d0b92f1a7", name: "Skincare" }],
    subcategories: [
      { _id: "605c72f1c26f493d0b92f1a8", name: "Serums", categoryId: "605c72f1c26f493d0b92f1a7" }
    ]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-06-09T00:00:00.000Z"
};

describe("remapDatasetIdsForInsertion", () => {
  it("assigns fresh ids and remaps references in generation order", () => {
    let idIndex = 0;
    const ids = ["aaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbb"];
    const remapped = remapDatasetIdsForInsertion(dataset, schema, {
      generateId: () => ids[idIndex++] ?? "cccccccccccccccccccccccc"
    });

    expect(remapped.collections.categories[0]._id).toBe("aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(remapped.collections.subcategories[0]._id).toBe("bbbbbbbbbbbbbbbbbbbbbbbb");
    expect(remapped.collections.subcategories[0].categoryId).toBe("aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(dataset.collections.subcategories[0].categoryId).toBe("605c72f1c26f493d0b92f1a7");
  });
});
