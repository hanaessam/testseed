import type {
  ChatRefinementMessage,
  GeneratedDataset,
  GenerationValidationResult,
  ParsedSchema,
  ProjectContext,
  RefineGeneratedDatasetResponse,
  RefinementProviderRequest,
  RefinementProviderResponse
} from "@testseed/types";
import { validateGeneratedDataset } from "./validate-generated-dataset";

export type SeedRefinementProvider = (
  request: RefinementProviderRequest
) => Promise<RefinementProviderResponse>;

export interface RefineGeneratedDatasetInput {
  projectId: string;
  actorId: string;
  schemaSnapshotId: string;
  schema: ParsedSchema;
  projectContext?: ProjectContext;
  currentDataset: GeneratedDataset;
  message: string;
  chatHistory?: ChatRefinementMessage[];
  maxAttempts?: number;
}

export interface RefineGeneratedDatasetDeps {
  refineRecords: SeedRefinementProvider;
}

export async function refineGeneratedDataset(
  input: RefineGeneratedDatasetInput,
  deps: RefineGeneratedDatasetDeps
): Promise<RefineGeneratedDatasetResponse> {
  const message = input.message.trim();
  const chatHistory = sanitizeChatHistory(input.chatHistory ?? []);
  const nextHistoryBase: ChatRefinementMessage[] = [...chatHistory, { role: "user", content: message }];

  if (!message) {
    return rejected("Refinement message is required.", nextHistoryBase, []);
  }

  if (input.currentDataset.status !== "valid") {
    return rejected("Only valid generated datasets can be refined.", nextHistoryBase, [
      {
        severity: "error",
        code: "CURRENT_DATASET_INVALID",
        message: "The current dataset must be valid before chat refinement.",
        suggestedAction: "Regenerate or fix validation errors before refining."
      }
    ]);
  }

  let validationFeedback: GenerationValidationResult[] = [];
  const maxAttempts = input.maxAttempts ?? 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let providerResponse: RefinementProviderResponse;
    try {
      providerResponse = await deps.refineRecords({
        projectId: input.projectId,
        schemaSnapshotId: input.schemaSnapshotId,
        schema: input.schema,
        currentDataset: input.currentDataset,
        message,
        chatHistory,
        validationFeedback
      });
    } catch {
      return rejected("The AI refinement provider could not complete the request.", nextHistoryBase, [
        {
          severity: "error",
          code: "REFINEMENT_PROVIDER_FAILURE",
          message: "The AI refinement provider could not complete the request.",
          suggestedAction: "Try again with a narrower instruction."
        }
      ]);
    }

    if (providerResponse.mode === "guidance") {
      return {
        mode: "guidance",
        message: providerResponse.message,
        validationResults: [],
        warnings: [],
        chatHistory: [...nextHistoryBase, { role: "assistant", content: providerResponse.message }]
      };
    }

    const dataset: GeneratedDataset = {
      ...input.currentDataset,
      collections: providerResponse.collections ?? {},
      validationResults: [],
      warnings: []
    };
    const validation = validateGeneratedDataset({
      dataset,
      schema: input.schema,
      collectionCounts: input.currentDataset.collectionCounts
    });

    if (validation.status === "valid") {
      const acceptedDataset: GeneratedDataset = {
        ...dataset,
        status: "valid",
        validationResults: [],
        warnings: validation.warnings
      };
      return {
        mode: "updated_dataset",
        message: providerResponse.message || "Updated dataset and preserved schema validity.",
        dataset: acceptedDataset,
        validationResults: [],
        warnings: validation.warnings,
        chatHistory: [
          ...nextHistoryBase,
          {
            role: "assistant",
            content: providerResponse.message || "Updated dataset and preserved schema validity."
          }
        ]
      };
    }

    validationFeedback = validation.validationResults;
  }

  return rejected(
    "The requested refinement could not be applied without violating the reviewed schema.",
    nextHistoryBase,
    validationFeedback
  );
}

function rejected(
  message: string,
  chatHistory: ChatRefinementMessage[],
  validationResults: GenerationValidationResult[]
): RefineGeneratedDatasetResponse {
  return {
    mode: "rejected",
    message,
    validationResults,
    warnings: [],
    chatHistory: [...chatHistory, { role: "assistant", content: message }]
  };
}

function sanitizeChatHistory(chatHistory: ChatRefinementMessage[]): ChatRefinementMessage[] {
  return chatHistory
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 2000)
    }))
    .slice(-10);
}
