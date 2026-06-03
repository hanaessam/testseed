import type { ParsedSchema, SchemaSource } from "./schema";

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  activeSchemaVersion: number;
  activeSchemaSnapshotId?: string;
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
  | "rollback_completed";

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
  status: "pending" | "inserted" | "partially_inserted" | "rolled_back";
  createdAt: Date;
  rolledBackAt?: Date;
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
