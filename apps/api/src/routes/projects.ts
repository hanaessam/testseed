import {
  createProject,
  deleteProject,
  deleteProjectSchema,
  getProjectDetail,
  listUserProjects,
  restoreProject,
  restoreProjectSchema,
  saveParsedSchemaToProject,
  updateProject
} from "@testseed/core";
import type {
  createProjectHistoryRepository,
  createProjectRepository
} from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { type AuthenticatedRequest } from "../middleware/auth";

type ProjectRepository = ReturnType<typeof createProjectRepository>;
type ProjectHistoryRepository = ReturnType<typeof createProjectHistoryRepository>;

export interface ProjectsRouterDeps {
  projectRepository: ProjectRepository;
  projectHistoryRepository: ProjectHistoryRepository;
}

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional()
});

const deleteModeSchema = z.object({
  mode: z.enum(["archive", "hard"])
});

const schemaFieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean(),
  unique: z.boolean(),
  enum: z.array(z.string()).optional(),
  ref: z.string().optional(),
  defaultValue: z.string().optional()
});

const parsedSchemaSchema = z.object({
  collections: z.array(
    z.object({
      name: z.string().min(1),
      fields: z.array(schemaFieldSchema)
    })
  )
});

const updateProjectSchemaSchema = z.object({
  schema: parsedSchemaSchema,
  source: z.enum(["manual", "mongodb", "ai"]).optional()
});

export function createProjectsRouter(deps: ProjectsRouterDeps): Router {
  const router = Router();

  router.get(
    "/",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await listUserProjects(
          {
            ownerId: authenticatedRequest.auth.userId,
            includeArchived: request.query.includeArchived === "true"
          },
          { listProjectsByOwnerId: deps.projectRepository.listProjectsByOwnerId }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/:projectId",
    validateBody(updateProjectSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await updateProject(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            name: request.body.name,
            description: request.body.description
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            updateProjectRecord: deps.projectRepository.updateProjectRecord,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/:projectId/restore",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await restoreProject(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            restoreProjectRecord: deps.projectRepository.restoreProjectRecord,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/",
    validateBody(createProjectSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await createProject(
          {
            ownerId: authenticatedRequest.auth.userId,
            name: request.body.name,
            description: request.body.description
          },
          {
            createProjectRecord: deps.projectRepository.createProject,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/:projectId",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await getProjectDetail(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            findSchemaSnapshotById: deps.projectRepository.findSchemaSnapshotById
          }
        );

        if (!result.project) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.put(
    "/:projectId/schema",
    validateBody(updateProjectSchemaSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await saveParsedSchemaToProject(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            schema: request.body.schema,
            source: request.body.source ?? "manual"
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            saveSchemaSnapshot: deps.projectRepository.saveSchemaSnapshot,
            updateProjectActiveSchema: deps.projectRepository.updateProjectActiveSchema,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    "/:projectId/schema",
    validateBody(deleteModeSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await deleteProjectSchema(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            mode: request.body.mode
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            findSchemaSnapshotById: deps.projectRepository.findSchemaSnapshotById,
            archiveSchemaSnapshot: deps.projectRepository.archiveSchemaSnapshot,
            hardDeleteSchemaSnapshot: deps.projectRepository.hardDeleteSchemaSnapshot,
            clearProjectActiveSchema: deps.projectRepository.clearProjectActiveSchema,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/:projectId/schema/restore",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await restoreProjectSchema(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            findLatestArchivedSchemaSnapshotByProjectId:
              deps.projectRepository.findLatestArchivedSchemaSnapshotByProjectId,
            restoreSchemaSnapshot: deps.projectRepository.restoreSchemaSnapshot,
            updateProjectActiveSchema: deps.projectRepository.updateProjectActiveSchema,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    "/:projectId",
    validateBody(deleteModeSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await deleteProject(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            mode: request.body.mode
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            archiveProjectRecord: deps.projectRepository.archiveProjectRecord,
            hardDeleteProjectRecord: deps.projectRepository.hardDeleteProjectRecord,
            hardDeleteProjectSnapshots: deps.projectRepository.hardDeleteProjectSnapshots,
            hardDeleteProjectHistory: deps.projectHistoryRepository.hardDeleteProjectHistory,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
