import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import { validateGeneratedDataset } from "../validate-generated-dataset";

const schema: ParsedSchema = {
  collections: [
    {
      name: "User",
      fields: [
        { name: "email", type: "String", required: true, unique: true },
        {
          name: "role",
          type: "String",
          required: true,
          unique: false,
          enum: ["admin", "member"]
        }
      ]
    },
    {
      name: "Order",
      fields: [
        {
          name: "user",
          type: "ObjectId",
          required: true,
          unique: false,
          ref: "User"
        },
        { name: "total", type: "Number", required: true, unique: false }
      ]
    }
  ]
};

function dataset(overrides: Partial<GeneratedDataset> = {}): GeneratedDataset {
  return {
    projectId: "project-1",
    schemaSnapshotId: "snapshot-1",
    status: "valid",
    generationOrder: ["User", "Order"],
    collectionCounts: { User: 1, Order: 1 },
    collections: {
      User: [
        {
          _id: "665f1a000000000000000001",
          email: "a@example.com",
          role: "member"
        }
      ],
      Order: [
        {
          _id: "665f1a000000000000000101",
          user: "665f1a000000000000000001",
          total: 40
        }
      ]
    },
    validationResults: [],
    warnings: [],
    createdAt: "2026-06-07T00:00:00.000Z",
    ...overrides
  };
}

describe("validateGeneratedDataset", () => {
  it("accepts records that satisfy required fields, enums, types, uniqueness, and references", () => {
    const result = validateGeneratedDataset({
      dataset: dataset(),
      schema,
      collectionCounts: { User: 1, Order: 1 }
    });

    expect(result.status).toBe("valid");
    expect(result.validationResults).toEqual([]);
  });

  it("rejects unresolved references", () => {
    const result = validateGeneratedDataset({
      dataset: dataset({
        collections: {
          User: [{ _id: "665f1a000000000000000001", email: "a@example.com", role: "member" }],
          Order: [{ _id: "665f1a000000000000000101", user: "665f1a000000000000000999", total: 40 }]
        }
      }),
      schema,
      collectionCounts: { User: 1, Order: 1 }
    });

    expect(result.validationResults).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "REFERENCE_NOT_FOUND" })])
    );
  });

  it("rejects duplicate unique values and invalid enum values", () => {
    const result = validateGeneratedDataset({
      dataset: dataset({
        collectionCounts: { User: 2, Order: 0 },
        collections: {
          User: [
            { _id: "665f1a000000000000000001", email: "a@example.com", role: "owner" },
            { _id: "665f1a000000000000000002", email: "a@example.com", role: "member" }
          ],
          Order: []
        }
      }),
      schema,
      collectionCounts: { User: 2, Order: 0 }
    });

    expect(result.validationResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNIQUE_VALUE_DUPLICATE" }),
        expect.objectContaining({ code: "ENUM_VALUE_INVALID" })
      ])
    );
  });
});
