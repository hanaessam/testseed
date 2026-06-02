import type { ProjectEvent } from "@testseed/types";
import { Schema, type Connection, type HydratedDocument, type Model } from "mongoose";

export type ProjectEventDocument = HydratedDocument<Omit<ProjectEvent, "id">>;
export type ProjectEventModel = Model<Omit<ProjectEvent, "id">>;

const projectEventSchema = new Schema<Omit<ProjectEvent, "id">>(
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
    kind: {
      type: String,
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true
    },
    payload: {
      type: Schema.Types.Mixed,
      required: false
    },
    createdAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    collection: "project_events"
  }
);

export function createProjectEventModel(connection: Connection): ProjectEventModel {
  return (
    connection.models.ProjectEvent ??
    connection.model<Omit<ProjectEvent, "id">>("ProjectEvent", projectEventSchema)
  );
}
