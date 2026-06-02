import { ParsedSchema } from "@testseed/types";

export interface AIParserOptions {
  openai: any; // Injected OpenAI client instance
  model?: string;
}

/**
 * AI-Assisted Schema Interpreter using OpenAI Structured Outputs
 */
export async function parseManualSchemaAI(
  schemaText: string,
  options: AIParserOptions
): Promise<ParsedSchema> {
  const { openai, model = "gpt-4o-mini" } = options;

  if (!openai) {
    throw new Error("OpenAI client is required for AI-assisted schema parsing.");
  }

  const jsonSchema = {
    name: "parsed_schema",
    strict: true,
    schema: {
      type: "object",
      properties: {
        collections: {
          type: "array",
          description: "List of collections/models detected in the Mongoose schema code.",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the collection/model, capitalized, e.g. User, Product, Order."
              },
              fields: {
                type: "array",
                description: "List of fields inside this collection.",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Field name." },
                    type: {
                      type: "string",
                      enum: ["String", "Number", "Boolean", "Date", "ObjectId", "Array", "Mixed"],
                      description: "Field type standardized to one of the specified Mongoose types."
                    },
                    required: { type: "boolean", description: "Whether this field is required." },
                    unique: { type: "boolean", description: "Whether this field has a unique constraint." },
                    enum: {
                      type: "array",
                      description: "List of allowed enum values if applicable.",
                      items: { type: "string" },
                      nullable: true
                    },
                    ref: {
                      type: "string",
                      description: "Target model/collection name if this is an ObjectId reference.",
                      nullable: true
                    },
                    defaultValue: {
                      type: "string",
                      description: "Default value if defined in the schema.",
                      nullable: true
                    }
                  },
                  required: ["name", "type", "required", "unique", "enum", "ref", "defaultValue"],
                  additionalProperties: false
                }
              }
            },
            required: ["name", "fields"],
            additionalProperties: false
          }
        }
      },
      required: ["collections"],
      additionalProperties: false
    }
  };

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are an expert Mongoose schema parser. Analyze the pasted JavaScript/TypeScript Mongoose schema definitions and extract the collections and their fields, types, and properties.
Standardize types strictly to one of: "String", "Number", "Boolean", "Date", "ObjectId", "Array", "Mixed".
If a field is a reference to another collection (using ObjectId), set its type to "ObjectId" and set "ref" to the target collection name.
Provide nullable fields as null if not set.`
      },
      {
        role: "user",
        content: `Please parse this schema text:\n\n${schemaText}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Received empty response from OpenAI schema parser.");
  }

  const parsed = JSON.parse(content);
  
  // Clean up nullable fields that were serialized as null to match SchemaField interface
  if (parsed && Array.isArray(parsed.collections)) {
    for (const coll of parsed.collections) {
      if (Array.isArray(coll.fields)) {
        coll.fields = coll.fields.map((field: any) => {
          const cleaned: any = { ...field };
          if (cleaned.enum === null) delete cleaned.enum;
          if (cleaned.ref === null) delete cleaned.ref;
          if (cleaned.defaultValue === null) delete cleaned.defaultValue;
          return cleaned;
        });
      }
    }
    return parsed as ParsedSchema;
  }

  throw new Error("OpenAI returned a response with an invalid schema format.");
}
