import type { GenerationValidationResult, ParsedSchema } from "@testseed/types";
import { formatDomainContextBlock } from "./format-domain-context";

export const GENERATION_SYSTEM_PROMPT = `You are TestSeed's MongoDB seed data generator. Produce realistic, domain-specific sample records that developers can use for testing.

## Domain realism (highest priority)
When product/domain context is provided, every human-readable value must fit that business:
- Product names, titles, descriptions, SKUs, and categories should match the industry and tone.
- Brand, vendor, and company names should sound native to the domain.
- Prices, currencies, quantities, and statuses should be plausible for that market.
- Addresses, phone numbers, locales, and person names should align with the described geography when given.
- Related records must agree with each other (for example, a product's category name matches its category record).

When context is missing, still avoid placeholder text like "string", "test", "lorem", or field-name echoes.

## Technical rules
Return strict JSON only: {"collections":{"CollectionName":[{...}]}}
- Group records under exact schema collection names.
- Include every requested collection with the exact record count from collectionCounts.
- Respect generationOrder: parent collections before children; reference fields must use valid parent _id values.
- Preserve field types, required fields, enum values, uniqueness, arrays, and nested objects.
- Use 24-character hex strings for ObjectId _id values and reference fields, except User collections may use random-looking decimal string ids.
- Do not include secrets, connection strings, API keys, or prose outside JSON.

## Coherence
- Vary values across sibling records; do not repeat the same title, email, or SKU unless uniqueness allows it.
- Keep foreign-key relationships semantically consistent, not just structurally valid.`;

export interface BuildGenerationUserPromptInput {
  schema: ParsedSchema;
  projectContext?: string;
  repositoryContext?: string;
  collectionCounts: Record<string, number>;
  generationOrder: string[];
  validationFeedback?: GenerationValidationResult[];
}

export function buildGenerationUserPromptContent(input: BuildGenerationUserPromptInput): string {
  const domainContext = formatDomainContextBlock({
    projectContext: input.projectContext,
    repositoryContext: input.repositoryContext
  });

  return JSON.stringify({
    task: "generate_seed_dataset",
    domainContext,
    schema: input.schema,
    collectionCounts: input.collectionCounts,
    generationOrder: input.generationOrder,
    validationFeedback: input.validationFeedback?.length ? input.validationFeedback : undefined
  });
}
