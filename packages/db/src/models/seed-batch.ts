import type { SeedBatch } from "@testseed/types";
import { Schema, type Connection, type HydratedDocument, type Model } from "mongoose";

export type SeedBatchDocument = HydratedDocument<Omit<SeedBatch, "id">>;
export type SeedBatchModel = Model<Omit<SeedBatch, "id">>;

const seedBatchSchema = new Schema<Omit<SeedBatch, "id">>(
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
    seedBatchId: {
      type: String,
      required: true,
      index: true
    },
    collectionCounts: {
      type: Schema.Types.Mixed,
      required: true
    },
    insertedDocumentIds: {
      type: Schema.Types.Mixed,
      required: true
    },
    collectionOrder: {
      type: [String],
      required: true,
      default: []
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "inserted", "partially_inserted", "rolled_back"]
    },
    createdAt: {
      type: Date,
      required: true,
      index: true
    },
    rolledBackAt: {
      type: Date,
      required: false
    },
    rollbackDeletedCounts: {
      type: Schema.Types.Mixed,
      required: false
    }
  },
  {
    collection: "seed_batches"
  }
);

seedBatchSchema.index({ projectId: 1, seedBatchId: 1 }, { unique: true });

export function createSeedBatchModel(connection: Connection): SeedBatchModel {
  return connection.models.SeedBatch ?? connection.model<Omit<SeedBatch, "id">>("SeedBatch", seedBatchSchema);
}
