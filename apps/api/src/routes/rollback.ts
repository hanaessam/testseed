import { RollbackSeedBatchError, rollbackSeedBatch } from "@testseed/core";
import { createConnection, type createProjectHistoryRepository } from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { type AuthenticatedRequest } from "../middleware/auth";

type ProjectHistoryRepository = ReturnType<typeof createProjectHistoryRepository>;

export interface RollbackRouterDeps {
  projectHistoryRepository: ProjectHistoryRepository;
}

export const rollbackSchema = z.object({
  seedBatchId: z.string().min(1),
  mongoUri: z.string().min(1)
});

export function toRollbackHttpStatus(error: RollbackSeedBatchError): number {
  switch (error.code) {
    case "ROLLBACK_SEED_BATCH_ID_REQUIRED":
    case "ROLLBACK_SEED_BATCH_ID_INVALID":
      return 400;
    case "ROLLBACK_BATCH_NOT_FOUND":
      return 404;
    case "ROLLBACK_BATCH_ALREADY_ROLLED_BACK":
    case "ROLLBACK_BATCH_HAS_NO_RECORDS":
      return 409;
    default:
      return 500;
  }
}

export function createRollbackRouter(deps: RollbackRouterDeps): Router {
  const router = Router();

  router.post(
    "/:projectId/rollback",
    validateBody(rollbackSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const connection = createConnection(request.body.mongoUri);

        try {
          const result = await rollbackSeedBatch(
            {
              projectId: params.projectId,
              actorId: authenticatedRequest.auth.userId,
              seedBatchId: request.body.seedBatchId
            },
            {
              findSeedBatchBySeedBatchId: deps.projectHistoryRepository.findSeedBatchBySeedBatchId,
              deleteRecordsBySeedBatchId: async ({ collectionName, seedBatchId }) => {
                const deletionResult = await connection.collection(collectionName).deleteMany({
                  seedBatchId
                });
                return { deletedCount: deletionResult.deletedCount ?? 0 };
              },
              markSeedBatchRolledBack: deps.projectHistoryRepository.markSeedBatchRolledBack,
              appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
            }
          );

          response.status(200).json(result.report);
        } finally {
          await connection.close();
        }
      } catch (error) {
        if (error instanceof RollbackSeedBatchError) {
          response.status(toRollbackHttpStatus(error)).json({
            code: error.code,
            message: error.message
          });
          return;
        }
        next(error);
      }
    }
  );

  return router;
}
