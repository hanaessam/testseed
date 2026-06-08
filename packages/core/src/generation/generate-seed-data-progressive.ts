import type {
  GeneratedRecord,
  GenerationValidationResult
} from "@testseed/types";
import {
  buildGenerationPlan,
  DEFAULT_SAFE_GENERATION_LIMIT
} from "./build-generation-plan";
import {
  generateSeedData,
  type GenerateSeedDataDeps,
  type GenerateSeedDataInput
} from "./generate-seed-data";

export interface GenerateSeedDataProgressiveDeps extends GenerateSeedDataDeps {
  onCollectionStart?(collectionName: string, index: number, total: number): void;
  onCollectionComplete?(
    collectionName: string,
    records: GeneratedRecord[],
    validationResults: GenerationValidationResult[]
  ): void;
}

export async function generateSeedDataProgressive(
  input: GenerateSeedDataInput,
  deps: GenerateSeedDataProgressiveDeps
) {
  const plan = buildGenerationPlan(input.schema, input.collectionCounts, {
    safeGenerationLimit: deps.safeGenerationLimit ?? DEFAULT_SAFE_GENERATION_LIMIT
  });
  const order = plan.dependencyGraph.orderedCollections;
  const total = order.length;

  for (let index = 0; index < order.length; index += 1) {
    const collectionName = order[index];
    deps.onCollectionStart?.(collectionName, index, total);
  }

  const dataset = await generateSeedData(input, deps);

  for (let index = 0; index < order.length; index += 1) {
    const collectionName = order[index];
    const records = dataset.collections[collectionName] ?? [];
    const validationResults = dataset.validationResults.filter(
      (result) => result.collectionName === collectionName
    );
    deps.onCollectionComplete?.(collectionName, records, validationResults);
  }

  return dataset;
}
