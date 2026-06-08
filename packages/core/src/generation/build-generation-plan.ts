import type {
  CollectionSchema,
  GeneratedDataset,
  GenerationValidationResult,
  ParsedSchema,
  SchemaField
} from "@testseed/types";

export const DEFAULT_SAFE_GENERATION_LIMIT = 100;

export interface CollectionGenerationPlan {
  collectionName: string;
  count: number;
  dependencyOrder: number;
  fields: SchemaField[];
  requiredFields: string[];
  enumFields: SchemaField[];
  uniqueFields: SchemaField[];
  referenceFields: SchemaField[];
  warnings: GenerationValidationResult[];
}

export interface DependencyGraph {
  nodes: string[];
  edges: Array<{ child: string; parent: string; fieldName: string }>;
  orderedCollections: string[];
  cycles: string[];
  missingReferences: Array<{ collectionName: string; fieldName: string; ref: string }>;
}

export interface GenerationPlan {
  collectionPlans: CollectionGenerationPlan[];
  dependencyGraph: DependencyGraph;
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
}

export interface BuildGenerationPlanDeps {
  safeGenerationLimit?: number;
}

export function buildGenerationPlan(
  schema: ParsedSchema,
  collectionCounts: Record<string, number>,
  deps: BuildGenerationPlanDeps = {}
): GenerationPlan {
  const safeGenerationLimit = deps.safeGenerationLimit ?? DEFAULT_SAFE_GENERATION_LIMIT;
  const validationResults: GenerationValidationResult[] = [];
  const warnings: GenerationValidationResult[] = [];
  const collections = schema.collections;
  const collectionNames = collections.map((collection) => collection.name);
  const collectionByName = new Map(collections.map((collection) => [collection.name, collection]));
  const canonicalCollectionNames = new Map(
    collectionNames.map((name) => [canonicalCollectionName(name), name])
  );

  if (collections.length === 0) {
    validationResults.push({
      severity: "error",
      code: "NO_COLLECTIONS",
      message: "Review and save a schema with at least one collection before generating seed records.",
      suggestedAction: "Return to schema review and save a schema with collections."
    });
  }

  const unknownCountKeys = Object.keys(collectionCounts).filter(
    (name) => !collectionByName.has(name)
  );
  for (const collectionName of unknownCountKeys) {
    validationResults.push({
      severity: "error",
      collectionName,
      code: "UNKNOWN_COLLECTION",
      message: `${collectionName} is not part of the reviewed schema.`,
      suggestedAction: "Remove this collection from the generation request or review the schema."
    });
  }

  const normalizedCounts: Record<string, number> = {};
  for (const collection of collections) {
    const count = collectionCounts[collection.name] ?? 0;
    normalizedCounts[collection.name] = count;

    if (!Number.isInteger(count) || count < 0) {
      validationResults.push({
        severity: "error",
        collectionName: collection.name,
        code: "INVALID_COUNT",
        message: `${collection.name} count must be a non-negative integer.`,
        suggestedAction: "Use whole numbers greater than or equal to zero."
      });
    }
  }

  const totalCount = Object.values(normalizedCounts).reduce((sum, count) => sum + count, 0);
  if (totalCount === 0) {
    validationResults.push({
      severity: "error",
      code: "NO_RECORDS_REQUESTED",
      message: "At least one collection count must be greater than zero.",
      suggestedAction: "Set a positive count for at least one collection."
    });
  }

  if (totalCount > safeGenerationLimit) {
    validationResults.push({
      severity: "error",
      code: "SAFE_LIMIT_EXCEEDED",
      message: `Requested ${totalCount} records, which exceeds the safe limit of ${safeGenerationLimit}.`,
      suggestedAction: "Reduce the counts or split generation into smaller batches."
    });
  }

  const graph = buildDependencyGraph(collections, canonicalCollectionNames);

  for (const missing of graph.missingReferences) {
    validationResults.push({
      severity: "error",
      collectionName: missing.collectionName,
      fieldName: missing.fieldName,
      code: "REFERENCE_COLLECTION_MISSING",
      message: `${missing.collectionName}.${missing.fieldName} references ${missing.ref}, but that collection is not in the reviewed schema.`,
      suggestedAction: "Review the reference field or add the referenced collection to the schema."
    });
  }

  for (const cycle of graph.cycles) {
    validationResults.push({
      severity: "error",
      collectionName: cycle,
      code: "REFERENCE_CYCLE",
      message: `${cycle} participates in a circular reference, so parent-first generation cannot be guaranteed.`,
      suggestedAction: "Make one side optional or adjust the reviewed references."
    });
  }

  for (const edge of graph.edges) {
    const childCount = normalizedCounts[edge.child] ?? 0;
    const parentCount = normalizedCounts[edge.parent] ?? 0;
    const childField = collectionByName
      .get(edge.child)
      ?.fields.find((field) => field.name === edge.fieldName);

    if (childCount > 0 && parentCount === 0 && childField?.required) {
      validationResults.push({
        severity: "error",
        collectionName: edge.child,
        fieldName: edge.fieldName,
        code: "PARENT_COUNT_ZERO",
        message: `${edge.child}.${edge.fieldName} references ${edge.parent}, but ${edge.parent} count is zero.`,
        suggestedAction: `Generate at least one ${edge.parent} record or make the reference optional in schema review.`
      });
    } else if (childCount > 0 && parentCount === 0) {
      warnings.push({
        severity: "warning",
        collectionName: edge.child,
        fieldName: edge.fieldName,
        code: "OPTIONAL_PARENT_COUNT_ZERO",
        message: `${edge.child}.${edge.fieldName} references ${edge.parent}, but ${edge.parent} count is zero.`,
        suggestedAction: "The optional reference should be omitted or the parent count should be increased."
      });
    }
  }

  const orderIndex = new Map(graph.orderedCollections.map((name, index) => [name, index]));
  const collectionPlans = graph.orderedCollections.map((collectionName) => {
    const collection = collectionByName.get(collectionName) as CollectionSchema;
    const fields = collection.fields;
    return {
      collectionName,
      count: normalizedCounts[collectionName] ?? 0,
      dependencyOrder: orderIndex.get(collectionName) ?? 0,
      fields,
      requiredFields: fields.filter((field) => field.required).map((field) => field.name),
      enumFields: fields.filter((field) => field.enum && field.enum.length > 0),
      uniqueFields: fields.filter((field) => field.unique),
      referenceFields: fields.filter((field) => Boolean(field.ref)),
      warnings
        : warnings.filter((warning) => warning.collectionName === collectionName)
    };
  });

  return {
    collectionPlans,
    dependencyGraph: graph,
    validationResults,
    warnings
  };
}

export function getGenerationOrder(schema: ParsedSchema, counts: Record<string, number>): string[] {
  return buildGenerationPlan(schema, counts).dependencyGraph.orderedCollections;
}

export function canonicalCollectionName(name: string): string {
  return name.trim().toLowerCase().replace(/s$/, "");
}

export function resolveCollectionName(
  ref: string,
  collectionNames: Iterable<string>
): string | undefined {
  const canonicalRef = canonicalCollectionName(ref);
  for (const name of collectionNames) {
    if (canonicalCollectionName(name) === canonicalRef) {
      return name;
    }
  }
  return undefined;
}

export function cloneDatasetWithValidation(
  dataset: GeneratedDataset,
  validationResults: GenerationValidationResult[],
  warnings: GenerationValidationResult[]
): GeneratedDataset {
  return {
    ...dataset,
    status: validationResults.some((result) => result.severity === "error") ? "invalid" : "valid",
    validationResults,
    warnings
  };
}

function buildDependencyGraph(
  collections: CollectionSchema[],
  canonicalCollectionNames: Map<string, string>
): DependencyGraph {
  const nodes = collections.map((collection) => collection.name);
  const edges: DependencyGraph["edges"] = [];
  const missingReferences: DependencyGraph["missingReferences"] = [];

  for (const collection of collections) {
    for (const field of collection.fields) {
      if (!field.ref) {
        continue;
      }

      const parent = canonicalCollectionNames.get(canonicalCollectionName(field.ref));
      if (!parent) {
        missingReferences.push({
          collectionName: collection.name,
          fieldName: field.name,
          ref: field.ref
        });
        continue;
      }

      if (parent !== collection.name) {
        edges.push({
          child: collection.name,
          parent,
          fieldName: field.name
        });
      }
    }
  }

  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const node of nodes) {
    outgoing.set(node, []);
    indegree.set(node, 0);
  }

  for (const edge of edges) {
    outgoing.get(edge.parent)?.push(edge.child);
    indegree.set(edge.child, (indegree.get(edge.child) ?? 0) + 1);
  }

  const queue = nodes.filter((node) => (indegree.get(node) ?? 0) === 0);
  const orderedCollections: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift() as string;
    orderedCollections.push(node);

    for (const child of outgoing.get(node) ?? []) {
      const nextIndegree = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(child);
      }
    }
  }

  const cycles = nodes.filter((node) => !orderedCollections.includes(node));
  return {
    nodes,
    edges,
    orderedCollections: [...orderedCollections, ...cycles],
    cycles,
    missingReferences
  };
}
