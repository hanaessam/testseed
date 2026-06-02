import { ParseSchemaRequest, ParseSchemaResponse, ParsedSchema } from "@testseed/types";
import { parseManualSchemaLocal } from "./local-parser";
import { parseManualSchemaAI, AIParserOptions } from "./ai-parser";

export interface ParseSchemaOptions {
  openai?: any; // Injected OpenAI client instance
  model?: string; // OpenAI model to use
  forceAI?: boolean; // Force using AI even if local succeeds
}

/**
 * Main Schema Parser Use-Case/Orchestrator
 * Tries the fast local parser first, falling back to AI if needed and available.
 */
export async function parseManualSchema(
  request: ParseSchemaRequest,
  options: ParseSchemaOptions = {}
): Promise<ParseSchemaResponse> {
  const { schemaText } = request;
  const { openai, model, forceAI = false } = options;

  if (!schemaText || !schemaText.trim()) {
    throw new Error("Schema text cannot be empty.");
  }

  const warnings: string[] = [];

  // 1. If AI is forced and client is available, run AI parser immediately
  if (forceAI && openai) {
    try {
      const aiSchema = await parseManualSchemaAI(schemaText, { openai, model });
      return { schema: aiSchema, warnings };
    } catch (error: any) {
      warnings.push(`AI-assisted parsing failed: ${error.message}. Falling back to local parser.`);
    }
  }

  // 2. Run local sandbox-based parser
  let localResult: { schema: ParsedSchema; warnings: string[] } | null = null;
  try {
    localResult = parseManualSchemaLocal(schemaText);
  } catch (error: any) {
    warnings.push(`Local parsing failed: ${error.message}`);
  }

  // 3. If local succeeded and found valid collections, return them
  if (localResult && localResult.schema.collections.length > 0 && !forceAI) {
    return {
      schema: localResult.schema,
      warnings: [...warnings, ...localResult.warnings]
    };
  }

  // 4. If local parser failed or found nothing, and OpenAI is available, fall back to AI
  if (openai) {
    try {
      const aiSchema = await parseManualSchemaAI(schemaText, { openai, model });
      return {
        schema: aiSchema,
        warnings: [...warnings, ...(localResult ? localResult.warnings : [])]
      };
    } catch (aiError: any) {
      throw new Error(
        `Failed to parse schema. Local parser found no schemas, and AI parser failed: ${aiError.message}`
      );
    }
  }

  // 5. If we have a local result but it has no collections, and no AI client is available, return the empty result
  if (localResult) {
    return {
      schema: localResult.schema,
      warnings: [
        ...warnings,
        ...localResult.warnings,
        "No Mongoose models were detected. Provide an OpenAI API key or adjust your input schema code."
      ]
    };
  }

  throw new Error("Unable to parse schema. Please verify your pasted Mongoose schema definitions.");
}
