export type HealthStatus = "ok";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegistrationOtpRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyRegistrationOtpRequest {
  email: string;
  otp: string;
}

export interface RegistrationOtpResponse {
  email: string;
  expiresInSeconds: number;
  message: string;
}

export interface PendingRegistration {
  email: string;
  passwordHash: string;
  otpHash: string;
  expiresAt: Date;
  attemptsRemaining: number;
}

export type PasswordRuleId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special"
  | "match";

export interface PasswordRuleResult {
  id: PasswordRuleId;
  label: string;
  passed: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  rules: PasswordRuleResult[];
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface CurrentUserResponse {
  user: AuthUser | null;
}

export type LogoutResponse = {
  message: string;
};

export interface SchemaField {
  name: string;
  type: string; // e.g., "String", "Number", "Boolean", "Date", "ObjectId", "Array", "Mixed"
  required: boolean;
  unique: boolean;
  enum?: string[];
  ref?: string; // Referenced collection/model name if ObjectId
  defaultValue?: string;
}

export interface CollectionSchema {
  name: string; // e.g. "User", "Product"
  fields: SchemaField[];
}

export interface ParsedSchema {
  collections: CollectionSchema[];
}

export interface ParseSchemaRequest {
  schemaText: string;
  projectId?: string;
  source?: ProjectSchemaSnapshot["source"];
}

export interface ParseSchemaResponse {
  schema: ParsedSchema;
  warnings?: string[];
  project?: Project;
  snapshot?: ProjectSchemaSnapshot;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  activeSchemaVersion: number;
  activeSchemaSnapshotId?: string;
}

export interface ProjectSchemaSnapshot {
  id: string;
  projectId: string;
  version: number;
  schema: ParsedSchema;
  source: "manual" | "mongodb" | "ai";
  createdAt: Date;
}

export type ProjectEventKind =
  | "project_created"
  | "schema_parsed"
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

export interface ProjectHistoryResponse {
  project: Project | null;
  events: ProjectEvent[];
  seedBatches: SeedBatch[];
}

