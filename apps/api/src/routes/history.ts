import { listProjectHistory, recordSeedBatch } from "@testseed/core";
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

export interface HistoryRouterDeps {
  projectRepository: ProjectRepository;
  projectHistoryRepository: ProjectHistoryRepository;
}

const recordSeedBatchSchema = z.object({
  seedBatchId: z.string().min(1),
  collectionCounts: z.record(z.number().int().nonnegative()),
  insertedDocumentIds: z.record(z.array(z.string().min(1))),
  collectionOrder: z.array(z.string().min(1)),
  status: z.enum(["pending", "inserted", "partially_inserted", "rolled_back"])
});

export function createHistoryRouter(deps: HistoryRouterDeps): Router {
  const router = Router();

  router.get(
    "/:projectId/history",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const history = await listProjectHistory(
          { projectId: params.projectId },
          {
            findProjectById: deps.projectRepository.findProjectById,
            listProjectEvents: deps.projectHistoryRepository.listProjectEvents,
            listSeedBatches: deps.projectHistoryRepository.listSeedBatches
          }
        );

        if (!history.project || history.project.ownerId !== authenticatedRequest.auth.userId) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        response.status(200).json(history);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/seed-batches",
    validateBody(recordSeedBatchSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const result = await recordSeedBatch(
          {
            projectId: params.projectId,
            actorId: authenticatedRequest.auth.userId,
            seedBatchId: request.body.seedBatchId,
            collectionCounts: request.body.collectionCounts,
            insertedDocumentIds: request.body.insertedDocumentIds,
            collectionOrder: request.body.collectionOrder,
            status: request.body.status
          },
          {
            recordSeedBatchRecord: deps.projectHistoryRepository.recordSeedBatch,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
