import type {
  GeneratedRecord,
  JavaScriptSeedScriptErrorCode,
  JavaScriptSeedScriptErrorDetails,
  JavaScriptSeedScriptRequest,
  JavaScriptSeedScriptResult,
  ParsedSchema,
  SchemaField
} from "@testseed/types";
import { validateGeneratedDataset } from "./validate-generated-dataset";

export class ExportJsSeedScriptError extends Error implements JavaScriptSeedScriptErrorDetails {
  code: JavaScriptSeedScriptErrorCode;

  constructor(details: JavaScriptSeedScriptErrorDetails) {
    super(details.message);
    this.name = "ExportJsSeedScriptError";
    this.code = details.code;
    this.validationResults = details.validationResults;
  }

  validationResults: JavaScriptSeedScriptErrorDetails["validationResults"];
}

export function exportJsSeedScript(
  input: JavaScriptSeedScriptRequest
): JavaScriptSeedScriptResult {
  const collectionCounts = input.collectionCounts ?? input.dataset.collectionCounts;
  const orderedCollections = resolveOrderedCollections(input.dataset);

  if (orderedCollections.length === 0) {
    throw new ExportJsSeedScriptError({
      code: "SCRIPT_EXPORT_DATASET_EMPTY",
      message: "Cannot export a JavaScript seed script because the dataset contains no records."
    });
  }

  const validation = validateGeneratedDataset({
    schema: input.schema,
    dataset: input.dataset,
    collectionCounts
  });

  const blockingResults = validation.validationResults.filter((result) => result.severity === "error");
  if (blockingResults.length > 0) {
    const hasUnresolvedReference = blockingResults.some((result) => result.code === "REFERENCE_NOT_FOUND");
    throw new ExportJsSeedScriptError({
      code: hasUnresolvedReference
        ? "SCRIPT_EXPORT_UNRESOLVED_REFERENCE"
        : "SCRIPT_EXPORT_VALIDATION_FAILED",
      message: hasUnresolvedReference
        ? "Cannot export a JavaScript seed script until unresolved references are fixed."
        : "Cannot export a JavaScript seed script until validation errors are fixed.",
      validationResults: blockingResults
    });
  }

  return {
    script: renderScript(input.schema, input.dataset.collections, orderedCollections),
    orderedCollections,
    warnings: validation.warnings
  };
}

function resolveOrderedCollections(dataset: JavaScriptSeedScriptRequest["dataset"]): string[] {
  const nonEmptyCollectionNames = Object.keys(dataset.collections).filter(
    (collectionName) => (dataset.collections[collectionName] ?? []).length > 0
  );

  if (nonEmptyCollectionNames.length === 0) {
    return [];
  }

  const generationOrder = dataset.generationOrder ?? [];
  const orderedCollections = generationOrder.filter(
    (collectionName) => (dataset.collections[collectionName] ?? []).length > 0
  );
  const orderedSet = new Set(orderedCollections);
  const missingCollections = nonEmptyCollectionNames.filter((collectionName) => !orderedSet.has(collectionName));

  if (missingCollections.length > 0) {
    throw new ExportJsSeedScriptError({
      code: "SCRIPT_EXPORT_DEPENDENCY_ORDER_UNSAFE",
      message: `Cannot export a JavaScript seed script because dependency order is missing for: ${missingCollections.join(", ")}.`
    });
  }

  return orderedCollections;
}

function renderScript(
  schema: ParsedSchema,
  collections: Record<string, GeneratedRecord[]>,
  orderedCollections: string[]
): string {
  const lines: string[] = [
    "// TestSeed JavaScript seed script.",
    "// Install dependency before running: npm install mongodb",
    "// Set MONGODB_URI to the target MongoDB connection string.",
    "// This insert-only script appends generated records to the target database.",
    'const { MongoClient, ObjectId } = require("mongodb");',
    "",
    "const uri = process.env.MONGODB_URI;",
    'if (!uri) {',
    '  throw new Error("Set MONGODB_URI before running this seed script.");',
    "}",
    "",
    "async function main() {",
    "  const client = new MongoClient(uri);",
    "",
    "  try {",
    "    await client.connect();",
    "    const db = client.db();",
    ""
  ];

  for (const collectionName of orderedCollections) {
    const variableName = toCollectionVariableName(collectionName);
    const records = collections[collectionName] ?? [];
    lines.push(`    const ${variableName} = ${serializeRecords(schema, collectionName, records, 4)};`);
    lines.push(`    await db.collection(${JSON.stringify(collectionName)}).insertMany(${variableName});`);
    lines.push("");
  }

  lines.push(
    "  } finally {",
    "    await client.close();",
    "  }",
    "}",
    "",
    "main().catch((error) => {",
    "  console.error(error);",
    "  process.exitCode = 1;",
    "});",
    ""
  );

  return lines.join("\n");
}

function serializeRecords(
  schema: ParsedSchema,
  collectionName: string,
  records: GeneratedRecord[],
  indent: number
): string {
  if (records.length === 0) {
    return "[]";
  }

  const fieldByName = new Map(
    schema.collections
      .find((collection) => collection.name === collectionName)
      ?.fields.map((field) => [field.name, field])
  );

  const lines: string[] = ["["];
  for (const [recordIndex, record] of records.entries()) {
    lines.push(`${spaces(indent + 2)}{`);
    const fieldNames = stableRecordFieldNames(record);

    for (const [fieldIndex, fieldName] of fieldNames.entries()) {
      const field = fieldByName.get(fieldName);
      const value = record[fieldName];
      const suffix = fieldIndex === fieldNames.length - 1 ? "" : ",";
      lines.push(
        `${spaces(indent + 4)}${formatPropertyName(fieldName)}: ${serializeValue(value, fieldName, field, indent + 4)}${suffix}`
      );
    }

    const recordSuffix = recordIndex === records.length - 1 ? "" : ",";
    lines.push(`${spaces(indent + 2)}}${recordSuffix}`);
  }
  lines.push(`${spaces(indent)}]`);

  return lines.join("\n");
}

function stableRecordFieldNames(record: GeneratedRecord): string[] {
  const fieldNames = Object.keys(record).filter((fieldName) => fieldName !== "_id").sort();
  return ["_id", ...fieldNames];
}

function serializeValue(
  value: unknown,
  fieldName: string,
  field: SchemaField | undefined,
  indent: number
): string {
  if (typeof value === "string" && shouldRenderObjectId(fieldName, field)) {
    return `ObjectId(${JSON.stringify(value)})`;
  }

  if (Array.isArray(value)) {
    return serializeArray(value, fieldName, field, indent);
  }

  if (isPlainObject(value)) {
    return serializeObject(value, indent);
  }

  return JSON.stringify(value);
}

function serializeArray(
  values: unknown[],
  fieldName: string,
  field: SchemaField | undefined,
  indent: number
): string {
  if (values.length === 0) {
    return "[]";
  }

  const serialized = values.map((value) => serializeValue(value, fieldName, field, indent + 2));
  return `[${serialized.join(", ")}]`;
}

function serializeObject(value: Record<string, unknown>, indent: number): string {
  const entries = Object.keys(value).sort();
  if (entries.length === 0) {
    return "{}";
  }

  const lines = ["{"];
  for (const [index, key] of entries.entries()) {
    const suffix = index === entries.length - 1 ? "" : ",";
    lines.push(`${spaces(indent + 2)}${formatPropertyName(key)}: ${serializeValue(value[key], key, undefined, indent + 2)}${suffix}`);
  }
  lines.push(`${spaces(indent)}}`);
  return lines.join("\n");
}

function shouldRenderObjectId(fieldName: string, field: SchemaField | undefined): boolean {
  return fieldName === "_id" || field?.type === "ObjectId" || Boolean(field?.ref);
}

function formatPropertyName(fieldName: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(fieldName) ? fieldName : JSON.stringify(fieldName);
}

function toCollectionVariableName(collectionName: string): string {
  const sanitized = collectionName.replace(/[^A-Za-z0-9_$]/g, "_");
  const variableName = sanitized.length > 0 ? sanitized : "records";
  return /^[A-Za-z_$]/.test(variableName) ? variableName : `collection_${variableName}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function spaces(count: number): string {
  return " ".repeat(count);
}
