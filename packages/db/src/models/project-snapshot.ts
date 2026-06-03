import type { ProjectSchemaSnapshot } from "@testseed/types";
import { Schema, type Connection, type HydratedDocument, type Model } from "mongoose";

export type ProjectSnapshotDocument = HydratedDocument<Omit<ProjectSchemaSnapshot, "id">>;
export type ProjectSnapshotModel = Model<Omit<ProjectSchemaSnapshot, "id">>;

const projectSnapshotSchema = new Schema<Omit<ProjectSchemaSnapshot, "id">>(
  {
    projectId: {
      type: String,
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true
    },
    schema: {
      type: Schema.Types.Mixed,
      required: true
    },
    source: {
      type: String,
      required: true,
      enum: ["manual", "mongodb", "ai"]
    },
    createdAt: {
      type: Date,
      required: true
    },
    archivedAt: {
      type: Date,
      required: false
    }
  },
  {
    collection: "project_snapshots"
  }
);

projectSnapshotSchema.index({ projectId: 1, version: 1 }, { unique: true });

export function createProjectSnapshotModel(connection: Connection): ProjectSnapshotModel {
  return (
    connection.models.ProjectSnapshot ??
    connection.model<Omit<ProjectSchemaSnapshot, "id">>("ProjectSnapshot", projectSnapshotSchema)
  );
}
