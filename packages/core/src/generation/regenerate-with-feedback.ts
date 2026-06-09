import type {
  ChatRefinementMessage,
  FeedbackRegenerationMode,
  FeedbackRegenerationResponse,
  GeneratedDataset,
  GenerationValidationResult,
  ParsedSchema,
  ProjectContext
} from "@testseed/types";
import {
  refineGeneratedDataset,
  type RefineGeneratedDatasetDeps
} from "./refine-generated-dataset";
import {
  buildCandidateChangeSummary,
  hasFixableRetryProblem,
  resolveCandidateReviewState
} from "./review-feedback-candidate";

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
    const currentDataset = {
      ...input.acceptedDataset,
      collectionCounts: input.collectionCounts ?? input.acceptedDataset.collectionCounts
    };
    const refined = await refineGeneratedDataset(
      {
        projectId: input.projectId,
        actorId: input.actorId,
        schemaSnapshotId: input.schemaSnapshotId,
        schema: input.schema,
        projectContext: resolvedProjectContext,
        currentDataset,
        message: contextualFeedback,
        chatHistory: input.chatHistory,
        maxAttempts: 1
      },
      deps
    );

    if (refined.mode === "rejected" && hasFixableRetryProblem(refined.validationResults)) {
      const retryFeedback = appendValidationFeedback(contextualFeedback, refined.validationResults);
      const retryRefined = await refineGeneratedDataset(
        {
          projectId: input.projectId,
          actorId: input.actorId,
          schemaSnapshotId: input.schemaSnapshotId,
          schema: input.schema,
          projectContext: resolvedProjectContext,
          currentDataset,
          message: retryFeedback,
          chatHistory: input.chatHistory,
          maxAttempts: 1
        },
        deps
      );

      return mapLegacyRefinementResult(retryRefined, input.acceptedDataset, 1);
    }

    return mapLegacyRefinementResult(refined, input.acceptedDataset, 0);
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

function mapLegacyRefinementResult(
  result: Awaited<ReturnType<typeof refineGeneratedDataset>>,
  acceptedDataset: GeneratedDataset,
  retryAttempt: number
): FeedbackRegenerationResponse {
  const mode: FeedbackRegenerationMode =
    result.mode === "updated_dataset"
      ? "accepted"
      : result.mode === "guidance"
        ? "partial"
        : "rejected";
  const message = mapOutcomeSummary(mode, result.message, result.validationResults);

  return {
    mode,
    message,
    dataset: result.mode === "updated_dataset" ? result.dataset : undefined,
    candidateReview: {
      state: resolveCandidateReviewState({
        mode,
        validationResults: result.validationResults,
        retryAttempt
      }),
      retryAttempt,
      changeSummary: buildCandidateChangeSummary({
        acceptedDataset,
        candidateDataset: result.mode === "updated_dataset" ? result.dataset : undefined,
        mode,
        message,
        validationResults: result.validationResults
      })
    },
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

function appendValidationFeedback(
  feedback: string,
  validationResults: GenerationValidationResult[]
): string {
  const blockingIssues = validationResults
    .filter((result) => result.severity === "error")
    .map((result) => {
      const location = [result.collectionName, result.recordId, result.fieldName].filter(Boolean).join(".");
      return location ? `${result.code} at ${location}: ${result.message}` : `${result.code}: ${result.message}`;
    });

  if (blockingIssues.length === 0) {
    return feedback;
  }

  return `${feedback}\n\nRetry this regeneration once. Fix these validation problems while preserving the user's feedback:\n${blockingIssues.join("\n")}`;
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
