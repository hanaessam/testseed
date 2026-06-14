import { mergeRefinedCollections } from "../merge-refined-collections";

describe("mergeRefinedCollections", () => {
  const schemaCollectionNames = ["categories", "products"];

  it("preserves current collections when refinement returns an empty object", () => {
    const current = {
      categories: [{ _id: "1", name: "Books" }],
      products: [{ _id: "2", title: "Novel", categoryId: "1" }]
    };

    const result = mergeRefinedCollections(current, {}, schemaCollectionNames, {
      categories: 1,
      products: 1
    });

    expect(result.collections).toEqual(current);
    expect(result.preservedCollectionNames).toEqual(["categories", "products"]);
  });

  it("accepts a full replacement when counts match", () => {
    const current = {
      categories: [{ _id: "1", name: "Books" }],
      products: [{ _id: "2", title: "Novel", categoryId: "1" }]
    };
    const refined = {
      categories: [{ _id: "1", name: "Literature" }],
      products: [{ _id: "2", title: "Classic Novel", categoryId: "1" }]
    };

    const result = mergeRefinedCollections(current, refined, schemaCollectionNames, {
      categories: 1,
      products: 1
    });

    expect(result.collections).toEqual(refined);
    expect(result.preservedCollectionNames).toEqual([]);
  });

  it("patches records by _id when refinement returns a partial collection", () => {
    const current = {
      categories: [
        { _id: "1", name: "Books" },
        { _id: "2", name: "Games" }
      ],
      products: [{ _id: "3", title: "Novel", categoryId: "1" }]
    };
    const refined = {
      categories: [{ _id: "1", name: "Literature" }]
    };

    const result = mergeRefinedCollections(current, refined, schemaCollectionNames, {
      categories: 2,
      products: 1
    });

    expect(result.collections.categories).toEqual([
      { _id: "1", name: "Literature" },
      { _id: "2", name: "Games" }
    ]);
    expect(result.collections.products).toEqual(current.products);
    expect(result.partialMergeCollectionNames).toEqual(["categories"]);
  });

  it("drops extra refined records to preserve the requested collection count", () => {
    const current = {
      orders: Array.from({ length: 10 }, (_, index) => ({
        _id: String(index + 1),
        total: 100 + index
      }))
    };

    const refined = {
      orders: Array.from({ length: 12 }, (_, index) => ({
        _id: String(index + 1),
        total: 200 + index
      }))
    };

    const result = mergeRefinedCollections(current, refined, ["orders"], { orders: 10 });

    expect(result.collections.orders).toHaveLength(10);
    expect(result.collections.orders[0]).toEqual({ _id: "1", total: 200 });
    expect(result.partialMergeCollectionNames).toEqual(["orders"]);
  });

  it("preserves existing record ids when refinement returns a full replacement with new ids", () => {
    const current = {
      products: [
        { _id: "605c72f1c26f493d0b92f1a7", title: "Serum", price: 10 },
        { _id: "605c72f1c26f493d0b92f1a8", title: "Cream", price: 12 }
      ]
    };
    const refined = {
      products: [
        { _id: "999999999999999999999999", title: "Updated Serum", price: 15 },
        { _id: "888888888888888888888888", title: "Updated Cream", price: 18 }
      ]
    };

    const result = mergeRefinedCollections(current, refined, ["products"], { products: 2 });

    expect(result.collections.products).toEqual([
      { _id: "605c72f1c26f493d0b92f1a7", title: "Updated Serum", price: 15 },
      { _id: "605c72f1c26f493d0b92f1a8", title: "Updated Cream", price: 18 }
    ]);
  });

  it("resolves collection names using canonical matching", () => {
    const current = {
      Categories: [{ _id: "1", name: "Books" }]
    };

    const result = mergeRefinedCollections(
      current,
      { categories: [{ _id: "1", name: "Literature" }] },
      ["Categories"],
      { Categories: 1 }
    );

    expect(result.collections.Categories).toEqual([{ _id: "1", name: "Literature" }]);
  });
});
