import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import {
  applyCellEditToDataset,
  CellEditRejectedError
} from "../apply-cell-edit-to-dataset";
import { getFieldInputKind, isFieldEditable } from "../field-editability";

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

describe("field editability", () => {
  it("marks reference and identifier fields as read-only", () => {
    expect(isFieldEditable("_id")).toBe(false);
    expect(
      isFieldEditable("user", {
        name: "user",
        type: "ObjectId",
        required: true,
        unique: false,
        ref: "User"
      })
    ).toBe(false);
    expect(
      getFieldInputKind("role", {
        name: "role",
        type: "String",
        required: true,
        unique: false,
        enum: ["admin", "member"]
      })
    ).toBe("enum");
  });
});

describe("applyCellEditToDataset", () => {
  it("updates a scalar field and keeps the dataset valid", () => {
    const result = applyCellEditToDataset({
      dataset: dataset(),
      schema,
      collectionCounts: { User: 1, Order: 1 },
      edit: {
        collectionName: "User",
        recordId: "665f1a000000000000000001",
        fieldName: "email",
        rawValue: "updated@example.com"
      }
    });

    expect(result.collections.User?.[0]?.email).toBe("updated@example.com");
    expect(result.status).toBe("valid");
    expect(result.validationResults).toEqual([]);
  });

  it("rejects edits on reference fields", () => {
    expect(() =>
      applyCellEditToDataset({
        dataset: dataset(),
        schema,
        collectionCounts: { User: 1, Order: 1 },
        edit: {
          collectionName: "Order",
          recordId: "665f1a000000000000000101",
          fieldName: "user",
          rawValue: "665f1a000000000000000099"
        }
      })
    ).toThrow(CellEditRejectedError);
  });

  it("rejects enum values outside the allowed list before mutation", () => {
    expect(() =>
      applyCellEditToDataset({
        dataset: dataset(),
        schema,
        collectionCounts: { User: 1, Order: 1 },
        edit: {
          collectionName: "User",
          recordId: "665f1a000000000000000001",
          fieldName: "role",
          rawValue: "owner"
        }
      })
    ).toThrow(CellEditRejectedError);
  });

  it("flags duplicate unique values across rows", () => {
    const editableDataset = dataset({
      collectionCounts: { User: 2, Order: 1 },
      collections: {
        User: [
          {
            _id: "665f1a000000000000000001",
            email: "a@example.com",
            role: "member"
          },
          {
            _id: "665f1a000000000000000002",
            email: "b@example.com",
            role: "admin"
          }
        ],
        Order: [
          {
            _id: "665f1a000000000000000101",
            user: "665f1a000000000000000001",
            total: 40
          }
        ]
      }
    });

    const result = applyCellEditToDataset({
      dataset: editableDataset,
      schema,
      collectionCounts: { User: 2, Order: 1 },
      edit: {
        collectionName: "User",
        recordId: "665f1a000000000000000002",
        fieldName: "email",
        rawValue: "a@example.com"
      }
    });

    expect(result.status).toBe("invalid");
    expect(result.validationResults.filter((entry) => entry.code === "UNIQUE_VALUE_DUPLICATE")).toHaveLength(
      2
    );
  });
});
