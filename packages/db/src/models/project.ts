import type { Project } from "@testseed/types";
import { Schema, type Connection, type HydratedDocument, type Model } from "mongoose";

export type ProjectDocument = HydratedDocument<Omit<Project, "id">>;
export type ProjectModel = Model<Omit<Project, "id">>;

const projectSchema = new Schema<Omit<Project, "id">>(
  {
    ownerId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: false
    },
    context: {
      type: Schema.Types.Mixed,
      required: false
    },
    createdAt: {
      type: Date,
      required: true
    },
    updatedAt: {
      type: Date,
      required: true
    },
    archivedAt: {
      type: Date,
      required: false,
      index: true
    },
    activeSchemaVersion: {
      type: Number,
      required: true,
      default: 0
    },
    activeSchemaSnapshotId: {
      type: String,
      required: false
    }
  },
  {
    collection: "projects"
  }
);

export function createProjectModel(connection: Connection): ProjectModel {
  return connection.models.Project ?? connection.model<Omit<Project, "id">>("Project", projectSchema);
}
