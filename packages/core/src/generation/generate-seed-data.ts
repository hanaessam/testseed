import type {
  GeneratedDataset,
  GeneratedRecord,
  GenerationProviderRequest,
  GenerationProviderResponse,
  GenerationValidationResult,
  ParsedSchema,
  ProjectContext
} from "@testseed/types";
import {
  buildGenerationPlan,
  DEFAULT_SAFE_GENERATION_LIMIT,
  resolveCollectionName
} from "./build-generation-plan";
import { validateGeneratedDataset } from "./validate-generated-dataset";

export type SeedGenerationProvider = (
  request: GenerationProviderRequest
) => Promise<GenerationProviderResponse>;

export interface GenerateSeedDataInput {
  projectId: string;
  actorId: string;
  schemaSnapshotId: string;
  schema: ParsedSchema;
  projectContext?: ProjectContext;
  collectionCounts: Record<string, number>;
  maxAttempts?: number;
}

export interface GenerateSeedDataDeps {
  generateRecords: SeedGenerationProvider;
  now?: () => Date;
  safeGenerationLimit?: number;
}

export async function generateSeedData(
  input: GenerateSeedDataInput,
  deps: GenerateSeedDataDeps
): Promise<GeneratedDataset> {
  const maxAttempts = input.maxAttempts ?? 2;
  const now = deps.now ?? (() => new Date());
  const plan = buildGenerationPlan(input.schema, input.collectionCounts, {
    safeGenerationLimit: deps.safeGenerationLimit ?? DEFAULT_SAFE_GENERATION_LIMIT
  });

  if (plan.validationResults.some((result) => result.severity === "error")) {
    return createDataset(input, plan.dependencyGraph.orderedCollections, {}, plan.validationResults, plan.warnings, now);
  }

  let validationFeedback: GenerationValidationResult[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let providerResponse: GenerationProviderResponse;
    try {
      providerResponse = await deps.generateRecords({
        projectId: input.projectId,
        schemaSnapshotId: input.schemaSnapshotId,
        schema: input.schema,
        projectContext: input.projectContext?.description,
        repositoryContext: input.projectContext?.repository?.summary,
        collectionCounts: input.collectionCounts,
        generationOrder: plan.dependencyGraph.orderedCollections,
        validationFeedback
      });
    } catch {
      if (attempt === maxAttempts) {
        return createDataset(
          input,
          plan.dependencyGraph.orderedCollections,
          {},
          [
            {
              severity: "error",
              code: "PROVIDER_FAILURE",
              message: "Seed generation provider could not complete the request.",
              suggestedAction: "Try again or reduce the requested record count."
            }
          ],
          plan.warnings,
          now
        );
      }
      continue;
    }

    const dataset = createDataset(
      input,
      plan.dependencyGraph.orderedCollections,
      normalizeGeneratedCollections(providerResponse.collections, input.schema, input.collectionCounts),
      [],
      plan.warnings,
      now
    );
    const validation = validateGeneratedDataset({
      dataset,
      schema: input.schema,
      collectionCounts: input.collectionCounts
    });

    if (validation.status === "valid") {
      return {
        ...dataset,
        status: "valid",
        validationResults: [],
        warnings: [...plan.warnings, ...validation.warnings, ...genericContextWarnings(input)]
      };
    }

    validationFeedback = validation.validationResults;
  }

  return createDataset(
    input,
    plan.dependencyGraph.orderedCollections,
    {},
    validationFeedback.length > 0
      ? validationFeedback
      : [
          {
            severity: "error",
            code: "GENERATION_FAILED",
            message: "Seed generation could not produce a valid dataset.",
            suggestedAction: "Revise schema review details, project context, or record counts before trying again."
          }
        ],
    [...plan.warnings, ...genericContextWarnings(input)],
    now
  );
}

export function createStableObjectId(collectionIndex: number, recordIndex: number): string {
  const prefix = "665f1a";
  const body = collectionIndex.toString(16).padStart(6, "0");
  const suffix = (recordIndex + 1).toString(16).padStart(12, "0");
  return `${prefix}${body}${suffix}`.slice(0, 24);
}

function createDataset(
  input: GenerateSeedDataInput,
  generationOrder: string[],
  collections: Record<string, GeneratedRecord[]>,
  validationResults: GenerationValidationResult[],
  warnings: GenerationValidationResult[],
  now: () => Date
): GeneratedDataset {
  return {
    projectId: input.projectId,
    schemaSnapshotId: input.schemaSnapshotId,
    status: validationResults.some((result) => result.severity === "error") ? "invalid" : "valid",
    generationOrder,
    collectionCounts: Object.fromEntries(
      input.schema.collections.map((collection) => [
        collection.name,
        collections[collection.name]?.length ?? input.collectionCounts[collection.name] ?? 0
      ])
    ),
    collections,
    validationResults,
    warnings,
    createdAt: now().toISOString()
  };
}

function normalizeGeneratedCollections(
  collections: Record<string, GeneratedRecord[]> | undefined,
  schema: ParsedSchema,
  counts: Record<string, number>
): Record<string, GeneratedRecord[]> {
  const normalized: Record<string, GeneratedRecord[]> = {};
  const providerCollections = collections ?? {};
  const providerKeyByCanonicalName = new Map(
    Object.keys(providerCollections).map((key) => [canonicalProviderKey(key), key])
  );

  schema.collections.forEach((collection, collectionIndex) => {
    const providerKey =
      collection.name in providerCollections
        ? collection.name
        : providerKeyByCanonicalName.get(canonicalProviderKey(collection.name));
    const records = providerKey ? providerCollections[providerKey] ?? [] : [];
    normalized[collection.name] = records.slice(0, counts[collection.name] ?? 0).map((record, recordIndex) => ({
      ...record,
      _id:
        typeof record._id === "string" && /^[a-f0-9]{24}$/i.test(record._id)
          ? record._id
          : createStableObjectId(collectionIndex, recordIndex)
    }));
  });

  repairGeneratedReferences(normalized, schema);

  return normalized;
}

function repairGeneratedReferences(
  collections: Record<string, GeneratedRecord[]>,
  schema: ParsedSchema
): void {
  const collectionNames = schema.collections.map((collection) => collection.name);

  for (const collection of schema.collections) {
    const records = collections[collection.name] ?? [];
    for (const field of collection.fields) {
      if (!field.ref) {
        continue;
      }

      const parentCollectionName = resolveCollectionName(field.ref, collectionNames);
      if (!parentCollectionName) {
        continue;
      }

      const parentIds = (collections[parentCollectionName] ?? []).map((record) => record._id);
      if (parentIds.length === 0) {
        continue;
      }

      for (const [recordIndex, record] of records.entries()) {
        const currentValue = record[field.name];
        if (Array.isArray(currentValue)) {
          record[field.name] = currentValue
            .map((value, index) =>
              typeof value === "string" && parentIds.includes(value)
                ? value
                : parentIds[index % parentIds.length]
            )
            .slice(0, Math.max(1, currentValue.length));
          continue;
        }

        if (typeof currentValue !== "string" || !parentIds.includes(currentValue)) {
          record[field.name] = parentIds[recordIndex % parentIds.length];
        }
      }
    }
  }
}

function canonicalProviderKey(name: string): string {
  return name.trim().toLowerCase().replace(/s$/, "");
}

function genericContextWarnings(input: GenerateSeedDataInput): GenerationValidationResult[] {
  if (input.projectContext?.description?.trim()) {
    return [];
  }

  return [
    {
      severity: "warning",
      code: "GENERIC_CONTEXT",
      message: "Project context is empty, so generated values may be generic.",
      suggestedAction: "Add a project description to improve realism."
    }
  ];
}
