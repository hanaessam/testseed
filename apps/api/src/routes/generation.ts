import {
  applyCellEditToDataset,
  buildGenerationPlan,
  CellEditRejectedError,
  generateSeedData,
  generateSeedDataProgressive,
  getSavedGeneratedDataset,
  listSavedGeneratedDatasets,
  mapGenerationPlanToResponse,
  REFINEMENT_SYSTEM_PROMPT,
  buildRefinementUserPromptContent,
  regenerateWithFeedback,
  refineGeneratedDataset,
  saveGeneratedDataset,
  updateSavedGeneratedDataset,
  updateSavedGeneratedDatasetChatHistory,
  validateGeneratedDataset,
  type SeedGenerationProvider,
  type SeedRefinementProvider
} from "@testseed/core";
import type {
  ChatRefinementMessage,
  FeedbackRegenerationResponse,
  GeneratedDataset,
  GeneratedRecord,
  GenerationValidationResult,
  ParsedSchema,
  RefineGeneratedDatasetResponse,
  SavedGeneratedDatasetSource,
  SchemaField
} from "@testseed/types";
import type {
  createGeneratedDatasetRepository,
  createProjectHistoryRepository,
  createProjectRepository
} from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { type AuthenticatedRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

type ProjectRepository = ReturnType<typeof createProjectRepository>;
type ProjectHistoryRepository = ReturnType<typeof createProjectHistoryRepository>;
type GeneratedDatasetRepository = ReturnType<typeof createGeneratedDatasetRepository>;

export interface GenerationRouterDeps {
  projectRepository: ProjectRepository;
  projectHistoryRepository: ProjectHistoryRepository;
  generatedDatasetRepository: GeneratedDatasetRepository;
  openaiApiKey?: string;
  model?: string;
}

const collectionCountsSchema = z
  .record(z.number().int().min(0))
  .refine((counts) => Object.values(counts).some((count) => count > 0), {
    message: "At least one collection count must be greater than zero."
  });

const generateSeedDataRequestSchema = z.object({
  collectionCounts: collectionCountsSchema
});

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000)
});

const generatedDatasetSchema: z.ZodType<GeneratedDataset> = z.object({
  projectId: z.string().min(1),
  schemaSnapshotId: z.string().min(1),
  status: z.enum(["valid", "invalid", "failed"]),
  generationOrder: z.array(z.string()),
  collectionCounts: z.record(z.number().int().min(0)),
  collections: z.record(z.array(z.record(z.unknown()).and(z.object({ _id: z.string() })))),
  validationResults: z.array(z.custom<GenerationValidationResult>()),
  warnings: z.array(z.custom<GenerationValidationResult>()),
  createdAt: z.string()
});

const refineGeneratedDatasetRequestSchema = z.object({
  currentDataset: generatedDatasetSchema,
  message: z.string().min(1).max(2000),
  chatHistory: z.array(chatMessageSchema).optional(),
  savedDatasetId: z.string().min(1).optional()
});

const feedbackRegenerationRequestSchema = z.object({
  acceptedDataset: generatedDatasetSchema,
  feedback: z.string().min(1).max(2000),
  chatHistory: z.array(chatMessageSchema).optional(),
  savedDatasetId: z.string().min(1).optional(),
  projectContext: z.string().max(4000).optional(),
  schemaContext: z.string().max(12000).optional(),
  collectionCounts: z.record(z.number().int().min(0)).optional()
});

const datasetCellEditSchema = z.object({
  collectionName: z.string().min(1),
  recordId: z.string().min(1),
  fieldName: z.string().min(1),
  rawValue: z.string()
});

const datasetCellEditRequestSchema = z.object({
  schemaSnapshotId: z.string().min(1),
  collectionCounts: z.record(z.number().int().min(0)),
  dataset: generatedDatasetSchema,
  edit: datasetCellEditSchema
});

const validateDatasetRequestSchema = z.object({
  schemaSnapshotId: z.string().min(1),
  collectionCounts: z.record(z.number().int().min(0)),
  dataset: generatedDatasetSchema
});

const patchSavedGeneratedDatasetRequestSchema = z.object({
  dataset: generatedDatasetSchema
});

const saveManualEditDatasetRequestSchema = z.object({
  dataset: generatedDatasetSchema,
  chatHistory: z.array(chatMessageSchema).optional()
});

function writeSseEvent(response: Response, event: string, data: unknown): void {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function createGenerationRouter(deps: GenerationRouterDeps): Router {
  const router = Router();

  router.get(
    "/:projectId/generated-datasets",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const datasets = await listSavedGeneratedDatasets(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            listGeneratedDatasetSummaries: deps.generatedDatasetRepository.listGeneratedDatasetSummaries
          }
        );

        response.status(200).json({ datasets });
      } catch (error) {
        if (error instanceof Error && error.message.includes("was not found")) {
          response.status(404).json({ message: "Project not found" });
          return;
        }
        next(error);
      }
    }
  );

  router.get(
    "/:projectId/generated-datasets/:datasetId",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z
          .object({ projectId: z.string().min(1), datasetId: z.string().min(1) })
          .parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const dataset = await getSavedGeneratedDataset(
          {
            projectId: params.projectId,
            datasetId: params.datasetId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            findGeneratedDatasetById: deps.generatedDatasetRepository.findGeneratedDatasetById
          }
        );

        response.status(200).json({ dataset });
      } catch (error) {
        if (error instanceof Error && error.message.includes("was not found")) {
          response.status(404).json({ message: error.message });
          return;
        }
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/dataset-edits",
    validateBody(datasetCellEditRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (!context.schemaSnapshot) {
          response.status(409).json({ message: "Review and save a schema before editing seed records." });
          return;
        }

        if (request.body.schemaSnapshotId !== context.schemaSnapshot.id) {
          response.status(409).json({ message: "The dataset does not match the active reviewed schema." });
          return;
        }

        if (request.body.dataset.projectId !== params.projectId) {
          response.status(409).json({ message: "The dataset does not match the requested project." });
          return;
        }

        try {
          const dataset = applyCellEditToDataset({
            dataset: request.body.dataset,
            schema: context.schemaSnapshot.schema,
            collectionCounts: request.body.collectionCounts,
            edit: request.body.edit
          });

          response.status(200).json({
            dataset,
            status: dataset.status,
            validationResults: dataset.validationResults,
            warnings: dataset.warnings
          });
        } catch (error) {
          if (error instanceof CellEditRejectedError) {
            response.status(422).json({
              error: error.code,
              message: error.message,
              collectionName: error.collectionName,
              fieldName: error.fieldName
            });
            return;
          }
          throw error;
        }
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/datasets/validate",
    validateBody(validateDatasetRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (!context.schemaSnapshot) {
          response.status(409).json({ message: "Review and save a schema before validating seed records." });
          return;
        }

        if (request.body.schemaSnapshotId !== context.schemaSnapshot.id) {
          response.status(409).json({ message: "The dataset does not match the active reviewed schema." });
          return;
        }

        const validation = validateGeneratedDataset({
          dataset: request.body.dataset,
          schema: context.schemaSnapshot.schema,
          collectionCounts: request.body.collectionCounts
        });

        const dataset: GeneratedDataset = {
          ...request.body.dataset,
          status: validation.status === "valid" ? "valid" : "invalid",
          validationResults: validation.validationResults,
          warnings: validation.warnings
        };

        response.status(200).json({
          dataset,
          status: dataset.status,
          validationResults: dataset.validationResults,
          warnings: dataset.warnings
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/:projectId/generated-datasets/:datasetId",
    validateBody(patchSavedGeneratedDatasetRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z
          .object({ projectId: z.string().min(1), datasetId: z.string().min(1) })
          .parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        try {
          const dataset = await updateSavedGeneratedDataset(
            {
              projectId: params.projectId,
              datasetId: params.datasetId,
              ownerId: authenticatedRequest.auth.userId,
              dataset: request.body.dataset
            },
            {
              findProjectById: deps.projectRepository.findProjectById,
              findGeneratedDatasetById: deps.generatedDatasetRepository.findGeneratedDatasetById,
              updateGeneratedDatasetRecord: deps.generatedDatasetRepository.updateGeneratedDatasetRecord
            }
          );

          response.status(200).json({ dataset });
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes("was not found")) {
              response.status(404).json({ message: error.message });
              return;
            }
            if (
              error.message.includes("Only valid datasets") ||
              error.message.includes("Resolve validation errors")
            ) {
              response.status(422).json({ message: error.message });
              return;
            }
          }
          throw error;
        }
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/generated-datasets",
    validateBody(saveManualEditDatasetRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (request.body.dataset.status !== "valid") {
          response.status(422).json({ message: "Resolve validation errors before saving edits." });
          return;
        }

        if (
          request.body.dataset.validationResults.some(
            (result: GenerationValidationResult) => result.severity === "error"
          )
        ) {
          response.status(422).json({ message: "Resolve validation errors before saving edits." });
          return;
        }

        const savedDataset = await persistValidDataset(
          deps,
          params.projectId,
          authenticatedRequest.auth.userId,
          request.body.dataset,
          "manual_edit",
          request.body.chatHistory ?? []
        );

        response.status(201).json({
          dataset: savedDataset,
          savedDatasetId: savedDataset.id
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/:projectId/generation-plan",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const countsParam = z.string().min(1).parse(request.query.collectionCounts);
        let collectionCounts: Record<string, number>;
        try {
          collectionCounts = collectionCountsSchema.parse(JSON.parse(countsParam));
        } catch {
          response.status(400).json({ message: "Invalid collectionCounts query parameter." });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (!context.schemaSnapshot) {
          response.status(409).json({ message: "Review and save a schema before generating seed records." });
          return;
        }

        const plan = buildGenerationPlan(context.schemaSnapshot.schema, collectionCounts, {
          safeGenerationLimit: 100
        });
        response.status(200).json(
          mapGenerationPlanToResponse(plan, collectionCounts)
        );
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/generations",
    validateBody(generateSeedDataRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (!context.schemaSnapshot) {
          response.status(409).json({ message: "Review and save a schema before generating seed records." });
          return;
        }

        await deps.projectHistoryRepository.appendProjectEvent({
          projectId: context.project.id,
          actorId: authenticatedRequest.auth.userId,
          kind: "generation_requested",
          message: "AI seed generation requested.",
          payload: { collectionCounts: request.body.collectionCounts },
          createdAt: new Date()
        });

        const dataset = await generateSeedData(
          {
            projectId: context.project.id,
            actorId: authenticatedRequest.auth.userId,
            schemaSnapshotId: context.schemaSnapshot.id,
            schema: context.schemaSnapshot.schema,
            projectContext: context.project.context,
            collectionCounts: request.body.collectionCounts
          },
          {
            generateRecords: createOpenAIGenerationProvider(deps),
            safeGenerationLimit: 100
          }
        );

        if (dataset.status !== "valid") {
          response.status(statusForValidation(dataset.validationResults)).json({
            message: messageForValidation(dataset.validationResults),
            validationResults: dataset.validationResults
          });
          return;
        }

        const savedDataset = await persistValidDataset(
          deps,
          context.project.id,
          authenticatedRequest.auth.userId,
          dataset,
          "generation"
        );

        response.status(201).json({
          dataset,
          savedDatasetId: savedDataset.id,
          message: "Generated valid seed records."
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/generations/regenerate",
    validateBody(feedbackRegenerationRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (!context.schemaSnapshot) {
          response.status(409).json({ message: "Review and save a schema before regenerating seed records." });
          return;
        }

        if (request.body.acceptedDataset.schemaSnapshotId !== context.schemaSnapshot.id) {
          response.status(409).json({ message: "The generated dataset does not match the active reviewed schema." });
          return;
        }

        const schemaContext =
          request.body.schemaContext ??
          context.schemaSnapshot.schema.collections
            .map((collection) => `${collection.name}(${collection.fields.length})`)
            .join(", ");

        const result = await regenerateWithFeedback(
          {
            projectId: context.project.id,
            actorId: authenticatedRequest.auth.userId,
            schemaSnapshotId: context.schemaSnapshot.id,
            schema: context.schemaSnapshot.schema,
            projectContext: context.project.context,
            acceptedDataset: request.body.acceptedDataset,
            feedback: request.body.feedback,
            chatHistory: request.body.chatHistory,
            projectContextText: request.body.projectContext,
            schemaContext,
            collectionCounts: request.body.collectionCounts
          },
          {
            refineRecords: createOpenAIRefinementProvider(deps)
          }
        );

        await deps.projectHistoryRepository.appendProjectEvent({
          projectId: context.project.id,
          actorId: authenticatedRequest.auth.userId,
          kind: "chat_message",
          message:
            result.mode === "accepted"
              ? "Feedback regeneration accepted a new dataset."
              : "Feedback regeneration returned a non-accepted outcome.",
          payload: { mode: result.mode },
          createdAt: new Date()
        });

        const savedDatasetId = await persistFeedbackRegenerationOutcome(
          deps,
          context.project.id,
          authenticatedRequest.auth.userId,
          result,
          request.body.savedDatasetId
        );

        response.status(statusForFeedbackMode(result.mode)).json({
          ...result,
          savedDatasetId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/generations/refinements",
    validateBody(refineGeneratedDatasetRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (!context.schemaSnapshot) {
          response.status(409).json({ message: "Review and save a schema before refining seed records." });
          return;
        }

        if (request.body.currentDataset.schemaSnapshotId !== context.schemaSnapshot.id) {
          response.status(409).json({ message: "The generated dataset does not match the active reviewed schema." });
          return;
        }

        const result = await refineGeneratedDataset(
          {
            projectId: context.project.id,
            actorId: authenticatedRequest.auth.userId,
            schemaSnapshotId: context.schemaSnapshot.id,
            schema: context.schemaSnapshot.schema,
            projectContext: context.project.context,
            currentDataset: request.body.currentDataset,
            message: request.body.message,
            chatHistory: request.body.chatHistory
          },
          {
            refineRecords: createOpenAIRefinementProvider(deps)
          }
        );

        await deps.projectHistoryRepository.appendProjectEvent({
          projectId: context.project.id,
          actorId: authenticatedRequest.auth.userId,
          kind: "chat_message",
          message: result.mode === "updated_dataset" ? "AI chat refinement updated the dataset." : "AI chat refinement responded.",
          payload: { mode: result.mode },
          createdAt: new Date()
        });

        const savedDatasetId = await persistRefinementOutcome(
          deps,
          context.project.id,
          authenticatedRequest.auth.userId,
          result,
          request.body.savedDatasetId
        );

        response.status(result.mode === "rejected" ? 422 : 200).json({
          ...result,
          savedDatasetId
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/generations/stream",
    validateBody(generateSeedDataRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (!context.schemaSnapshot) {
          response.status(409).json({ message: "Review and save a schema before generating seed records." });
          return;
        }

        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders?.();

        let cancelled = false;
        request.on("close", () => {
          cancelled = true;
        });

        const plan = buildGenerationPlan(context.schemaSnapshot.schema, request.body.collectionCounts, {
          safeGenerationLimit: 100
        });
        const planResponse = mapGenerationPlanToResponse(plan, request.body.collectionCounts);
        writeSseEvent(response, "plan", {
          orderedCollections: planResponse.orderedCollections,
          totalRecords: planResponse.totalRecords
        });

        const dataset = await generateSeedDataProgressive(
          {
            projectId: context.project.id,
            actorId: authenticatedRequest.auth.userId,
            schemaSnapshotId: context.schemaSnapshot.id,
            schema: context.schemaSnapshot.schema,
            projectContext: context.project.context,
            collectionCounts: request.body.collectionCounts
          },
          {
            generateRecords: createOpenAIGenerationProvider(deps),
            safeGenerationLimit: 100,
            onCollectionStart: (collectionName, index, total) => {
              if (!cancelled) {
                writeSseEvent(response, "collection_start", { collectionName, index, total });
              }
            },
            onCollectionComplete: (collectionName, records, validationResults) => {
              if (!cancelled) {
                writeSseEvent(response, "collection_complete", {
                  collectionName,
                  records,
                  validationResults
                });
              }
            }
          }
        );

        if (cancelled) {
          writeSseEvent(response, "cancelled", {});
          response.end();
          return;
        }

        if (dataset.status !== "valid") {
          writeSseEvent(response, "error", {
            message: messageForValidation(dataset.validationResults),
            code: "VALIDATION_FAILED",
            validationResults: dataset.validationResults
          });
          response.end();
          return;
        }

        const savedDataset = await persistValidDataset(
          deps,
          context.project.id,
          authenticatedRequest.auth.userId,
          dataset,
          "generation"
        );

        writeSseEvent(response, "complete", {
          dataset,
          savedDatasetId: savedDataset.id
        });
        response.end();
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/generations/refinements/stream",
    validateBody(refineGeneratedDatasetRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const context = await loadGenerationContext(params.projectId, authenticatedRequest.auth.userId, deps);
        if (!context) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        if (!context.schemaSnapshot) {
          response.status(409).json({ message: "Review and save a schema before refining seed records." });
          return;
        }

        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders?.();

        const result = await refineGeneratedDataset(
          {
            projectId: context.project.id,
            actorId: authenticatedRequest.auth.userId,
            schemaSnapshotId: context.schemaSnapshot.id,
            schema: context.schemaSnapshot.schema,
            projectContext: context.project.context,
            currentDataset: request.body.currentDataset,
            message: request.body.message,
            chatHistory: request.body.chatHistory
          },
          {
            refineRecords: createOpenAIRefinementProvider(deps, {
              onToken: (content) => writeSseEvent(response, "token", { content })
            })
          }
        );

        const savedDatasetId = await persistRefinementOutcome(
          deps,
          context.project.id,
          authenticatedRequest.auth.userId,
          result,
          request.body.savedDatasetId
        );

        writeSseEvent(response, "complete", {
          dataset: result.dataset,
          savedDatasetId,
          chatHistory: result.chatHistory,
          guidance: result.mode === "guidance" ? result.message : undefined,
          message: result.message
        });
        response.end();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

async function persistValidDataset(
  deps: GenerationRouterDeps,
  projectId: string,
  ownerId: string,
  dataset: GeneratedDataset,
  source: SavedGeneratedDatasetSource,
  chatHistory: ChatRefinementMessage[] = []
) {
  return saveGeneratedDataset(
    {
      projectId,
      ownerId,
      dataset,
      source,
      chatHistory
    },
    {
      findProjectById: deps.projectRepository.findProjectById,
      createGeneratedDatasetRecord: deps.generatedDatasetRepository.createGeneratedDatasetRecord,
      appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
    }
  );
}

async function persistRefinementOutcome(
  deps: GenerationRouterDeps,
  projectId: string,
  ownerId: string,
  result: RefineGeneratedDatasetResponse,
  activeSavedDatasetId?: string
): Promise<string | undefined> {
  if (result.mode === "updated_dataset" && result.dataset?.status === "valid") {
    const savedDataset = await persistValidDataset(
      deps,
      projectId,
      ownerId,
      result.dataset,
      "refinement",
      result.chatHistory
    );
    return savedDataset.id;
  }

  if (activeSavedDatasetId && result.chatHistory.length > 0) {
    await updateSavedGeneratedDatasetChatHistory(
      {
        projectId,
        datasetId: activeSavedDatasetId,
        ownerId,
        chatHistory: result.chatHistory
      },
      {
        findProjectById: deps.projectRepository.findProjectById,
        updateGeneratedDatasetChatHistory:
          deps.generatedDatasetRepository.updateGeneratedDatasetChatHistory
      }
    );
    return activeSavedDatasetId;
  }

  return undefined;
}

async function persistFeedbackRegenerationOutcome(
  deps: GenerationRouterDeps,
  projectId: string,
  ownerId: string,
  result: FeedbackRegenerationResponse,
  activeSavedDatasetId?: string
): Promise<string | undefined> {
  if (result.mode === "accepted" && result.dataset?.status === "valid") {
    const savedDataset = await persistValidDataset(
      deps,
      projectId,
      ownerId,
      result.dataset,
      "refinement",
      result.chatHistory
    );
    return savedDataset.id;
  }

  if (activeSavedDatasetId && result.chatHistory.length > 0) {
    await updateSavedGeneratedDatasetChatHistory(
      {
        projectId,
        datasetId: activeSavedDatasetId,
        ownerId,
        chatHistory: result.chatHistory
      },
      {
        findProjectById: deps.projectRepository.findProjectById,
        updateGeneratedDatasetChatHistory:
          deps.generatedDatasetRepository.updateGeneratedDatasetChatHistory
      }
    );
    return activeSavedDatasetId;
  }

  return undefined;
}

function createOpenAIGenerationProvider(deps: GenerationRouterDeps): SeedGenerationProvider {
  return async (providerRequest) => {
    if (!deps.openaiApiKey) {
      throw new Error("OpenAI seed generation is not configured");
    }

    const openai = new OpenAI({ apiKey: deps.openaiApiKey });
    const completion = await openai.chat.completions.create({
      model: deps.model ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Generate realistic MongoDB seed records as strict JSON. Return only an object with a collections property grouped by collection name. Preserve field types, required fields, enum values, uniqueness, and ObjectId references. Use supplied ObjectId candidates for references. Do not include secrets or explanations."
        },
        {
          role: "user",
          content: JSON.stringify({
            projectContext: providerRequest.projectContext ?? "",
            repositoryContext: providerRequest.repositoryContext ?? "",
            schema: sanitizeSchema(providerRequest.schema),
            collectionCounts: providerRequest.collectionCounts,
            generationOrder: providerRequest.generationOrder,
            validationFeedback: providerRequest.validationFeedback ?? []
          })
        }
      ]
    });

    return parseProviderCollections(completion.choices[0]?.message?.content);
  };
}

function createOpenAIRefinementProvider(
  deps: GenerationRouterDeps,
  options: { onToken?: (content: string) => void } = {}
): SeedRefinementProvider {
  return async (providerRequest) => {
    if (!deps.openaiApiKey) {
      throw new Error("OpenAI seed refinement is not configured");
    }

    const openai = new OpenAI({ apiKey: deps.openaiApiKey });
    const stream = await openai.chat.completions.create({
      model: deps.model ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      stream: Boolean(options.onToken),
      messages: [
        {
          role: "system",
          content: REFINEMENT_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: buildRefinementUserPromptContent({
            schema: sanitizeSchema(providerRequest.schema),
            currentDataset: providerRequest.currentDataset,
            message: providerRequest.message,
            chatHistory: providerRequest.chatHistory,
            projectContext: providerRequest.projectContext,
            repositoryContext: providerRequest.repositoryContext,
            validationFeedback: providerRequest.validationFeedback
          })
        }
      ]
    });

    let content = "";
    if (options.onToken && Symbol.asyncIterator in stream) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          content += delta;
          options.onToken(delta);
        }
      }
    } else {
      content = (stream as OpenAI.Chat.Completions.ChatCompletion).choices[0]?.message?.content ?? "";
    }
    if (!content) {
      throw new Error("OpenAI returned an empty refinement response");
    }
    const parsed = JSON.parse(content) as {
      mode?: string;
      message?: string;
      collections?: Record<string, GeneratedRecord[]>;
    };

    if (parsed.mode === "guidance") {
      return {
        mode: "guidance",
        message: typeof parsed.message === "string" ? parsed.message : "No dataset changes were needed."
      };
    }

    return {
      mode: "updated_dataset",
      message: typeof parsed.message === "string" ? parsed.message : "Updated dataset.",
      collections: parsed.collections ?? {}
    };
  };
}

async function loadGenerationContext(
  projectId: string,
  ownerId: string,
  deps: GenerationRouterDeps
) {
  const project = await deps.projectRepository.findProjectById(projectId);
  if (!project || project.ownerId !== ownerId) {
    return null;
  }

  const schemaSnapshot = project.activeSchemaSnapshotId
    ? await deps.projectRepository.findSchemaSnapshotById(project.activeSchemaSnapshotId)
    : null;

  return { project, schemaSnapshot };
}

function parseProviderCollections(content: string | null | undefined): { collections: Record<string, GeneratedRecord[]> } {
  if (!content) {
    throw new Error("OpenAI returned an empty generation response");
  }

  const parsed = JSON.parse(content) as {
    collections?: Record<string, GeneratedRecord[]>;
  };
  if (!parsed.collections || typeof parsed.collections !== "object") {
    throw new Error("OpenAI returned an invalid generation response");
  }

  return {
    collections: parsed.collections
  };
}

function sanitizeSchema(schema: ParsedSchema): ParsedSchema {
  return {
    collections: schema.collections.map((collection) => ({
      name: collection.name,
      fields: collection.fields.map(sanitizeField),
      warnings: collection.warnings
    }))
  };
}

function sanitizeField(field: SchemaField): SchemaField {
  return {
    name: field.name,
    type: field.type,
    required: field.required,
    unique: field.unique,
    enum: field.enum,
    enumSource: field.enumSource,
    ref: field.ref,
    refConfidence: field.refConfidence,
    confidence: field.confidence,
    warnings: field.warnings,
    children: field.children?.map(sanitizeField),
    itemType: field.itemType
  };
}

function statusForValidation(validationResults: GenerationValidationResult[]): number {
  if (validationResults.some((result) => result.code === "PROVIDER_FAILURE")) {
    return 502;
  }
  if (
    validationResults.some((result) =>
      ["NO_COLLECTIONS", "UNKNOWN_COLLECTION", "INVALID_COUNT", "NO_RECORDS_REQUESTED", "SAFE_LIMIT_EXCEEDED", "REFERENCE_COLLECTION_MISSING", "REFERENCE_CYCLE", "PARENT_COUNT_ZERO"].includes(result.code)
    )
  ) {
    return 400;
  }
  return 422;
}

function messageForValidation(validationResults: GenerationValidationResult[]): string {
  if (validationResults.some((result) => result.code === "PROVIDER_FAILURE")) {
    return "Seed generation provider could not complete the request. Try again or reduce the requested record count.";
  }
  if (statusForValidation(validationResults) === 400) {
    return "Seed generation cannot start with the selected counts.";
  }
  return "Generated records did not pass validation.";
}

function statusForFeedbackMode(mode: FeedbackRegenerationResponse["mode"]): number {
  if (mode === "accepted" || mode === "partial" || mode === "cancelled") {
    return 200;
  }
  return 422;
}

void createGenerationRouter;
