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
  it("retries invalid provider output with validation feedback", async () => {
    const provider = jest
      .fn()
      .mockResolvedValueOnce({ collections: { User: [{ _id: "bad", email: 123 }] } })
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
    expect(provider.mock.calls[1][0].validationFeedback).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "FIELD_TYPE_INVALID" })])
    );
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
});
