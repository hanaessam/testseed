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

export interface JavaScriptSeedScriptRequest {
  schema: ParsedSchema;
  dataset: GeneratedDataset;
  collectionCounts?: Record<string, number>;
}

export type JavaScriptSeedScriptErrorCode =
  | "SCRIPT_EXPORT_DATASET_EMPTY"
  | "SCRIPT_EXPORT_VALIDATION_FAILED"
  | "SCRIPT_EXPORT_UNRESOLVED_REFERENCE"
  | "SCRIPT_EXPORT_DEPENDENCY_ORDER_UNSAFE";

export interface JavaScriptSeedScriptErrorDetails {
  code: JavaScriptSeedScriptErrorCode;
  message: string;
  validationResults?: GenerationValidationResult[];
}

export interface JavaScriptSeedScriptResult {
  script: string;
  orderedCollections: string[];
  warnings: GenerationValidationResult[];
}

export type DirectMongoSeedingErrorCode =
  | "DIRECT_SEED_CONNECTION_STRING_REQUIRED"
  | "DIRECT_SEED_CONNECTION_FAILED"
  | "DIRECT_SEED_CONNECTION_TEST_REQUIRED"
  | "DIRECT_SEED_CONFIRMATION_REQUIRED"
  | "DIRECT_SEED_DATASET_EMPTY"
  | "DIRECT_SEED_VALIDATION_FAILED"
  | "DIRECT_SEED_GENERATION_ORDER_UNSAFE";

export interface DirectMongoSeedingErrorDetails {
  code: DirectMongoSeedingErrorCode;
  message: string;
  validationResults?: GenerationValidationResult[];
}

export interface DirectMongoConnectionTestRequest {
  connectionString?: string;
  timeoutMs?: number;
}

export interface DirectMongoConnectionTestResult {
  ok: boolean;
  databaseName?: string;
  connectionTestToken?: string;
  connectionFingerprint?: string;
  message: string;
  errorSummary?: string;
}

export interface DirectSeedingConfirmationRequest {
  targetDatabaseName: string;
  dataset: GeneratedDataset;
}

export interface DirectSeedingConfirmationSummary {
  targetDatabaseName: string;
  orderedCollections: string[];
  collectionCounts: Record<string, number>;
  totalRecordCount: number;
  warning: string;
}

export interface DirectSeedingRequest {
  connectionString?: string;
  connectionTestToken?: string;
  schema: ParsedSchema;
  dataset: GeneratedDataset;
  targetDatabaseName: string;
  confirmed: boolean;
  timeoutMs?: number;
}

export interface DirectSeedingConfirmationApiRequest {
  schemaSnapshotId: string;
  connectionTestToken: string;
  targetDatabaseName: string;
  dataset: GeneratedDataset;
}

export interface DirectSeedingExecuteApiRequest {
  schemaSnapshotId: string;
  connectionString?: string;
  connectionTestToken?: string;
  dataset: GeneratedDataset;
  targetDatabaseName: string;
  confirmed: boolean;
  timeoutMs?: number;
}

export interface DirectSeedingExecuteApiResponse {
  report: DirectSeedingReport;
  seedBatch?: import("./projects").SeedBatch;
  historyWarning?: string;
}

export type InsertedCollectionStatus = "succeeded" | "failed";

export interface InsertedCollectionResult {
  collectionName: string;
  requestedCount: number;
  insertedCount: number;
  status: InsertedCollectionStatus;
  errorSummary?: string;
}

export interface DirectSeedingRollbackCollection {
  collectionName: string;
  insertedCount: number;
}

export interface DirectSeedingRollbackMetadata {
  seedBatchId: string;
  collections: DirectSeedingRollbackCollection[];
}

export interface DirectSeedingReport {
  seedBatchId: string;
  targetDatabaseName: string;
  successfulCollections: InsertedCollectionResult[];
  failedCollections: InsertedCollectionResult[];
  insertedRecordCounts: Record<string, number>;
  totalInsertedCount: number;
  insertedDocumentIds?: Record<string, string[]>;
  rollback: DirectSeedingRollbackMetadata;
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

export type CandidateChangeSummaryStatus = "changed" | "unchanged" | "partial" | "invalid";

export interface CandidateFieldChangeSummary {
  collectionName: string;
  fieldName: string;
  count: number;
}

export interface CandidateChangeSummary {
  status: CandidateChangeSummaryStatus;
  collectionsChanged: string[];
  notableFieldsChanged: CandidateFieldChangeSummary[];
  preservedCollections: string[];
  appliedFeedbackSummary: string;
  skippedFeedbackSummary?: string;
  noMeaningfulChanges: boolean;
}

export type CandidateReviewState =
  | "pending_review"
  | "accepted"
  | "rejected"
  | "invalid"
  | "awaiting_revised_feedback";

export interface CandidateReview {
  state: CandidateReviewState;
  retryAttempt: number;
  changeSummary?: CandidateChangeSummary;
}

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
  candidateReview?: CandidateReview;
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
  chatHistory?: ChatRefinementMessage[];
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
