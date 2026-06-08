import type { GenerationPlanResponse, GenerationValidationResult } from "@testseed/types";
import type { GenerationPlan } from "./build-generation-plan";

export function mapGenerationPlanToResponse(
  plan: GenerationPlan,
  collectionCounts: Record<string, number>
): GenerationPlanResponse {
  const blockingWarnings: GenerationValidationResult[] = [
    ...plan.validationResults.filter((result) => result.severity === "error"),
    ...plan.collectionPlans.flatMap((item) =>
      item.warnings.filter((warning) => warning.severity === "error")
    )
  ];

  if (plan.dependencyGraph.cycles.length > 0) {
    blockingWarnings.push({
      severity: "error",
      code: "REFERENCE_CYCLE",
      message: `Reference cycle detected: ${plan.dependencyGraph.cycles.join(", ")}.`,
      suggestedAction: "Review reference fields and remove circular dependencies."
    });
  }

  for (const missing of plan.dependencyGraph.missingReferences) {
    blockingWarnings.push({
      severity: "error",
      code: "REFERENCE_COLLECTION_MISSING",
      collectionName: missing.collectionName,
      fieldName: missing.fieldName,
      message: `${missing.collectionName}.${missing.fieldName} references missing collection ${missing.ref}.`,
      suggestedAction: "Add the referenced collection to the schema or remove the reference."
    });
  }

  const totalRecords = Object.values(collectionCounts).reduce((sum, count) => sum + count, 0);

  return {
    orderedCollections: plan.dependencyGraph.orderedCollections,
    items: plan.collectionPlans.map((item) => ({
      collectionName: item.collectionName,
      count: item.count,
      dependencyOrder: item.dependencyOrder,
      referenceFields: item.referenceFields
        .filter((field) => field.ref)
        .map((field) => ({
          fieldName: field.name,
          referencedCollection: field.ref!
        })),
      warnings: item.warnings
    })),
    totalRecords,
    blockingWarnings,
    riskLevel: blockingWarnings.length > 0 ? "elevated" : "none"
  };
}
