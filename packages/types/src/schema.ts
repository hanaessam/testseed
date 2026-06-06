export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  enum?: string[];
  ref?: string;
  defaultValue?: string;
  confidence?: "high" | "medium" | "low";
  warnings?: string[];
  children?: SchemaField[];
  itemType?: string;
}

export interface CollectionSchema {
  name: string;
  fields: SchemaField[];
}

export interface ParsedSchema {
  collections: CollectionSchema[];
}

export type SchemaSource = "manual" | "mongodb" | "ai";

export interface SchemaFileInput {
  name: string;
  content: string;
}

export interface ParseSchemaRequest {
  schemaText?: string;
  schemaFiles?: SchemaFileInput[];
  projectId?: string;
  source?: SchemaSource;
}

export interface ParseSchemaResponse {
  schema: ParsedSchema;
  warnings?: string[];
}

export interface MongoSchemaDiscoveryRequest {
  connectionString: string;
  projectId?: string;
  sampleSize?: number;
}

export interface MongoConnectionTestResponse {
  ok: boolean;
  databaseName?: string;
  message: string;
}

export interface MongoCollectionSample {
  name: string;
  documents: Record<string, unknown>[];
}

export interface MongoDatabaseInspection {
  databaseName?: string;
  collections: MongoCollectionSample[];
}

export interface DiscoveredCollectionSchema extends CollectionSchema {
  sampleCount: number;
  warnings: string[];
}

export interface MongoSchemaDiscoveryResponse {
  schema: ParsedSchema;
  collections: DiscoveredCollectionSchema[];
  warnings: string[];
  databaseName?: string;
}
