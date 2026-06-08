import type { ChatRefinementMessage, Project, SavedGeneratedDataset } from "@testseed/types";

const MAX_CHAT_HISTORY_MESSAGES = 50;

export interface UpdateSavedGeneratedDatasetChatHistoryRequest {
  projectId: string;
  datasetId: string;
  ownerId: string;
  chatHistory: ChatRefinementMessage[];
}

export interface UpdateSavedGeneratedDatasetChatHistoryDeps {
  findProjectById(projectId: string): Promise<Project | null>;
  updateGeneratedDatasetChatHistory(
    projectId: string,
    datasetId: string,
    chatHistory: ChatRefinementMessage[]
  ): Promise<SavedGeneratedDataset | null>;
}

export async function updateSavedGeneratedDatasetChatHistory(
  request: UpdateSavedGeneratedDatasetChatHistoryRequest,
  deps: UpdateSavedGeneratedDatasetChatHistoryDeps
): Promise<SavedGeneratedDataset> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const chatHistory = sanitizePersistedChatHistory(request.chatHistory);
  const updated = await deps.updateGeneratedDatasetChatHistory(
    request.projectId,
    request.datasetId,
    chatHistory
  );

  if (!updated) {
    throw new Error(`Saved dataset ${request.datasetId} was not found`);
  }

  return updated;
}

export function sanitizePersistedChatHistory(
  chatHistory: ChatRefinementMessage[]
): ChatRefinementMessage[] {
  return chatHistory
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2000)
    }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_CHAT_HISTORY_MESSAGES);
}
