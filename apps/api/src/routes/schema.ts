import { discoverMongoSchema, parseManualSchema, testMongoConnection } from "@testseed/core";
import type { MongoConnectionErrorCategory } from "@testseed/types";
import type {
  createProjectRepository,
  createProjectHistoryRepository
} from "@testseed/db";
import { createMongoSchemaDiscoveryInspector } from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { validateBody } from "../middleware/validate";

type ProjectRepository = ReturnType<typeof createProjectRepository>;
type ProjectHistoryRepository = ReturnType<typeof createProjectHistoryRepository>;

export interface SchemaRouterDeps {
  projectRepository?: ProjectRepository;
  projectHistoryRepository?: ProjectHistoryRepository;
}

const schemaFileSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1)
});

const parseSchemaRequestSchema = z
  .object({
    schemaText: z.string().optional(),
    schemaFiles: z.array(schemaFileSchema).optional(),
    projectId: z.string().min(1).optional(),
    source: z.enum(["manual", "mongodb", "ai"]).optional()
  })
  .refine(
    (request) =>
      Boolean(request.schemaText?.trim()) ||
      Boolean(request.schemaFiles?.some((file) => file.content.trim())),
    "Schema text or at least one schema file is required."
  );

const mongoSchemaDiscoveryRequestSchema = z.object({
  connectionString: z.string().min(1, "MongoDB connection string is required."),
  projectId: z.string().min(1).optional(),
  sampleSize: z.number().int().min(1).max(20).optional()
});

export function createSchemaRouter(deps: SchemaRouterDeps = {}): Router {
  const router = Router();

  router.post(
    "/parse",
    validateBody(parseSchemaRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        let openaiClient: OpenAI | undefined = undefined;
        if (process.env.OPENAI_API_KEY) {
          openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
          });
        }

        const result = await parseManualSchema(
          {
            schemaText: request.body.schemaText,
            schemaFiles: request.body.schemaFiles
          },
          { openai: openaiClient }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/mongodb/test-connection",
    validateBody(mongoSchemaDiscoveryRequestSchema),
    async (request: Request, response: Response) => {
      try {
        const result = await testMongoConnection(request.body, {
          inspector: createMongoSchemaDiscoveryInspector()
        });

        response.status(200).json(result);
      } catch (error) {
        const errorCategory = toMongoConnectionErrorCategory(error);
        response.status(400).json({
          ok: false,
          errorCategory,
          message: toMongoConnectionErrorMessage(errorCategory)
        });
      }
    }
  );

  router.post(
    "/mongodb/discover",
    validateBody(mongoSchemaDiscoveryRequestSchema),
    async (request: Request, response: Response) => {
      try {
        const result = await discoverMongoSchema(request.body, {
          inspector: createMongoSchemaDiscoveryInspector()
        });

        response.status(200).json(result);
      } catch (error) {
        const errorCategory = toMongoConnectionErrorCategory(error);
        response.status(400).json({
          errorCategory,
          message: toMongoConnectionErrorMessage(errorCategory)
        });
      }
    }
  );

  return router;
}

export function toMongoConnectionErrorCategory(error: unknown): MongoConnectionErrorCategory {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const normalized = `${code} ${message}`.toLowerCase();

  if (
    normalized.includes("invalid scheme") ||
    normalized.includes("invalid connection string") ||
    normalized.includes("mongodb connection string is required") ||
    normalized.includes("uri malformed") ||
    normalized.includes("invalid uri")
  ) {
    return "invalid_format";
  }

  if (
    normalized.includes("auth") ||
    normalized.includes("authentication") ||
    normalized.includes("bad auth") ||
    normalized.includes("unauthorized") ||
    code === "18"
  ) {
    return "authentication_failed";
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("etimedout")
  ) {
    return "timeout";
  }

  if (
    normalized.includes("enotfound") ||
    normalized.includes("econnrefused") ||
    normalized.includes("server selection") ||
    normalized.includes("getaddrinfo") ||
    normalized.includes("querysrv") ||
    normalized.includes("network")
  ) {
    return "unreachable_host";
  }

  return "unknown";
}

export function toMongoConnectionErrorMessage(
  category: MongoConnectionErrorCategory
): string {
  const messages: Record<MongoConnectionErrorCategory, string> = {
    invalid_format: "MongoDB connection string format is invalid.",
    unreachable_host: "MongoDB host could not be reached.",
    authentication_failed: "MongoDB authentication failed.",
    timeout: "MongoDB connection timed out.",
    unknown: "Unable to connect to MongoDB. Check the connection string and database access."
  };

  return messages[category];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function getErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "";
  }

  return String(error.code);
}
