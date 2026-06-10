import type { ParsedSchema } from "@testseed/types";
import { generateSeedData } from "../generate-seed-data";

const schema: ParsedSchema = {
  collections: [
    {
      name: "User",
      fields: [{ name: "email", type: "String", required: true, unique: true }]
    }
  ]
};

describe("generateSeedData", () => {
  it("replaces generated user _id values with non-semantic decimal identifiers", async () => {
    const provider = jest.fn().mockResolvedValue({
      collections: {
        User: [
          { _id: "665f1a000000000000000001", email: "maya@example.com" },
          { _id: "665f1a000000000000000002", email: "hana@example.com" }
        ]
      }
    });

    const result = await generateSeedData(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        collectionCounts: { User: 2 },
        maxAttempts: 1
      },
      {
        generateRecords: provider,
        generateRecordId: ({ recordIndex }) => ["931752408641", "408219736504"][recordIndex] ?? "700000000001"
      }
    );

    expect(result.status).toBe("valid");
    expect(result.collections.User.map((record) => record._id)).toEqual([
      "931752408641",
      "408219736504"
    ]);
    for (const record of result.collections.User) {
      expect(record._id).toMatch(/^\d+$/);
      expect(record._id).not.toMatch(/^[a-f0-9]{24}$/i);
    }
  });

  it("repairs references to decimal user ids", async () => {
    const relationalSchema: ParsedSchema = {
      collections: [
        {
          name: "users",
          fields: [{ name: "email", type: "String", required: true, unique: true }]
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
    const provider = jest.fn().mockResolvedValue({
      collections: {
        users: [{ email: "maya@example.com" }],
        orders: [{ userId: "665f1a000000000000000001", total: 24 }]
      }
    });

    const result = await generateSeedData(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema: relationalSchema,
        collectionCounts: { users: 1, orders: 1 },
        maxAttempts: 1
      },
      {
        generateRecords: provider,
        generateRecordId: () => "593104827650"
      }
    );

    expect(result.status).toBe("valid");
    expect(result.collections.users[0]._id).toBe("593104827650");
    expect(result.collections.orders[0].userId).toBe("593104827650");
  });

  it("retries provider failures before returning valid generated records", async () => {
    const provider = jest
      .fn()
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValueOnce({
        collections: { User: [{ _id: "665f1a000000000000000001", email: "user@example.com" }] }
      });

    const result = await generateSeedData(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        collectionCounts: { User: 1 },
        maxAttempts: 2
      },
      {
        generateRecords: provider,
        now: () => new Date("2026-06-07T00:00:00.000Z")
      }
    );

    expect(provider).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("valid");
  });

  it("includes project context in provider requests", async () => {
    const provider = jest.fn().mockResolvedValue({
      collections: { User: [{ _id: "665f1a000000000000000001", email: "student@university.edu" }] }
    });

    await generateSeedData(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        projectContext: {
          description: "University course platform",
          warnings: [],
          updatedAt: new Date("2026-06-07T00:00:00.000Z")
        },
        collectionCounts: { User: 1 }
      },
      { generateRecords: provider }
    );

    expect(provider).toHaveBeenCalledWith(
      expect.objectContaining({ projectContext: "University course platform" })
    );
  });

  it("normalizes plural collection keys and repairs child references to generated parent ids", async () => {
    const relationalSchema: ParsedSchema = {
      collections: [
        {
          name: "User",
          fields: [{ name: "email", type: "String", required: true, unique: true }]
        },
        {
          name: "Order",
          fields: [
            { name: "user", type: "ObjectId", required: true, unique: false, ref: "User" },
            { name: "total", type: "Number", required: true, unique: false }
          ]
        }
      ]
    };
    const provider = jest.fn().mockResolvedValue({
      collections: {
        users: [{ email: "maya@example.com" }],
        orders: [{ user: "user-1", total: 24 }]
      }
    });

    const result = await generateSeedData(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema: relationalSchema,
        collectionCounts: { User: 1, Order: 1 },
        maxAttempts: 1
      },
      { generateRecords: provider }
    );

    expect(result.status).toBe("valid");
    expect(result.collections.Order[0].user).toBe(result.collections.User[0]._id);
  });

  it("pads missing provider collections and fills required schema fields with safe values", async () => {
    const appSchema: ParsedSchema = {
      collections: [
        {
          name: "project_snapshots",
          fields: [
            { name: "source", type: "String", required: true, unique: false, enum: ["manual", "mongodb"] },
            { name: "version", type: "Number", required: true, unique: false },
            { name: "schema", type: "Object", required: true, unique: false }
          ]
        },
        {
          name: "projects",
          fields: [
            { name: "activeSchemaSnapshotId", type: "ObjectId", required: false, unique: false },
            { name: "warnings", type: "Array", required: true, unique: false }
          ]
        },
        {
          name: "passwordResets",
          fields: [{ name: "email", type: "String", required: true, unique: true }]
        },
        {
          name: "seed_batches",
          fields: [{ name: "status", type: "String", required: true, unique: false }]
        }
      ]
    };
    const provider = jest.fn().mockResolvedValue({
      collections: {
        project_snapshots: [{ schema: {} }, { schema: {} }, { schema: {} }],
        projects: [
          { activeSchemaSnapshotId: "snapshot-1" },
          { activeSchemaSnapshotId: "snapshot-2" },
          { activeSchemaSnapshotId: "snapshot-3" }
        ]
      }
    });

    const result = await generateSeedData(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema: appSchema,
        collectionCounts: {
          project_snapshots: 3,
          projects: 3,
          passwordResets: 3,
          seed_batches: 3
        },
        maxAttempts: 1
      },
      { generateRecords: provider }
    );

    expect(result.status).toBe("valid");
    expect(result.collections.project_snapshots).toHaveLength(3);
    expect(result.collections.project_snapshots[0].source).toBe("manual");
    expect(result.collections.project_snapshots[0].version).toBe(1);
    expect(result.collections.passwordResets).toHaveLength(3);
    expect(result.collections.seed_batches).toHaveLength(3);
    expect(result.collections.projects[0].warnings).toEqual([]);
    expect(result.collections.projects[0].activeSchemaSnapshotId).toMatch(/^[a-f0-9]{24}$/);
  });
});
