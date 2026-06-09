import type {
  CandidateReview,
  ChatRefinementMessage,
  GeneratedDataset,
  GenerationPlanResponse,
  GenerationValidationResult,
  ProjectContext,
  ProjectSchemaSnapshot,
  SchemaField
} from "@testseed/types";

export type GenerationPlanView = GenerationPlanResponse;

export type PlanRiskLevel = GenerationPlanResponse["riskLevel"];

export type RefinementStatus = "idle" | "streaming" | "validating" | "error";

export type WorkbenchGenerationStatus = "idle" | "generating" | "complete" | "error";

export type CollectionProgressStatus = "pending" | "in_progress" | "complete" | "failed";

export interface CollectionProgress {
  collectionName: string;
  status: CollectionProgressStatus;
  recordCount: number;
  rowsReceived: number;
}

export interface PendingRegenerationCandidate {
  dataset: GeneratedDataset;
  message: string;
  savedDatasetId?: string;
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
  chatHistory: ChatRefinementMessage[];
  candidateReview?: CandidateReview;
}

export interface ContextSourcesView {
  hasDescription: boolean;
  descriptionPreview: string;
  hasRepository: boolean;
  repositoryLabel: string;
  genericWarning: boolean;
}

export interface CollectionTableColumn {
  fieldName: string;
  fieldType: string;
  isReference: boolean;
  schemaField?: SchemaField;
}

export interface CollectionTablePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface CollectionTableView {
  collectionName: string;
  columns: CollectionTableColumn[];
  rows: Record<string, unknown>[];
  pagination: CollectionTablePagination;
  cellValidation: Map<string, GenerationValidationResult[]>;
}

export interface AgentDockMessage {
  id: string;
  role: ChatRefinementMessage["role"] | "system";
  content: string;
  status: "complete" | "streaming" | "error";
  createdAt: string;
}

export interface GenerationWorkbenchSession {
  projectId: string;
  projectContext: ProjectContext | null;
  schemaSnapshot: ProjectSchemaSnapshot | null;
  collectionCounts: Record<string, number>;
  plan: GenerationPlanView | null;
  planRiskAcknowledged: boolean;
  dataset: GeneratedDataset | null;
  pendingCandidate: PendingRegenerationCandidate | null;
  validationResults: GenerationValidationResult[];
  chatHistory: AgentDockMessage[];
  refinementStatus: RefinementStatus;
  generationStatus: WorkbenchGenerationStatus;
  generationProgress: CollectionProgress[];
  setupRailExpanded: boolean;
  activeCollectionTab: string;
  abortController: AbortController | null;
}
