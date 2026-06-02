import { createProject, listUserProjects } from "@testseed/core";
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
          { ownerId: authenticatedRequest.auth.userId },
          { listProjectsByOwnerId: deps.projectRepository.listProjectsByOwnerId }
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
        const project = await deps.projectRepository.findProjectById(params.projectId);

        const authenticatedRequest = request as AuthenticatedRequest;
        if (!project || project.ownerId !== authenticatedRequest.auth?.userId) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        response.status(200).json({ project });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
