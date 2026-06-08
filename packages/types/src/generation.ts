import type { ParsedSchema } from "./schema";

export type GenerationStatus = "valid" | "invalid" | "failed";

export type GenerationValidationSeverity = "error" | "warning";

export interface GenerationValidationResult {
  severity: GenerationValidationSeverity;
  collectionName?: string;
  recordId?: string;
  fieldName?: string;
  code: string;
  message: string;
  suggestedAction?: string;
}

export interface GeneratedRecord {
  _id: string;
  [fieldName: string]: unknown;
}

export interface GeneratedDataset {
  projectId: string;
  schemaSnapshotId: string;
  status: GenerationStatus;
  generationOrder: string[];
  collectionCounts: Record<string, number>;
  collections: Record<string, GeneratedRecord[]>;
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
  createdAt: string;
}

export interface GenerateSeedDataRequest {
  collectionCounts: Record<string, number>;
}

export interface GenerateSeedDataResponse {
  dataset: GeneratedDataset;
  message: string;
  savedDatasetId?: string;
}

export interface GenerationProviderRequest {
  projectId: string;
  schemaSnapshotId: string;
  schema: ParsedSchema;
  projectContext?: string;
  repositoryContext?: string;
  collectionCounts: Record<string, number>;
  generationOrder: string[];
  validationFeedback?: GenerationValidationResult[];
}

export interface GenerationProviderResponse {
  collections: Record<string, GeneratedRecord[]>;
  message?: string;
}

export interface ChatRefinementMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RefineGeneratedDatasetRequest {
  currentDataset: GeneratedDataset;
  message: string;
  chatHistory?: ChatRefinementMessage[];
  savedDatasetId?: string;
}

export type RefinementMode = "updated_dataset" | "guidance" | "rejected";

export type FeedbackRegenerationMode = "accepted" | "partial" | "rejected" | "cancelled";

export interface FeedbackRegenerationRequest {
  acceptedDataset: GeneratedDataset;
  feedback: string;
  chatHistory?: ChatRefinementMessage[];
  savedDatasetId?: string;
  projectContext?: string;
  schemaContext?: string;
  collectionCounts?: Record<string, number>;
}

export interface FeedbackRegenerationResponse {
  mode: FeedbackRegenerationMode;
  message: string;
  dataset?: GeneratedDataset;
  savedDatasetId?: string;
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
  chatHistory: ChatRefinementMessage[];
}

export interface RefinementProviderRequest {
  projectId: string;
  schemaSnapshotId: string;
  schema: ParsedSchema;
  projectContext?: string;
  repositoryContext?: string;
  currentDataset: GeneratedDataset;
  message: string;
  chatHistory: ChatRefinementMessage[];
  validationFeedback?: GenerationValidationResult[];
}

export interface RefinementProviderResponse {
  mode: "updated_dataset" | "guidance";
  message: string;
  collections?: Record<string, GeneratedRecord[]>;
}

export interface RefineGeneratedDatasetResponse {
  mode: RefinementMode;
  message: string;
  dataset?: GeneratedDataset;
  savedDatasetId?: string;
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
  chatHistory: ChatRefinementMessage[];
}

export type GenerationPlanRiskLevel = "none" | "elevated";

export interface GenerationPlanReferenceField {
  fieldName: string;
  referencedCollection: string;
}

export interface GenerationPlanItem {
  collectionName: string;
  count: number;
  dependencyOrder: number;
  referenceFields: GenerationPlanReferenceField[];
  warnings: GenerationValidationResult[];
}

export interface GenerationPlanResponse {
  orderedCollections: string[];
  items: GenerationPlanItem[];
  totalRecords: number;
  blockingWarnings: GenerationValidationResult[];
  riskLevel: GenerationPlanRiskLevel;
}

export type SavedGeneratedDatasetSource = "generation" | "refinement" | "manual_edit";

export type FieldInputKind = "text" | "number" | "boolean" | "date" | "enum" | "readonly";

export interface DatasetCellEdit {
  collectionName: string;
  recordId: string;
  fieldName: string;
  rawValue: string;
}

export interface DatasetCellEditRequest {
  schemaSnapshotId: string;
  collectionCounts: Record<string, number>;
  dataset: GeneratedDataset;
  edit: DatasetCellEdit;
}

export interface DatasetCellEditResponse {
  dataset: GeneratedDataset;
  status: Exclude<GenerationStatus, "failed">;
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
}

export interface ValidateDatasetRequest {
  schemaSnapshotId: string;
  collectionCounts: Record<string, number>;
  dataset: GeneratedDataset;
}

export interface ValidateDatasetResponse {
  dataset: GeneratedDataset;
  status: Exclude<GenerationStatus, "failed">;
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
}

export interface PatchSavedGeneratedDatasetRequest {
  dataset: GeneratedDataset;
}

export interface PatchSavedGeneratedDatasetResponse {
  dataset: SavedGeneratedDataset;
}

export interface SaveManualEditDatasetRequest {
  dataset: GeneratedDataset;
  chatHistory?: ChatRefinementMessage[];
}

export interface SavedGeneratedDatasetSummary {
  id: string;
  projectId: string;
  schemaSnapshotId: string;
  status: GenerationStatus;
  source: SavedGeneratedDatasetSource;
  collectionCounts: Record<string, number>;
  totalRecords: number;
  chatMessageCount: number;
  createdAt: string;
}

export interface SavedGeneratedDataset extends GeneratedDataset {
  id: string;
  source: SavedGeneratedDatasetSource;
  chatHistory: ChatRefinementMessage[];
}

export interface ListSavedGeneratedDatasetsResponse {
  datasets: SavedGeneratedDatasetSummary[];
}

export interface GetSavedGeneratedDatasetResponse {
  dataset: SavedGeneratedDataset;
}
