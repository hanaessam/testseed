import {
  ApplySeedBatchVersionError,
  RollbackSeedBatchError,
  assertSeedBatchApplicable,
  createMongoNativeDriverClientFactory,
  finalizeSeedBatchApply,
  getSavedGeneratedDataset,
  purgeSeedBatchFromMongo,
  rollbackSeedBatch,
  seedMongoDataset,
  snapshotSeedBatchFromMongo,
  testDirectMongoConnection
} from "@testseed/core";
import type { GeneratedDataset, SeedBatch } from "@testseed/types";
import {
  createConnection,
  type createGeneratedDatasetRepository,
  type createProjectHistoryRepository,
  type createProjectRepository
} from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { type AuthenticatedRequest } from "../middleware/auth";

type ProjectHistoryRepository = ReturnType<typeof createProjectHistoryRepository>;
type ProjectRepository = ReturnType<typeof createProjectRepository>;
type GeneratedDatasetRepository = ReturnType<typeof createGeneratedDatasetRepository>;

export interface RollbackRouterDeps {
  projectHistoryRepository: ProjectHistoryRepository;
  projectRepository: ProjectRepository;
  generatedDatasetRepository: GeneratedDatasetRepository;
}

export const rollbackSchema = z.object({
  seedBatchId: z.string().min(1),
  mongoUri: z.string().min(1)
});

export const applySeedBatchSchema = rollbackSchema;
export const restoreSeedBatchSchema = rollbackSchema;

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

export function toApplySeedBatchHttpStatus(error: ApplySeedBatchVersionError): number {
  switch (error.code) {
    case "APPLY_SEED_BATCH_ID_REQUIRED":
    case "APPLY_SEED_BATCH_ID_INVALID":
      return 400;
    case "APPLY_BATCH_NOT_FOUND":
      return 404;
    case "APPLY_BATCH_HAS_NO_RECORDS":
      return 409;
    default:
      return 500;
  }
}

export const toRestoreSeedBatchHttpStatus = toApplySeedBatchHttpStatus;

export function createRollbackRouter(deps: RollbackRouterDeps): Router {
  const router = Router();
  const mongoClientFactory = createMongoNativeDriverClientFactory();

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
        const supersededBatch = await deps.projectHistoryRepository.findSeedBatchSupersededBy(
          params.projectId,
          request.body.seedBatchId
        );

        const listTargetCollectionNames = async () => {
          if (!connection.db) {
            await connection.asPromise();
          }
          const collections = await connection.db!.listCollections().toArray();
          return collections
            .map((entry) => entry.name)
            .filter((name): name is string => Boolean(name) && !name.startsWith("system."));
        };

        try {
          const result = await rollbackSeedBatch(
            {
              projectId: params.projectId,
              actorId: authenticatedRequest.auth.userId,
              seedBatchId: request.body.seedBatchId
            },
            {
              findSeedBatchBySeedBatchId: deps.projectHistoryRepository.findSeedBatchBySeedBatchId,
              listTargetCollectionNames,
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

          let restoredSeedBatch;
          let restoreMessage: string | undefined;

          if ("event" in result && supersededBatch) {
            const project = await deps.projectRepository.findProjectById(params.projectId);
            const schemaSnapshot = project?.activeSchemaSnapshotId
              ? await deps.projectRepository.findSchemaSnapshotById(project.activeSchemaSnapshotId)
              : null;

            if (project && project.ownerId === authenticatedRequest.auth.userId && schemaSnapshot) {
              try {
                const connectionTest = await testDirectMongoConnection(
                  { connectionString: request.body.mongoUri },
                  { clientFactory: mongoClientFactory }
                );

                if (
                  !connectionTest.ok ||
                  !connectionTest.connectionTestToken ||
                  !connectionTest.databaseName
                ) {
                  throw new Error("MongoDB connection test failed before restore.");
                }

                const targetDatabaseName =
                  supersededBatch.targetDatabaseName ?? connectionTest.databaseName;
                let datasetToRestore: GeneratedDataset | null = null;

                if (supersededBatch.savedDatasetId) {
                  datasetToRestore = await getSavedGeneratedDataset(
                    {
                      projectId: params.projectId,
                      datasetId: supersededBatch.savedDatasetId,
                      ownerId: authenticatedRequest.auth.userId
                    },
                    {
                      findProjectById: deps.projectRepository.findProjectById,
                      findGeneratedDatasetById: deps.generatedDatasetRepository.findGeneratedDatasetById
                    }
                  );
                } else {
                  datasetToRestore = await snapshotSeedBatchFromMongo(
                    {
                      connectionString: request.body.mongoUri,
                      targetDatabaseName,
                      projectId: params.projectId,
                      schemaSnapshotId: schemaSnapshot.id,
                      batch: supersededBatch
                    },
                    { clientFactory: mongoClientFactory }
                  );
                }

                if (!datasetToRestore || Object.values(datasetToRestore.collections).every((records) => records.length === 0)) {
                  restoreMessage =
                    "Removed the rolled-back batch from MongoDB. The previous seed could not be restored automatically — load it from Saved runs and seed again.";
                } else {
                  const collectionNames = await listTargetCollectionNames();
                  await purgeSeedBatchFromMongo(
                    {
                      connectionString: request.body.mongoUri,
                      targetDatabaseName,
                      seedBatchId: supersededBatch.seedBatchId,
                      collectionNames
                    },
                    { clientFactory: mongoClientFactory }
                  );

                  await seedMongoDataset(
                    {
                      connectionString: request.body.mongoUri,
                      connectionTestToken: connectionTest.connectionTestToken,
                      schema: schemaSnapshot.schema,
                      dataset: datasetToRestore,
                      targetDatabaseName,
                      confirmed: true,
                      seedBatchId: supersededBatch.seedBatchId,
                      insertMode: "upsert"
                    },
                    { clientFactory: mongoClientFactory }
                  );

                  restoredSeedBatch = await deps.projectHistoryRepository.reactivateSeedBatch(
                    params.projectId,
                    supersededBatch.seedBatchId
                  );
                  restoreMessage = `Removed the rolled-back batch and restored the previous seed (${supersededBatch.seedBatchId}) in MongoDB.`;
                }
              } catch (error) {
                const detail = error instanceof Error ? error.message : "Unknown restore error";
                restoreMessage = `Removed the rolled-back batch from MongoDB. The previous seed could not be restored automatically (${detail}). Load it from Saved runs and seed again.`;
              }
            }
          }

          if ("event" in result && !restoreMessage) {
            restoreMessage =
              "Removed seeded records from MongoDB. Your generated dataset is still available in Saved runs — use Export to seed again.";
          }

          if (!("event" in result)) {
            response.status(207).json({
              batch: result.batch,
              deletedCounts: result.report.deletedCounts,
              report: result.report,
              restoredSeedBatch,
              restoreMessage
            });
            return;
          }

          response.status(200).json({
            batch: result.batch,
            deletedCounts: result.report.deletedCounts,
            event: result.event,
            restoredSeedBatch,
            restoreMessage
          });
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

  router.post(
    "/:projectId/apply-seed-batch",
    validateBody(applySeedBatchSchema),
    (request, response, next) => executeApplySeedBatchVersion(request, response, next, deps, mongoClientFactory)
  );

  router.post(
    "/:projectId/restore-seed-batch",
    validateBody(restoreSeedBatchSchema),
    (request, response, next) => executeApplySeedBatchVersion(request, response, next, deps, mongoClientFactory)
  );

  return router;
}

async function executeApplySeedBatchVersion(
  request: Request,
  response: Response,
  next: NextFunction,
  deps: RollbackRouterDeps,
  mongoClientFactory: ReturnType<typeof createMongoNativeDriverClientFactory>
): Promise<void> {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    if (!authenticatedRequest.auth) {
      response.status(401).json({ message: "Authentication required" });
      return;
    }

    const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
    const batch = await deps.projectHistoryRepository.findSeedBatchBySeedBatchId(
      params.projectId,
      request.body.seedBatchId.trim()
    );

    try {
      assertSeedBatchApplicable(batch, request.body.seedBatchId);
    } catch (error) {
      if (error instanceof ApplySeedBatchVersionError) {
        response.status(toApplySeedBatchHttpStatus(error)).json({
          code: error.code,
          message: error.message
        });
        return;
      }
      throw error;
    }

    const project = await deps.projectRepository.findProjectById(params.projectId);
    const schemaSnapshot = project?.activeSchemaSnapshotId
      ? await deps.projectRepository.findSchemaSnapshotById(project.activeSchemaSnapshotId)
      : null;

    if (!project || project.ownerId !== authenticatedRequest.auth.userId || !schemaSnapshot) {
      response.status(404).json({ message: "Project not found" });
      return;
    }

    const connectionTest = await testDirectMongoConnection(
      { connectionString: request.body.mongoUri },
      { clientFactory: mongoClientFactory }
    );

    if (!connectionTest.ok || !connectionTest.connectionTestToken || !connectionTest.databaseName) {
      response.status(422).json({ message: "MongoDB connection test failed before applying this seed run." });
      return;
    }

    const targetDatabaseName = batch.targetDatabaseName ?? connectionTest.databaseName;
    const datasetToApply = await loadDatasetForSeedBatch(
      {
        projectId: params.projectId,
        ownerId: authenticatedRequest.auth.userId,
        batch,
        schemaSnapshotId: schemaSnapshot.id,
        connectionString: request.body.mongoUri,
        targetDatabaseName
      },
      deps,
      mongoClientFactory
    );

    if (
      !datasetToApply ||
      Object.values(datasetToApply.collections).every((records) => records.length === 0)
    ) {
      response.status(409).json({
        message:
          "This seed run has no saved dataset snapshot. Load it from Saved runs, then direct seed again."
      });
      return;
    }

    const allBatches = await deps.projectHistoryRepository.listSeedBatches(params.projectId);
    const collectionNames = collectSeedBatchCollectionNames(allBatches);

    for (const historyBatch of allBatches) {
      await purgeSeedBatchFromMongo(
        {
          connectionString: request.body.mongoUri,
          targetDatabaseName,
          seedBatchId: historyBatch.seedBatchId,
          collectionNames
        },
        { clientFactory: mongoClientFactory }
      );
    }

    await seedMongoDataset(
      {
        connectionString: request.body.mongoUri,
        connectionTestToken: connectionTest.connectionTestToken,
        schema: schemaSnapshot.schema,
        dataset: datasetToApply,
        targetDatabaseName,
        confirmed: true,
        seedBatchId: batch.seedBatchId,
        insertMode: "upsert"
      },
      { clientFactory: mongoClientFactory }
    );

    const result = await finalizeSeedBatchApply(
      {
        projectId: params.projectId,
        actorId: authenticatedRequest.auth.userId,
        seedBatchId: batch.seedBatchId
      },
      {
        findSeedBatchBySeedBatchId: deps.projectHistoryRepository.findSeedBatchBySeedBatchId,
        listSeedBatches: deps.projectHistoryRepository.listSeedBatches,
        markSeedBatchSuperseded: deps.projectHistoryRepository.markSeedBatchSuperseded,
        reactivateSeedBatch: deps.projectHistoryRepository.reactivateSeedBatch,
        appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
      }
    );

    response.status(200).json({
      batch: result.batch,
      message: `Applied seed run ${batch.seedBatchId} to MongoDB.`,
      supersededBatchIds: result.supersededBatchIds,
      event: result.event
    });
  } catch (error) {
    if (error instanceof ApplySeedBatchVersionError) {
      response.status(toApplySeedBatchHttpStatus(error)).json({
        code: error.code,
        message: error.message
      });
      return;
    }
    next(error);
  }
}

function collectSeedBatchCollectionNames(batches: SeedBatch[]): string[] {
  return [
    ...new Set(
      batches.flatMap((batch) => [
        ...batch.collectionOrder,
        ...Object.keys(batch.collectionCounts ?? {}),
        ...Object.keys(batch.insertedDocumentIds ?? {})
      ])
    )
  ];
}

async function loadDatasetForSeedBatch(
  input: {
    projectId: string;
    ownerId: string;
    batch: SeedBatch;
    schemaSnapshotId: string;
    connectionString: string;
    targetDatabaseName: string;
  },
  deps: RollbackRouterDeps,
  mongoClientFactory: ReturnType<typeof createMongoNativeDriverClientFactory>
): Promise<GeneratedDataset | null> {
  if (input.batch.savedDatasetId) {
    return getSavedGeneratedDataset(
      {
        projectId: input.projectId,
        datasetId: input.batch.savedDatasetId,
        ownerId: input.ownerId
      },
      {
        findProjectById: deps.projectRepository.findProjectById,
        findGeneratedDatasetById: deps.generatedDatasetRepository.findGeneratedDatasetById
      }
    );
  }

  return snapshotSeedBatchFromMongo(
    {
      connectionString: input.connectionString,
      targetDatabaseName: input.targetDatabaseName,
      projectId: input.projectId,
      schemaSnapshotId: input.schemaSnapshotId,
      batch: input.batch
    },
    { clientFactory: mongoClientFactory }
  );
}
