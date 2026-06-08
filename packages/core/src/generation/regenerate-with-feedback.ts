import type {
  ChatRefinementMessage,
  FeedbackRegenerationMode,
  FeedbackRegenerationResponse,
  GeneratedDataset,
  ParsedSchema,
  ProjectContext
} from "@testseed/types";
import {
  refineGeneratedDataset,
  type RefineGeneratedDatasetDeps
} from "./refine-generated-dataset";

export interface RegenerateWithFeedbackInput {
  projectId: string;
  actorId: string;
  schemaSnapshotId: string;
  schema: ParsedSchema;
  projectContext?: ProjectContext;
  acceptedDataset: GeneratedDataset;
  feedback: string;
  chatHistory?: ChatRefinementMessage[];
  projectContextText?: string;
  schemaContext?: string;
  collectionCounts?: Record<string, number>;
  signal?: AbortSignal;
}

export interface RegenerateWithFeedbackDeps extends RefineGeneratedDatasetDeps {}

export async function regenerateWithFeedback(
  input: RegenerateWithFeedbackInput,
  deps: RegenerateWithFeedbackDeps
): Promise<FeedbackRegenerationResponse> {
  if (input.signal?.aborted) {
    return cancelled(input.chatHistory ?? []);
  }

  const feedback = input.feedback.trim();
  const chatHistory = input.chatHistory ?? [];
  const nextHistory: ChatRefinementMessage[] = [...chatHistory, { role: "user", content: feedback }];
  const contextualFeedback = buildContextualFeedback(feedback, input.schemaContext);
  const resolvedProjectContext = buildProjectContext(input.projectContext, input.projectContextText);

  if (!feedback) {
    return {
      mode: "rejected",
      message: "Feedback is required.",
      validationResults: [],
      warnings: [],
      chatHistory: [...nextHistory, { role: "assistant", content: "Feedback is required." }]
    };
  }

  try {
    const refined = await refineGeneratedDataset(
      {
        projectId: input.projectId,
        actorId: input.actorId,
        schemaSnapshotId: input.schemaSnapshotId,
        schema: input.schema,
        projectContext: resolvedProjectContext,
        currentDataset: {
          ...input.acceptedDataset,
          collectionCounts: input.collectionCounts ?? input.acceptedDataset.collectionCounts
        },
        message: contextualFeedback,
        chatHistory: input.chatHistory
      },
      deps
    );

    return mapLegacyRefinementResult(refined);
  } catch (error) {
    if (isAbortError(error) || input.signal?.aborted) {
      return cancelled(nextHistory);
    }

    return {
      mode: "rejected",
      message: "The regeneration request could not be completed.",
      validationResults: [
        {
          severity: "error",
          code: "REGENERATION_FAILURE",
          message: "The regeneration request could not be completed.",
          suggestedAction: "Try again with narrower feedback."
        }
      ],
      warnings: [],
      chatHistory: [...nextHistory, { role: "assistant", content: "The regeneration request could not be completed." }]
    };
  }
}

function mapLegacyRefinementResult(result: Awaited<ReturnType<typeof refineGeneratedDataset>>): FeedbackRegenerationResponse {
  const mode: FeedbackRegenerationMode =
    result.mode === "updated_dataset"
      ? "accepted"
      : result.mode === "guidance"
        ? "partial"
        : "rejected";

  return {
    mode,
    message: mapOutcomeSummary(mode, result.message, result.validationResults),
    dataset: result.mode === "updated_dataset" ? result.dataset : undefined,
    validationResults: result.validationResults,
    warnings: result.warnings,
    chatHistory: result.chatHistory
  };
}

function cancelled(chatHistory: ChatRefinementMessage[]): FeedbackRegenerationResponse {
  const message = "Regeneration cancelled.";
  return {
    mode: "cancelled",
    message,
    validationResults: [],
    warnings: [],
    chatHistory: [...chatHistory, { role: "assistant", content: message }]
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function buildContextualFeedback(feedback: string, schemaContext?: string): string {
  const nextSchemaContext = schemaContext?.trim();
  if (!nextSchemaContext) {
    return feedback;
  }

  return `${feedback}\n\nSchema context: ${nextSchemaContext}`;
}

function buildProjectContext(
  projectContext: ProjectContext | undefined,
  projectContextText?: string
): ProjectContext | undefined {
  const description = projectContextText?.trim();
  if (projectContext && description) {
    return {
      ...projectContext,
      description
    };
  }

  if (projectContext) {
    return projectContext;
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

function mapOutcomeSummary(
  mode: FeedbackRegenerationMode,
  rawMessage: string,
  validationResults: FeedbackRegenerationResponse["validationResults"]
): string {
  const message = rawMessage.trim();
  if (mode === "accepted") {
    return message || "Applied feedback and accepted a schema-valid regenerated dataset.";
  }

  if (mode === "partial") {
    return message || "Partially applied feedback. Some requested changes were skipped to preserve constraints.";
  }

  if (mode === "rejected") {
    const firstBlockingReason = validationResults.find((result) => result.severity === "error")?.message;
    if (message && firstBlockingReason) {
      return `${message} Skipped: ${firstBlockingReason}`;
    }
    if (message) {
      return message;
    }
    return firstBlockingReason
      ? `Could not apply feedback safely. Skipped: ${firstBlockingReason}`
      : "Could not apply feedback safely while preserving schema constraints.";
  }

  return message || "Regeneration cancelled.";
}
