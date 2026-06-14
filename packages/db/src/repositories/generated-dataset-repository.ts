import type {
  ChatRefinementMessage,
  GeneratedDataset,
  GenerationValidationResult,
  SavedGeneratedDataset,
  SavedGeneratedDatasetSource,
  SavedGeneratedDatasetSummary
} from "@testseed/types";
import type { Connection } from "mongoose";
import {
  createGeneratedDatasetRecordModel,
  type GeneratedDatasetRecordDocumentShape
} from "../models/generated-dataset-record";

export interface CreateGeneratedDatasetRecordInput {
  projectId: string;
  actorId: string;
  schemaSnapshotId: string;
  status: GeneratedDataset["status"];
  source: SavedGeneratedDatasetSource;
  generationOrder: string[];
  collectionCounts: Record<string, number>;
  collections: GeneratedDataset["collections"];
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
  chatHistory: ChatRefinementMessage[];
  createdAt: Date;
  parentDatasetId?: string;
  versionLabel?: string;
}

export function createGeneratedDatasetRepository(connection: Connection) {
  const GeneratedDatasetRecordModel = createGeneratedDatasetRecordModel(connection);

  return {
    async createGeneratedDatasetRecord(
      input: CreateGeneratedDatasetRecordInput
    ): Promise<SavedGeneratedDataset> {
      const document = await GeneratedDatasetRecordModel.create(input);
      return toSavedGeneratedDataset(document);
    },

    async listGeneratedDatasetSummaries(
      projectId: string
    ): Promise<SavedGeneratedDatasetSummary[]> {
      const documents = await GeneratedDatasetRecordModel.find({ projectId })
        .sort({ createdAt: -1 })
        .select({
          projectId: 1,
          schemaSnapshotId: 1,
          status: 1,
          source: 1,
          collectionCounts: 1,
          collections: 1,
          chatHistory: 1,
          createdAt: 1,
          parentDatasetId: 1,
          versionLabel: 1
        })
        .exec();

      return documents.map(toSavedGeneratedDatasetSummary);
    },

    async findGeneratedDatasetById(
      projectId: string,
      datasetId: string
    ): Promise<SavedGeneratedDataset | null> {
      const document = await GeneratedDatasetRecordModel.findOne({
        _id: datasetId,
        projectId
      }).exec();

      return document ? toSavedGeneratedDataset(document) : null;
    },

    async updateGeneratedDatasetChatHistory(
      projectId: string,
      datasetId: string,
      chatHistory: ChatRefinementMessage[]
    ): Promise<SavedGeneratedDataset | null> {
      const document = await GeneratedDatasetRecordModel.findOneAndUpdate(
        { _id: datasetId, projectId },
        { $set: { chatHistory } },
        { new: true }
      ).exec();

      return document ? toSavedGeneratedDataset(document) : null;
    },

    async updateGeneratedDatasetRecord(input: {
      projectId: string;
      datasetId: string;
      status: GeneratedDataset["status"];
      generationOrder: string[];
      collectionCounts: Record<string, number>;
      collections: GeneratedDataset["collections"];
      validationResults: GenerationValidationResult[];
      warnings: GenerationValidationResult[];
    }): Promise<SavedGeneratedDataset | null> {
      const document = await GeneratedDatasetRecordModel.findOneAndUpdate(
        { _id: input.datasetId, projectId: input.projectId },
        {
          $set: {
            status: input.status,
            generationOrder: input.generationOrder,
            collectionCounts: input.collectionCounts,
            collections: input.collections,
            validationResults: input.validationResults,
            warnings: input.warnings
          }
        },
        { new: true }
      ).exec();

      return document ? toSavedGeneratedDataset(document) : null;
    },

    async hardDeleteGeneratedDatasetsByProject(projectId: string): Promise<number> {
      const result = await GeneratedDatasetRecordModel.deleteMany({ projectId }).exec();
      return result.deletedCount;
    }
  };
}

function toSavedGeneratedDatasetSummary(
  document: Pick<
    GeneratedDatasetRecordDocumentShape,
    | "projectId"
    | "schemaSnapshotId"
    | "status"
    | "source"
    | "collectionCounts"
    | "collections"
    | "chatHistory"
    | "createdAt"
    | "parentDatasetId"
    | "versionLabel"
  > & { _id: unknown }
): SavedGeneratedDatasetSummary {
  return {
    id: String(document._id),
    projectId: document.projectId,
    schemaSnapshotId: document.schemaSnapshotId,
    status: document.status,
    source: document.source,
    collectionCounts: document.collectionCounts,
    totalRecords: countTotalRecords(document.collections),
    chatMessageCount: document.chatHistory?.length ?? 0,
    createdAt: document.createdAt.toISOString(),
    parentDatasetId: document.parentDatasetId,
    versionLabel: document.versionLabel
  };
}

function toSavedGeneratedDataset(
  document: GeneratedDatasetRecordDocumentShape & { _id: unknown }
): SavedGeneratedDataset {
  return {
    id: String(document._id),
    projectId: document.projectId,
    schemaSnapshotId: document.schemaSnapshotId,
    status: document.status,
    source: document.source,
    generationOrder: document.generationOrder,
    collectionCounts: document.collectionCounts,
    collections: document.collections as SavedGeneratedDataset["collections"],
    validationResults: document.validationResults as unknown as GenerationValidationResult[],
    warnings: document.warnings as unknown as GenerationValidationResult[],
    chatHistory: (document.chatHistory ?? []) as ChatRefinementMessage[],
    createdAt: document.createdAt.toISOString(),
    parentDatasetId: document.parentDatasetId,
    versionLabel: document.versionLabel
  };
}

function countTotalRecords(collections: Record<string, unknown[]>) {
  return Object.values(collections).reduce((total, records) => total + records.length, 0);
}
