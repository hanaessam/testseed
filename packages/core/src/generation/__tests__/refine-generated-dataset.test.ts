import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import { refineGeneratedDataset } from "../refine-generated-dataset";

const schema: ParsedSchema = {
  collections: [
    {
      name: "User",
      fields: [
        { name: "email", type: "String", required: true, unique: true },
        { name: "role", type: "String", required: true, unique: false, enum: ["member"] }
      ]
    }
  ]
};

const currentDataset: GeneratedDataset = {
  projectId: "project-1",
  schemaSnapshotId: "snapshot-1",
  status: "valid",
  generationOrder: ["User"],
  collectionCounts: { User: 1 },
  collections: {
    User: [{ _id: "665f1a000000000000000001", email: "maya@example.com", role: "member" }]
  },
  validationResults: [],
  warnings: [],
  createdAt: "2026-06-07T00:00:00.000Z"
};

describe("refineGeneratedDataset", () => {
  it("retries when the provider returns empty collections", async () => {
    const refineRecords = jest
      .fn()
      .mockResolvedValueOnce({
        mode: "updated_dataset",
        message: "Updated emails.",
        collections: {}
      })
      .mockResolvedValueOnce({
        mode: "updated_dataset",
        message: "Updated emails.",
        collections: {
          User: [
            {
              _id: "665f1a000000000000000001",
              email: "maya@university.edu",
              role: "member"
            }
          ]
        }
      });

    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        currentDataset,
        message: "Use university email domains"
      },
      { refineRecords }
    );

    expect(refineRecords).toHaveBeenCalledTimes(2);
    expect(result.mode).toBe("updated_dataset");
    expect(result.dataset?.collections.User[0].email).toBe("maya@university.edu");
  });

  it("preserves omitted collections when the provider returns a partial dataset", async () => {
    const multiCollectionSchema: ParsedSchema = {
      collections: [
        {
          name: "Category",
          fields: [{ name: "name", type: "String", required: true, unique: false }]
        },
        {
          name: "Product",
          fields: [
            { name: "title", type: "String", required: true, unique: false },
            { name: "categoryId", type: "ObjectId", required: true, unique: false, ref: "Category" }
          ]
        }
      ]
    };
    const multiCollectionDataset: GeneratedDataset = {
      ...currentDataset,
      generationOrder: ["Category", "Product"],
      collectionCounts: { Category: 1, Product: 1 },
      collections: {
        Category: [{ _id: "665f1a000000000000000010", name: "Books" }],
        Product: [{ _id: "665f1a000000000000000011", title: "Novel", categoryId: "665f1a000000000000000010" }]
      }
    };

    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema: multiCollectionSchema,
        currentDataset: multiCollectionDataset,
        message: "Rename the product"
      },
      {
        refineRecords: async () => ({
          mode: "updated_dataset",
          message: "Renamed product.",
          collections: {
            Product: [
              {
                _id: "665f1a000000000000000011",
                title: "Classic Novel",
                categoryId: "665f1a000000000000000010"
              }
            ]
          }
        })
      }
    );

    expect(result.mode).toBe("updated_dataset");
    expect(result.dataset?.collections.Category).toEqual(multiCollectionDataset.collections.Category);
    expect(result.dataset?.collections.Product[0].title).toBe("Classic Novel");
  });

  it("enforces collection count when the provider returns extra records", async () => {
    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        currentDataset,
        message: "Add another user",
        maxAttempts: 1
      },
      {
        refineRecords: async () => ({
          mode: "updated_dataset",
          message: "Added users.",
          collections: {
            User: [
              {
                _id: "665f1a000000000000000001",
                email: "maya@university.edu",
                role: "member"
              },
              {
                _id: "665f1a000000000000000099",
                email: "extra@example.com",
                role: "member"
              }
            ]
          }
        })
      }
    );

    expect(result.mode).toBe("updated_dataset");
    expect(result.dataset?.collections.User).toHaveLength(1);
    expect(result.dataset?.collections.User[0].email).toBe("maya@university.edu");
  });

  it("accepts only validated updated datasets", async () => {
    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        currentDataset,
        message: "Use university email domains"
      },
      {
        refineRecords: async () => ({
          mode: "updated_dataset",
          message: "Updated emails.",
          collections: {
            User: [
              {
                _id: "665f1a000000000000000001",
                email: "maya@university.edu",
                role: "member"
              }
            ]
          }
        })
      }
    );

    expect(result.mode).toBe("updated_dataset");
    expect(result.dataset?.collections.User[0].email).toBe("maya@university.edu");
  });

  it("rejects invalid refinements without returning a replacement dataset", async () => {
    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        currentDataset,
        message: "Make everyone an admin",
        maxAttempts: 1
      },
      {
        refineRecords: async () => ({
          mode: "updated_dataset",
          message: "Changed roles.",
          collections: {
            User: [
              {
                _id: "665f1a000000000000000001",
                email: "maya@example.com",
                role: "admin"
              }
            ]
          }
        })
      }
    );

    expect(result.mode).toBe("rejected");
    expect(result.dataset).toBeUndefined();
    expect(result.validationResults).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "ENUM_VALUE_INVALID" })])
    );
  });

  it("forwards project context to the refinement provider", async () => {
    const refineRecords = jest.fn(async () => ({
      mode: "guidance" as const,
      message: "You can change email domains."
    }));

    await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        projectContext: {
          description: "Canadian fintech demo",
          repository: {
            provider: "github",
            repositoryFullName: "acme/payments",
            repositoryUrl: "https://github.com/acme/payments",
            accessStatus: "connected",
            summary: "Payments API with users and transactions",
            contextCategories: ["models"],
            warnings: [],
            connectedAt: new Date("2026-06-07T00:00:00.000Z")
          },
          warnings: [],
          updatedAt: new Date("2026-06-07T00:00:00.000Z")
        },
        currentDataset,
        message: "What can I change?"
      },
      { refineRecords }
    );

    expect(refineRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        projectContext: "Canadian fintech demo",
        repositoryContext: "Payments API with users and transactions"
      })
    );
  });

  it("supports non-mutating guidance responses", async () => {
    const result = await refineGeneratedDataset(
      {
        projectId: "project-1",
        actorId: "user-1",
        schemaSnapshotId: "snapshot-1",
        schema,
        currentDataset,
        message: "What can I change?"
      },
      {
        refineRecords: async () => ({
          mode: "guidance",
          message: "You can ask for different emails or names."
        })
      }
    );

    expect(result.mode).toBe("guidance");
    expect(result.dataset).toBeUndefined();
  });
});
