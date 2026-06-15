import {
  GENERATION_SYSTEM_PROMPT,
  buildGenerationUserPromptContent
} from "../build-generation-prompt";

const schema = {
  collections: [
    {
      name: "Product",
      fields: [
        { name: "title", type: "String", required: true, unique: false },
        { name: "price", type: "Number", required: true, unique: false }
      ]
    }
  ]
};

describe("build-generation-prompt", () => {
  it("prioritizes domain context in the user payload", () => {
    const payload = JSON.parse(
      buildGenerationUserPromptContent({
        schema,
        projectContext: "Luxury skincare e-commerce for the Gulf region",
        repositoryContext: "Shopify-style catalog with brands and categories",
        collectionCounts: { Product: 5 },
        generationOrder: ["Product"]
      })
    );

    expect(payload.task).toBe("generate_seed_dataset");
    expect(payload.domainContext).toContain("Luxury skincare e-commerce");
    expect(payload.domainContext).toContain("Shopify-style catalog");
    expect(payload.collectionCounts).toEqual({ Product: 5 });
  });

  it("documents domain realism in the system prompt", () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain("Domain realism");
    expect(GENERATION_SYSTEM_PROMPT).toContain("product/domain context");
  });
});
