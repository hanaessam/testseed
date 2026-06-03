import type { ProjectEvent, SeedBatch } from "@testseed/types";
import type { Connection } from "mongoose";
import {
  createProjectEventModel,
  type ProjectEventModel
} from "../models/project-event";
import {
  createSeedBatchModel,
  type SeedBatchModel
} from "../models/seed-batch";

export interface AppendProjectEventInput {
  projectId: string;
  actorId: string;
  kind: ProjectEvent["kind"];
  message: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export interface RecordSeedBatchInput {
  projectId: string;
  actorId: string;
  seedBatchId: string;
  collectionCounts: Record<string, number>;
  insertedDocumentIds: Record<string, string[]>;
  status: SeedBatch["status"];
  createdAt: Date;
  rolledBackAt?: Date;
}

export function createProjectHistoryRepository(connection: Connection) {
  const ProjectEventModel = createProjectEventModel(connection);
  const SeedBatchModel = createSeedBatchModel(connection);

  return {
    async appendProjectEvent(input: AppendProjectEventInput): Promise<ProjectEvent> {
      const document = await ProjectEventModel.create(input);
      return toProjectEvent(document);
    },

    async listProjectEvents(projectId: string): Promise<ProjectEvent[]> {
      const documents = await ProjectEventModel.find({ projectId }).sort({ createdAt: 1 }).exec();
      return documents.map(toProjectEvent);
    },

    async recordSeedBatch(input: RecordSeedBatchInput): Promise<SeedBatch> {
      const document = await SeedBatchModel.create(input);
      return toSeedBatch(document);
    },

    async listSeedBatches(projectId: string): Promise<SeedBatch[]> {
      const documents = await SeedBatchModel.find({ projectId }).sort({ createdAt: 1 }).exec();
      return documents.map(toSeedBatch);
    },

    async findSeedBatchBySeedBatchId(
      projectId: string,
      seedBatchId: string
    ): Promise<SeedBatch | null> {
      const document = await SeedBatchModel.findOne({ projectId, seedBatchId }).exec();
      return document ? toSeedBatch(document) : null;
    },

    async markSeedBatchRolledBack(
      projectId: string,
      seedBatchId: string,
      rolledBackAt: Date
    ): Promise<SeedBatch | null> {
      const document = await SeedBatchModel.findOneAndUpdate(
        { projectId, seedBatchId },
        { status: "rolled_back", rolledBackAt },
        { new: true }
      ).exec();

      return document ? toSeedBatch(document) : null;
    },

    async hardDeleteProjectHistory(projectId: string): Promise<number> {
      const [eventsResult, seedBatchesResult] = await Promise.all([
        ProjectEventModel.deleteMany({ projectId }).exec(),
        SeedBatchModel.deleteMany({ projectId }).exec()
      ]);

      return eventsResult.deletedCount + seedBatchesResult.deletedCount;
    }
  };
}

function toProjectEvent(document: {
  _id: unknown;
  projectId: string;
  actorId: string;
  kind: ProjectEvent["kind"];
  message: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}): ProjectEvent {
  return {
    id: String(document._id),
    projectId: document.projectId,
    actorId: document.actorId,
    kind: document.kind,
    message: document.message,
    payload: document.payload,
    createdAt: document.createdAt
  };
}

function toSeedBatch(document: {
  _id: unknown;
  projectId: string;
  actorId: string;
  seedBatchId: string;
  collectionCounts: Record<string, number>;
  insertedDocumentIds: Record<string, string[]>;
  status: SeedBatch["status"];
  createdAt: Date;
  rolledBackAt?: Date;
}): SeedBatch {
  return {
    id: String(document._id),
    projectId: document.projectId,
    actorId: document.actorId,
    seedBatchId: document.seedBatchId,
    collectionCounts: document.collectionCounts,
    insertedDocumentIds: document.insertedDocumentIds,
    status: document.status,
    createdAt: document.createdAt,
    rolledBackAt: document.rolledBackAt
  };
}
