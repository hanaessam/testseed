import type { ParsedSchema } from "@testseed/types";
import { buildGenerationPlan } from "../build-generation-plan";

const schema: ParsedSchema = {
  collections: [
    {
      name: "User",
      fields: [{ name: "email", type: "String", required: true, unique: true }]
    },
    {
      name: "Product",
      fields: [
        { name: "name", type: "String", required: true, unique: false },
        {
          name: "seller",
          type: "ObjectId",
          required: true,
          unique: false,
          ref: "User",
          refConfidence: "explicit"
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
          ref: "User",
          refConfidence: "explicit"
        },
        {
          name: "product",
          type: "ObjectId",
          required: true,
          unique: false,
          ref: "Product",
          refConfidence: "explicit"
        }
      ]
    }
  ]
};

describe("buildGenerationPlan", () => {
  it("sorts parent collections before child collections", () => {
    const plan = buildGenerationPlan(schema, { User: 2, Product: 3, Order: 4 });

    expect(plan.validationResults).toEqual([]);
    expect(plan.dependencyGraph.orderedCollections).toEqual(["User", "Product", "Order"]);
    expect(plan.collectionPlans.map((collection) => collection.collectionName)).toEqual([
      "User",
      "Product",
      "Order"
    ]);
  });

  it("rejects child records when a required parent count is zero", () => {
    const plan = buildGenerationPlan(schema, { User: 0, Product: 2, Order: 0 });

    expect(plan.validationResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PARENT_COUNT_ZERO",
          collectionName: "Product",
          fieldName: "seller"
        })
      ])
    );
  });

  it("rejects counts beyond the safe generation limit", () => {
    const plan = buildGenerationPlan(
      schema,
      { User: 20, Product: 20, Order: 20 },
      { safeGenerationLimit: 10 }
    );

    expect(plan.validationResults).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "SAFE_LIMIT_EXCEEDED" })])
    );
  });

  it("detects missing referenced collections", () => {
    const plan = buildGenerationPlan(
      {
        collections: [
          {
            name: "Order",
            fields: [
              {
                name: "user",
                type: "ObjectId",
                required: true,
                unique: false,
                ref: "User"
              }
            ]
          }
        ]
      },
      { Order: 1 }
    );

    expect(plan.validationResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "REFERENCE_COLLECTION_MISSING",
          collectionName: "Order"
        })
      ])
    );
  });
});
