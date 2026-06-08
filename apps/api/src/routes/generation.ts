import {
  generateSeedData,
  refineGeneratedDataset,
  type SeedGenerationProvider,
  type SeedRefinementProvider
} from "@testseed/core";
import type {
  ChatRefinementMessage,
  GeneratedDataset,
  GeneratedRecord,
  GenerationValidationResult,
  ParsedSchema,
  SchemaField
} from "@testseed/types";
import type {
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

export interface GenerationRouterDeps {
  projectRepository: ProjectRepository;
  projectHistoryRepository: ProjectHistoryRepository;
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
  chatHistory: z.array(chatMessageSchema).optional()
});

export function createGenerationRouter(deps: GenerationRouterDeps): Router {
  const router = Router();

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

        await deps.projectHistoryRepository.appendProjectEvent({
          projectId: context.project.id,
          actorId: authenticatedRequest.auth.userId,
          kind: "generation_completed",
          message: "AI seed generation completed.",
          payload: {
            collectionCounts: dataset.collectionCounts,
            generationOrder: dataset.generationOrder
          },
          createdAt: new Date()
        });

        response.status(201).json({
          dataset,
          message: "Generated valid seed records."
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

        response.status(result.mode === "rejected" ? 422 : 200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
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

function createOpenAIRefinementProvider(deps: GenerationRouterDeps): SeedRefinementProvider {
  return async (providerRequest) => {
    if (!deps.openaiApiKey) {
      throw new Error("OpenAI seed refinement is not configured");
    }

    const openai = new OpenAI({ apiKey: deps.openaiApiKey });
    const completion = await openai.chat.completions.create({
      model: deps.model ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You refine generated MongoDB seed data. Return strict JSON. If changing records, return {\"mode\":\"updated_dataset\",\"message\":\"...\",\"collections\":{...}}. If answering only, return {\"mode\":\"guidance\",\"message\":\"...\"}. Preserve schema constraints, counts, ObjectId references, and grouped collections. Do not include prompts, secrets, or raw provider details."
        },
        {
          role: "user",
          content: JSON.stringify({
            schema: sanitizeSchema(providerRequest.schema),
            currentDataset: providerRequest.currentDataset,
            message: providerRequest.message,
            chatHistory: providerRequest.chatHistory,
            validationFeedback: providerRequest.validationFeedback ?? []
          })
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
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

void createGenerationRouter;
