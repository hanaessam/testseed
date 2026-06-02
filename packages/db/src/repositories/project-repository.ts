import type { ParsedSchema, Project, ProjectSchemaSnapshot } from "@testseed/types";
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

    async listProjectsByOwnerId(ownerId: string): Promise<Project[]> {
      const documents = await ProjectModel.find({ ownerId }).sort({ updatedAt: -1 }).exec();
      return documents.map(toProject);
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
  createdAt: Date;
  updatedAt: Date;
  activeSchemaVersion: number;
  activeSchemaSnapshotId?: string;
}): Project {
  return {
    id: String(document._id),
    ownerId: document.ownerId,
    name: document.name,
    description: document.description,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
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
}): ProjectSchemaSnapshot {
  return {
    id: String(document._id),
    projectId: document.projectId,
    version: document.version,
    schema: document.schema,
    source: document.source,
    createdAt: document.createdAt
  };
}
