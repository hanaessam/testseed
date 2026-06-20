import type { ProjectContext } from "@testseed/types";

export function resolveGenerationProjectContext(
  stored?: ProjectContext,
  descriptionOverride?: string
): ProjectContext | undefined {
  const description = descriptionOverride?.trim() || stored?.description?.trim();

  if (stored) {
    if (!description && !stored.description?.trim() && !stored.repository?.summary?.trim()) {
      return stored.description || stored.repository ? stored : undefined;
    }

    return {
      ...stored,
      description: description || stored.description
    };
  }

  if (!description) {
    return undefined;
  }

  return {
    description,
    warnings: [],
    updatedAt: new Date()
  };
}
