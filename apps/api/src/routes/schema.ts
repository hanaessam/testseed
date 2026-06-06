import { discoverMongoSchema, parseManualSchema, testMongoConnection } from "@testseed/core";
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
  sampleSize: z.number().int().min(1).max(100).optional()
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
      } catch (_error) {
        response.status(400).json({
          ok: false,
          message: "Unable to connect to MongoDB. Check the connection string and database access."
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
      } catch (_error) {
        response.status(400).json({
          message: "Unable to discover MongoDB schema. Check the connection string and database access."
        });
      }
    }
  );

  return router;
}
