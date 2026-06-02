import { rollbackSeedBatch } from "@testseed/core";
import { createConnection, type createProjectHistoryRepository } from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { type AuthenticatedRequest } from "../middleware/auth";

type ProjectHistoryRepository = ReturnType<typeof createProjectHistoryRepository>;

export interface RollbackRouterDeps {
  projectHistoryRepository: ProjectHistoryRepository;
}

const rollbackSchema = z.object({
  seedBatchId: z.string().min(1),
  mongoUri: z.string().min(1)
});

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
              deleteRecordsByIds: async (collectionToIds) => {
                const deletedCounts: Record<string, number> = {};

                for (const [collectionName, ids] of Object.entries(collectionToIds)) {
                  const collection = connection.collection(collectionName);
                  const normalizedIds = ids.map((id) =>
                    Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id
                  );

                  const deletionResult = await collection.deleteMany({
                    _id: { $in: normalizedIds as unknown as Types.ObjectId[] }
                  });

                  deletedCounts[collectionName] = deletionResult.deletedCount ?? 0;
                }

                return deletedCounts;
              },
              markSeedBatchRolledBack: deps.projectHistoryRepository.markSeedBatchRolledBack,
              appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
            }
          );

          response.status(200).json(result);
        } finally {
          await connection.close();
        }
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
