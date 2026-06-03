import { parseManualSchema } from "@testseed/core";
import type {
  createProjectRepository,
  createProjectHistoryRepository
} from "@testseed/db";
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

  return router;
}
