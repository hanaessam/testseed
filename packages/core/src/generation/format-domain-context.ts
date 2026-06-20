export interface DomainContextInput {
  projectContext?: string;
  repositoryContext?: string;
}

export function formatDomainContextBlock(input: DomainContextInput): string | undefined {
  const description = input.projectContext?.trim();
  const repositorySummary = input.repositoryContext?.trim();
  const parts: string[] = [];

  if (description) {
    parts.push(`Product/domain description: ${description}`);
  }

  if (repositorySummary) {
    parts.push(`Repository context: ${repositorySummary}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

export function hasDomainContext(input: DomainContextInput): boolean {
  return Boolean(input.projectContext?.trim() || input.repositoryContext?.trim());
}
