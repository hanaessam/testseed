export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  enum?: string[];
  ref?: string;
  defaultValue?: string;
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
