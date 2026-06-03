import type { ParsedSchema, Project, ProjectContext, ProjectSchemaSnapshot } from "@testseed/types";
import type { Connection } from "mongoose";
import {
  createProjectModel,
  type ProjectModel
} from "../models/project";
import {
  createProjectSnapshotModel,
  type ProjectSnapshotModel
} from "../models/project-snapshot";

export interface CreateProjectInput {
  ownerId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveSchemaSnapshotInput {
  projectId: string;
  version: number;
  schema: ParsedSchema;
  source: ProjectSchemaSnapshot["source"];
  createdAt: Date;
}

export interface UpdateProjectRecordInput {
  name?: string;
  description?: string;
  updatedAt: Date;
}

export interface UpdateProjectContextRecordInput {
  description?: string;
  context: ProjectContext;
  updatedAt: Date;
}

export function createProjectRepository(connection: Connection) {
  const ProjectModel = createProjectModel(connection);
  const ProjectSnapshotModel = createProjectSnapshotModel(connection);

  return {
    async createProject(input: CreateProjectInput): Promise<Project> {
      const document = await ProjectModel.create({
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        activeSchemaVersion: 0
      });

      return toProject(document);
    },

    async findProjectById(projectId: string): Promise<Project | null> {
      const document = await ProjectModel.findById(projectId).exec();
      return document ? toProject(document) : null;
    },

    async listProjectsByOwnerId(ownerId: string, includeArchived = false): Promise<Project[]> {
      const filter = includeArchived ? { ownerId } : { ownerId, archivedAt: { $exists: false } };
      const documents = await ProjectModel.find(filter).sort({ updatedAt: -1 }).exec();
      return documents.map(toProject);
    },

    async updateProjectRecord(
      projectId: string,
      input: UpdateProjectRecordInput
    ): Promise<Project> {
      const update: Record<string, unknown> = {
        updatedAt: input.updatedAt
      };

      if (input.name !== undefined) {
        update.name = input.name;
      }

      if (input.description !== undefined) {
        update.description = input.description;
      }

      const document = await ProjectModel.findByIdAndUpdate(projectId, update, {
        new: true
      }).exec();

      if (!document) {
        throw new Error(`Project ${projectId} was not found`);
      }

      return toProject(document);
    },

    async updateProjectContextRecord(
      projectId: string,
      input: UpdateProjectContextRecordInput
    ): Promise<Project> {
      const update: Record<string, unknown> = {
        description: input.description,
        context: input.context,
        updatedAt: input.updatedAt
      };

      if (input.description === undefined) {
        update.$unset = { description: "" };
        delete update.description;
      }

      const document = await ProjectModel.findByIdAndUpdate(projectId, update, {
        new: true
      }).exec();

      if (!document) {
        throw new Error(`Project ${projectId} was not found`);
      }

      return toProject(document);
    },

    async removeProjectRepositoryContext(
      projectId: string,
      context: ProjectContext,
      updatedAt: Date
    ): Promise<Project> {
      const document = await ProjectModel.findByIdAndUpdate(
        projectId,
        {
          context,
          updatedAt
        },
        { new: true }
      ).exec();

      if (!document) {
        throw new Error(`Project ${projectId} was not found`);
      }

      return toProject(document);
    },

    async saveSchemaSnapshot(input: SaveSchemaSnapshotInput): Promise<ProjectSchemaSnapshot> {
      const document = await ProjectSnapshotModel.create({
        projectId: input.projectId,
        version: input.version,
        schema: input.schema,
        source: input.source,
        createdAt: input.createdAt
      });

      return toProjectSchemaSnapshot(document);
    },

    async findSchemaSnapshotById(snapshotId: string): Promise<ProjectSchemaSnapshot | null> {
      const document = await ProjectSnapshotModel.findById(snapshotId).exec();
      return document ? toProjectSchemaSnapshot(document) : null;
    },

    async archiveProjectRecord(projectId: string, archivedAt: Date): Promise<Project> {
      const document = await ProjectModel.findByIdAndUpdate(
        projectId,
        {
          archivedAt,
          updatedAt: archivedAt
        },
        { new: true }
      ).exec();

      if (!document) {
        throw new Error(`Project ${projectId} was not found`);
      }

      return toProject(document);
    },

    async restoreProjectRecord(projectId: string, updatedAt: Date): Promise<Project> {
      const document = await ProjectModel.findByIdAndUpdate(
        projectId,
        {
          $unset: { archivedAt: "" },
          updatedAt
        },
        { new: true }
      ).exec();

      if (!document) {
        throw new Error(`Project ${projectId} was not found`);
      }

      return toProject(document);
    },

    async hardDeleteProjectRecord(projectId: string): Promise<boolean> {
      const result = await ProjectModel.deleteOne({ _id: projectId }).exec();
      return result.deletedCount > 0;
    },

    async hardDeleteProjectSnapshots(projectId: string): Promise<number> {
      const result = await ProjectSnapshotModel.deleteMany({ projectId }).exec();
      return result.deletedCount;
    },

    async archiveSchemaSnapshot(
      snapshotId: string,
      archivedAt: Date
    ): Promise<ProjectSchemaSnapshot | null> {
      const document = await ProjectSnapshotModel.findByIdAndUpdate(
        snapshotId,
        { archivedAt },
        { new: true }
      ).exec();

      return document ? toProjectSchemaSnapshot(document) : null;
    },

    async findLatestArchivedSchemaSnapshotByProjectId(
      projectId: string
    ): Promise<ProjectSchemaSnapshot | null> {
      const document = await ProjectSnapshotModel.findOne({
        projectId,
        archivedAt: { $exists: true }
      })
        .sort({ version: -1 })
        .exec();

      return document ? toProjectSchemaSnapshot(document) : null;
    },

    async restoreSchemaSnapshot(
      snapshotId: string,
      _updatedAt: Date
    ): Promise<ProjectSchemaSnapshot | null> {
      const document = await ProjectSnapshotModel.findByIdAndUpdate(
        snapshotId,
        { $unset: { archivedAt: "" } },
        { new: true }
      ).exec();

      return document ? toProjectSchemaSnapshot(document) : null;
    },

    async hardDeleteSchemaSnapshot(snapshotId: string): Promise<boolean> {
      const result = await ProjectSnapshotModel.deleteOne({ _id: snapshotId }).exec();
      return result.deletedCount > 0;
    },

    async clearProjectActiveSchema(projectId: string, updatedAt: Date): Promise<Project> {
      const document = await ProjectModel.findByIdAndUpdate(
        projectId,
        {
          activeSchemaVersion: 0,
          $unset: { activeSchemaSnapshotId: "" },
          updatedAt
        },
        { new: true }
      ).exec();

      if (!document) {
        throw new Error(`Project ${projectId} was not found`);
      }

      return toProject(document);
    },

    async updateProjectActiveSchema(
      projectId: string,
      input: {
        version: number;
        activeSchemaSnapshotId: string;
        updatedAt: Date;
      }
    ): Promise<Project> {
      const document = await ProjectModel.findByIdAndUpdate(
        projectId,
        {
          activeSchemaVersion: input.version,
          activeSchemaSnapshotId: input.activeSchemaSnapshotId,
          updatedAt: input.updatedAt
        },
        { new: true }
      ).exec();

      if (!document) {
        throw new Error(`Project ${projectId} was not found`);
      }

      return toProject(document);
    }
  };
}

function toProject(document: {
  _id: unknown;
  ownerId: string;
  name: string;
  description?: string;
  context?: ProjectContext;
  createdAt: Date;
  updatedAt: Date;
  activeSchemaVersion: number;
  activeSchemaSnapshotId?: string;
  archivedAt?: Date;
}): Project {
  return {
    id: String(document._id),
    ownerId: document.ownerId,
    name: document.name,
    description: document.description,
    context: document.context,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    archivedAt: document.archivedAt,
    activeSchemaVersion: document.activeSchemaVersion,
    activeSchemaSnapshotId: document.activeSchemaSnapshotId
  };
}

function toProjectSchemaSnapshot(document: {
  _id: unknown;
  projectId: string;
  version: number;
  schema: ParsedSchema;
  source: ProjectSchemaSnapshot["source"];
  createdAt: Date;
  archivedAt?: Date;
}): ProjectSchemaSnapshot {
  return {
    id: String(document._id),
    projectId: document.projectId,
    version: document.version,
    schema: document.schema,
    source: document.source,
    createdAt: document.createdAt,
    archivedAt: document.archivedAt
  };
}
