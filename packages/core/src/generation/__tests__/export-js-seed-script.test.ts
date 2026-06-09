import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import { ExportJsSeedScriptError, exportJsSeedScript } from "../export-js-seed-script";

const userId = "64f000000000000000000001";
const orderId = "64f000000000000000000002";
const missingUserId = "64f000000000000000000099";

const schema: ParsedSchema = {
  collections: [
    {
      name: "users",
      fields: [
        { name: "email", type: "String", required: true, unique: true },
        { name: "role", type: "String", required: true, unique: false, enum: ["admin", "member"] }
      ]
    },
    {
      name: "orders",
      fields: [
        { name: "userId", type: "ObjectId", required: true, unique: false, ref: "users" },
        { name: "total", type: "Number", required: true, unique: false }
      ]
    }
  ]
};

function validDataset(overrides: Partial<GeneratedDataset> = {}): GeneratedDataset {
  return {
    projectId: "project-1",
    schemaSnapshotId: "schema-1",
    status: "valid",
    generationOrder: ["users", "orders"],
    collectionCounts: {
      users: 1,
      orders: 1
    },
    collections: {
      users: [
        {
          _id: userId,
          email: "ada@example.com",
          role: "admin"
        }
      ],
      orders: [
        {
          _id: orderId,
          userId,
          total: 42
        }
      ]
    },
    validationResults: [],
    warnings: [],
    createdAt: "2026-06-09T00:00:00.000Z",
    ...overrides
  };
}

describe("exportJsSeedScript", () => {
  it("renders a ready-to-run CommonJS MongoDB seed script", () => {
    const result = exportJsSeedScript({ schema, dataset: validDataset() });

    expect(result.script).toContain('const { MongoClient, ObjectId } = require("mongodb");');
    expect(result.script).toContain("async function main()");
    expect(result.script).toContain("await client.connect();");
    expect(result.script).toContain('await db.collection("users").insertMany(users);');
    expect(result.script).toContain('await db.collection("orders").insertMany(orders);');
    expect(result.script).toContain("finally");
    expect(result.script).toContain("await client.close();");
    expect(result.script).toContain("Install dependency");
    expect(result.script).toContain("This insert-only script appends generated records to the target database.");
  });

  it("includes MONGODB_URI comments and runtime guard", () => {
    const result = exportJsSeedScript({ schema, dataset: validDataset() });

    expect(result.script).toContain("MONGODB_URI");
    expect(result.script).toContain("process.env.MONGODB_URI");
    expect(result.script).toContain('throw new Error("Set MONGODB_URI before running this seed script.");');
  });

  it("renders _id and ObjectId reference fields as ObjectId expressions", () => {
    const result = exportJsSeedScript({ schema, dataset: validDataset() });

    expect(result.script).toContain(`_id: ObjectId("${userId}")`);
    expect(result.script).toContain(`_id: ObjectId("${orderId}")`);
    expect(result.script).toContain(`userId: ObjectId("${userId}")`);
    expect(result.script).not.toContain(`userId: "${userId}"`);
  });

  it("produces byte-for-byte deterministic output for identical input", () => {
    const first = exportJsSeedScript({ schema, dataset: validDataset() });
    const second = exportJsSeedScript({ schema, dataset: validDataset() });

    expect(second.script).toBe(first.script);
  });

  it("inserts parent collections before child collections according to schema dependency order", () => {
    const result = exportJsSeedScript({
      schema,
      dataset: validDataset({
        generationOrder: ["orders", "users"]
      })
    });

    expect(result.script.indexOf('await db.collection("users").insertMany(users);')).toBeLessThan(
      result.script.indexOf('await db.collection("orders").insertMany(orders);')
    );
  });

  it("returns orderedCollections matching validated dependency order", () => {
    const result = exportJsSeedScript({
      schema,
      dataset: validDataset({
        generationOrder: ["orders", "users"]
      })
    });

    expect(result.orderedCollections).toEqual(["users", "orders"]);
  });

  it("does not require dataset.generationOrder when schema can determine dependency order", () => {
    const dataset = validDataset({
      generationOrder: []
    });

    const result = exportJsSeedScript({ schema, dataset });

    expect(result.orderedCollections).toEqual(["users", "orders"]);
  });

  it("blocks datasets with unresolved references", () => {
    const dataset = validDataset({
      collections: {
        users: [{ _id: userId, email: "ada@example.com", role: "admin" }],
        orders: [{ _id: orderId, userId: missingUserId, total: 42 }]
      }
    });

    expect(() => exportJsSeedScript({ schema, dataset })).toThrow(ExportJsSeedScriptError);

    try {
      exportJsSeedScript({ schema, dataset });
    } catch (error) {
      expect(error).toBeInstanceOf(ExportJsSeedScriptError);
      expect((error as ExportJsSeedScriptError).code).toBe("SCRIPT_EXPORT_UNRESOLVED_REFERENCE");
      expect((error as ExportJsSeedScriptError).validationResults).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "REFERENCE_NOT_FOUND" })])
      );
    }
  });

  it("blocks non-reference validation errors", () => {
    const dataset = validDataset({
      collections: {
        users: [{ _id: userId, email: "ada@example.com", role: "owner" }],
        orders: [{ _id: orderId, userId, total: 42 }]
      }
    });

    try {
      exportJsSeedScript({ schema, dataset });
    } catch (error) {
      expect(error).toBeInstanceOf(ExportJsSeedScriptError);
      expect((error as ExportJsSeedScriptError).code).toBe("SCRIPT_EXPORT_VALIDATION_FAILED");
      expect((error as ExportJsSeedScriptError).validationResults).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "ENUM_VALUE_INVALID" })])
      );
      return;
    }

    throw new Error("Expected export to fail validation.");
  });

  it("blocks missing or empty datasets", () => {
    const dataset = validDataset({
      collectionCounts: { users: 0, orders: 0 },
      collections: {
        users: [],
        orders: []
      }
    });

    try {
      exportJsSeedScript({ schema, dataset });
    } catch (error) {
      expect(error).toBeInstanceOf(ExportJsSeedScriptError);
      expect((error as ExportJsSeedScriptError).code).toBe("SCRIPT_EXPORT_DATASET_EMPTY");
      return;
    }

    throw new Error("Expected export to reject empty dataset.");
  });
});
