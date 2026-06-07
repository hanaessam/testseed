import { discoverMongoSchema, testMongoConnection } from "../mongodb-discovery";

describe("MongoDB schema discovery", () => {
  it("tests a MongoDB connection through an injected inspector", async () => {
    const inspector = {
      testConnection: jest.fn().mockResolvedValue({ databaseName: "shop" }),
      inspectDatabase: jest.fn()
    };

    const result = await testMongoConnection(
      { connectionString: "mongodb://example.test/shop" },
      { inspector }
    );

    expect(result).toEqual({
      ok: true,
      databaseName: "shop",
      message: "Connection successful."
    });
    expect(inspector.testConnection).toHaveBeenCalledWith("mongodb://example.test/shop");
  });

  it("uses a default sample cap of 20 documents per collection", async () => {
    const inspector = {
      testConnection: jest.fn(),
      inspectDatabase: jest.fn().mockResolvedValue({
        collections: []
      })
    };

    await discoverMongoSchema(
      { connectionString: "mongodb://example.test/shop" },
      { inspector }
    );

    expect(inspector.inspectDatabase).toHaveBeenCalledWith(
      "mongodb://example.test/shop",
      { sampleSize: 20 }
    );
  });

  it("caps requested sample sizes at 20 documents per collection", async () => {
    const inspector = {
      testConnection: jest.fn(),
      inspectDatabase: jest.fn().mockResolvedValue({
        collections: []
      })
    };

    await discoverMongoSchema(
      { connectionString: "mongodb://example.test/shop", sampleSize: 50 },
      { inspector }
    );

    expect(inspector.inspectDatabase).toHaveBeenCalledWith(
      "mongodb://example.test/shop",
      { sampleSize: 20 }
    );
  });

  it("infers fields, nested structures, arrays, references, and uncertain fields from samples", async () => {
    const inspector = {
      testConnection: jest.fn(),
      inspectDatabase: jest.fn().mockResolvedValue({
        databaseName: "shop",
        collections: [
          {
            name: "users",
            documents: [
              {
                _id: "665f7f5b9d7f2a73d99f0001",
                email: "hana@example.com",
                profile: { city: "Cairo" },
                roles: ["admin", "buyer"],
                age: 28
              },
              {
                _id: "665f7f5b9d7f2a73d99f0002",
                email: "mariam@example.com",
                profile: { city: "Alexandria" },
                roles: ["buyer"],
                age: "unknown",
                nickname: "Mari"
              }
            ]
          },
          {
            name: "orders",
            documents: [
              {
                _id: "665f7f5b9d7f2a73d99f0003",
                userId: "665f7f5b9d7f2a73d99f0001",
                total: 120,
                items: [{ sku: "SKU-1", quantity: 2 }]
              }
            ]
          }
        ]
      })
    };

    const result = await discoverMongoSchema(
      { connectionString: "mongodb://example.test/shop", sampleSize: 25 },
      { inspector }
    );

    expect(result.databaseName).toBe("shop");
    expect(result.schema.collections.map((collection) => collection.name)).toEqual([
      "users",
      "orders"
    ]);

    const users = result.collections.find((collection) => collection.name === "users");
    expect(users?.sampleCount).toBe(2);
    expect(users?.fields.find((field) => field.name === "email")).toMatchObject({
      type: "String",
      required: true,
      confidence: "high"
    });
    expect(users?.fields.find((field) => field.name === "profile")).toMatchObject({
      type: "Object",
      children: [expect.objectContaining({ name: "city", type: "String" })]
    });
    expect(users?.fields.find((field) => field.name === "roles")).toMatchObject({
      type: "Array",
      itemType: "String"
    });
    expect(users?.fields.find((field) => field.name === "age")).toMatchObject({
      type: "Mixed",
      confidence: "low"
    });
    expect(users?.fields.find((field) => field.name === "nickname")).toMatchObject({
      required: false,
      confidence: "low"
    });

    const orders = result.collections.find((collection) => collection.name === "orders");
    expect(orders?.fields.find((field) => field.name === "userId")).toMatchObject({
      type: "ObjectId",
      ref: "users",
      refConfidence: "inferred"
    });
  });

  it("preserves collection metadata in the review schema and warns when the sample cap is reached", async () => {
    const inspector = {
      testConnection: jest.fn(),
      inspectDatabase: jest.fn().mockResolvedValue({
        collections: [
          {
            name: "events",
            sampleLimitReached: true,
            documents: Array.from({ length: 20 }, (_value, index) => ({
              _id: `665f7f5b9d7f2a73d99f00${String(index).padStart(2, "0")}`,
              name: `event-${index}`
            }))
          }
        ]
      })
    };

    const result = await discoverMongoSchema(
      { connectionString: "mongodb://example.test/shop" },
      { inspector }
    );

    expect(result.collections[0]).toMatchObject({
      name: "events",
      sampleCount: 20,
      warnings: ["Only 20 sampled documents were inspected; review confidence carefully."]
    });
    expect(result.schema.collections[0]).toMatchObject({
      name: "events",
      sampleCount: 20,
      warnings: ["Only 20 sampled documents were inspected; review confidence carefully."]
    });
    expect(JSON.stringify(result)).not.toContain("mongodb://example.test/shop");
  });

  it("returns warnings for empty databases and empty collections", async () => {
    const emptyDatabaseInspector = {
      testConnection: jest.fn(),
      inspectDatabase: jest.fn().mockResolvedValue({
        collections: []
      })
    };

    const emptyResult = await discoverMongoSchema(
      { connectionString: "mongodb://example.test/empty" },
      { inspector: emptyDatabaseInspector }
    );

    expect(emptyResult.warnings).toContain(
      "No collections were found. Paste a schema manually or choose another database."
    );

    const emptyCollectionInspector = {
      testConnection: jest.fn(),
      inspectDatabase: jest.fn().mockResolvedValue({
        collections: [{ name: "products", documents: [] }]
      })
    };

    const collectionResult = await discoverMongoSchema(
      { connectionString: "mongodb://example.test/shop" },
      { inspector: emptyCollectionInspector }
    );

    expect(collectionResult.collections[0]).toMatchObject({
      name: "products",
      sampleCount: 0,
      warnings: ["Collection has no sample documents; fields were not inferred."]
    });
  });
});
