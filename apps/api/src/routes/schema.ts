import { parseManualSchema, saveParsedSchemaToProject } from "@testseed/core";
import type {
  createProjectRepository,
  createProjectHistoryRepository
} from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { type AuthenticatedRequest } from "../middleware/auth";

type ProjectRepository = ReturnType<typeof createProjectRepository>;
type ProjectHistoryRepository = ReturnType<typeof createProjectHistoryRepository>;

export interface SchemaRouterDeps {
  projectRepository?: ProjectRepository;
  projectHistoryRepository?: ProjectHistoryRepository;
}

const parseSchemaRequestSchema = z.object({
  schemaText: z.string().min(1, "Schema text cannot be empty."),
  projectId: z.string().min(1).optional(),
  source: z.enum(["manual", "mongodb", "ai"]).optional()
});

export function createSchemaRouter(deps: SchemaRouterDeps = {}): Router {
  const router = Router();

  router.post(
    "/parse",
    validateBody(parseSchemaRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { schemaText, projectId, source } = request.body;

        let openaiClient: OpenAI | undefined = undefined;
        if (process.env.OPENAI_API_KEY) {
          openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
          });
        }

        const result = await parseManualSchema(
          { schemaText },
          { openai: openaiClient }
        );

        if (!projectId || !deps.projectRepository || !deps.projectHistoryRepository) {
          response.status(200).json(result);
          return;
        }

        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const persisted = await saveParsedSchemaToProject(
          {
            projectId,
            ownerId: authenticatedRequest.auth.userId,
            schema: result.schema,
            source: source ?? "manual"
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            saveSchemaSnapshot: deps.projectRepository.saveSchemaSnapshot,
            updateProjectActiveSchema: deps.projectRepository.updateProjectActiveSchema,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json({
          ...result,
          project: persisted.project,
          snapshot: persisted.snapshot
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
