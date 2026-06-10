import type { ParsedSchema, SchemaSource } from "./schema";

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  context?: ProjectContext;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  activeSchemaVersion: number;
  activeSchemaSnapshotId?: string;
}

export type ContextWarningSeverity = "info" | "warning" | "error";

export interface ContextWarning {
  code: string;
  message: string;
  severity: ContextWarningSeverity;
}

export type RepositoryContextCategory =
  | "schemas"
  | "models"
  | "seed_scripts"
  | "documentation"
  | "domain_terms";

export type RepositoryContextAccessStatus =
  | "connected"
  | "unauthorized"
  | "unavailable"
  | "too_large"
  | "no_useful_context";

export interface RepositoryContextSource {
  provider: "github";
  repositoryFullName: string;
  repositoryUrl: string;
  accessStatus: RepositoryContextAccessStatus;
  summary: string;
  contextCategories: RepositoryContextCategory[];
  warnings: ContextWarning[];
  connectedAt: Date;
}

export interface ProjectContext {
  description?: string;
  repository?: RepositoryContextSource;
  warnings: ContextWarning[];
  updatedAt: Date;
}

export interface ProjectSchemaSnapshot {
  id: string;
  projectId: string;
  version: number;
  schema: ParsedSchema;
  source: SchemaSource;
  createdAt: Date;
  archivedAt?: Date;
}

export type ProjectEventKind =
  | "project_created"
  | "project_updated"
  | "project_context_updated"
  | "project_archived"
  | "project_restored"
  | "project_hard_deleted"
  | "schema_parsed"
  | "schema_archived"
  | "schema_restored"
  | "schema_hard_deleted"
  | "chat_message"
  | "generation_requested"
  | "generation_completed"
  | "seed_batch_recorded"
  | "rollback_requested"
  | "rollback_completed"
  | "repository_context_connected"
  | "repository_context_removed";

export interface ProjectEvent {
  id: string;
  projectId: string;
  actorId: string;
  kind: ProjectEventKind;
  message: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export interface SeedBatch {
  id: string;
  projectId: string;
  actorId: string;
  seedBatchId: string;
  collectionCounts: Record<string, number>;
  insertedDocumentIds: Record<string, string[]>;
  collectionOrder: string[];
  status: "pending" | "inserted" | "partially_inserted" | "rolled_back";
  createdAt: Date;
  rolledBackAt?: Date;
  rollbackDeletedCounts?: Record<string, number>;
}

export type RollbackSeedBatchErrorCode =
  | "ROLLBACK_SEED_BATCH_ID_REQUIRED"
  | "ROLLBACK_SEED_BATCH_ID_INVALID"
  | "ROLLBACK_BATCH_NOT_FOUND"
  | "ROLLBACK_BATCH_ALREADY_ROLLED_BACK"
  | "ROLLBACK_BATCH_HAS_NO_RECORDS";

export interface RollbackSeedBatchErrorDetails {
  code: RollbackSeedBatchErrorCode;
  message: string;
}

export type RollbackCollectionStatus = "deleted" | "failed";

export interface RollbackCollectionResult {
  collectionName: string;
  status: RollbackCollectionStatus;
  deletedCount?: number;
  error?: string;
}

export interface RollbackSeedBatchReport {
  seedBatchId: string;
  status: "rolled_back" | "partial_failure";
  deletedCounts: Record<string, number>;
  completedCollections: RollbackCollectionResult[];
  processedOrder: string[];
  rolledBackAt?: Date;
  failedCollection?: RollbackCollectionResult;
}

export interface ListProjectsResponse {
  projects: Project[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateProjectResponse {
  project: Project;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface UpdateProjectResponse {
  project: Project;
}

export interface UpdateProjectContextRequest {
  description?: string;
  clearRepositoryContext?: boolean;
}

export interface UpdateProjectContextResponse {
  project: Project;
}

export interface StartRepositoryContextAuthorizationRequest {
  repositoryFullName: string;
}

export interface StartRepositoryContextAuthorizationResponse {
  authorizationUrl: string;
  message: string;
}

export interface RemoveRepositoryContextResponse {
  context: ProjectContext;
}

export type DeleteMode = "archive" | "hard";

export interface DeleteProjectRequest {
  mode: DeleteMode;
}

export interface DeleteProjectResponse {
  projectId: string;
  mode: DeleteMode;
  project?: Project;
  deleted: boolean;
}

export interface RestoreProjectResponse {
  project: Project;
}

export interface UpdateProjectSchemaRequest {
  schema: ParsedSchema;
  source?: SchemaSource;
}

export interface UpdateProjectSchemaResponse {
  project: Project;
  snapshot: ProjectSchemaSnapshot;
}

export interface DeleteProjectSchemaRequest {
  mode: DeleteMode;
}

export interface DeleteProjectSchemaResponse {
  project: Project;
  snapshotId?: string;
  mode: DeleteMode;
  deleted: boolean;
}

export interface RestoreProjectSchemaResponse {
  project: Project;
  snapshot?: ProjectSchemaSnapshot;
}

export interface ProjectHistoryResponse {
  project: Project | null;
  events: ProjectEvent[];
  seedBatches: SeedBatch[];
}

export interface ProjectDetailResponse {
  project: Project | null;
  activeSchemaSnapshot?: ProjectSchemaSnapshot;
}
