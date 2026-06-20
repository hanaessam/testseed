import type { ChatRefinementMessage, SavedGeneratedDatasetSource } from "@testseed/types";
import { Schema, type Connection, type HydratedDocument, type Model } from "mongoose";

export interface GeneratedDatasetRecordDocumentShape {
  projectId: string;
  actorId: string;
  schemaSnapshotId: string;
  status: "valid" | "invalid" | "failed";
  source: SavedGeneratedDatasetSource;
  generationOrder: string[];
  collectionCounts: Record<string, number>;
  collections: Record<string, Array<Record<string, unknown>>>;
  validationResults: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  chatHistory: ChatRefinementMessage[];
  createdAt: Date;
  parentDatasetId?: string;
  versionLabel?: string;
}

export type GeneratedDatasetRecordDocument = HydratedDocument<GeneratedDatasetRecordDocumentShape>;
export type GeneratedDatasetRecordModel = Model<GeneratedDatasetRecordDocumentShape>;

const generatedDatasetRecordSchema = new Schema<GeneratedDatasetRecordDocumentShape>(
  {
    projectId: {
      type: String,
      required: true,
      index: true
    },
    actorId: {
      type: String,
      required: true,
      index: true
    },
    schemaSnapshotId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ["valid", "invalid", "failed"]
    },
    source: {
      type: String,
      required: true,
      enum: ["generation", "refinement", "manual_edit"]
    },
    generationOrder: {
      type: [String],
      required: true
    },
    collectionCounts: {
      type: Schema.Types.Mixed,
      required: true
    },
    collections: {
      type: Schema.Types.Mixed,
      required: true
    },
    validationResults: {
      type: Schema.Types.Mixed,
      required: true,
      default: []
    },
    warnings: {
      type: Schema.Types.Mixed,
      required: true,
      default: []
    },
    chatHistory: {
      type: Schema.Types.Mixed,
      required: true,
      default: []
    },
    createdAt: {
      type: Date,
      required: true,
      index: true
    },
    parentDatasetId: {
      type: String,
      required: false,
      index: true
    },
    versionLabel: {
      type: String,
      required: false
    }
  },
  {
    collection: "generated_dataset_records"
  }
);

generatedDatasetRecordSchema.index({ projectId: 1, createdAt: -1 });

export function createGeneratedDatasetRecordModel(
  connection: Connection
): GeneratedDatasetRecordModel {
  return (
    connection.models.GeneratedDatasetRecord ??
    connection.model<GeneratedDatasetRecordDocumentShape>(
      "GeneratedDatasetRecord",
      generatedDatasetRecordSchema
    )
  );
}
