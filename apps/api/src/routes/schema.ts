import { parseManualSchema } from "@testseed/core";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import OpenAI from "openai";

const parseSchemaRequestSchema = z.object({
  schemaText: z.string().min(1, "Schema text cannot be empty.")
});

export function createSchemaRouter(): Router {
  const router = Router();

  router.post(
    "/parse",
    validateBody(parseSchemaRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const { schemaText } = request.body;

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

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
