import type {
  GeneratedDataset,
  GeneratedRecord,
  GenerationValidationResult,
  ParsedSchema,
  SchemaField
} from "@testseed/types";
import { buildGenerationPlan, resolveCollectionName } from "./build-generation-plan";

export interface ValidateGeneratedDatasetInput {
  dataset: GeneratedDataset;
  schema: ParsedSchema;
  collectionCounts: Record<string, number>;
}

export function validateGeneratedDataset(
  input: ValidateGeneratedDatasetInput
): {
  status: "valid" | "invalid";
  validationResults: GenerationValidationResult[];
  warnings: GenerationValidationResult[];
} {
  const validationResults: GenerationValidationResult[] = [];
  const warnings: GenerationValidationResult[] = [];
  const schemaCollectionNames = input.schema.collections.map((collection) => collection.name);
  const collectionByName = new Map(
    input.schema.collections.map((collection) => [collection.name, collection])
  );
  const plan = buildGenerationPlan(input.schema, input.collectionCounts);
  validationResults.push(...plan.validationResults);
  warnings.push(...plan.warnings);

  for (const collectionName of Object.keys(input.dataset.collections)) {
    if (!collectionByName.has(collectionName)) {
      validationResults.push({
        severity: "error",
        collectionName,
        code: "EXTRA_COLLECTION",
        message: `${collectionName} is not part of the reviewed schema.`,
        suggestedAction: "Remove extra collections from the generated JSON."
      });
    }
  }

  for (const collectionName of schemaCollectionNames) {
    const expectedCount = input.collectionCounts[collectionName] ?? 0;
    const records = input.dataset.collections[collectionName] ?? [];
    if (records.length !== expectedCount) {
      validationResults.push({
        severity: "error",
        collectionName,
        code: "COUNT_MISMATCH",
        message: `${collectionName} returned ${records.length} records but ${expectedCount} were requested.`,
        suggestedAction: "Regenerate the collection with the requested count."
      });
    }

    const collection = collectionByName.get(collectionName);
    if (!collection) {
      continue;
    }

    validateRecords(collectionName, records, collection.fields, input.dataset, schemaCollectionNames, validationResults);
  }

  return {
    status: validationResults.some((result) => result.severity === "error") ? "invalid" : "valid",
    validationResults,
    warnings
  };
}

function validateRecords(
  collectionName: string,
  records: GeneratedRecord[],
  fields: SchemaField[],
  dataset: GeneratedDataset,
  schemaCollectionNames: string[],
  validationResults: GenerationValidationResult[]
): void {
  const ids = new Set<string>();
  for (const record of records) {
    if (!isObjectId(record._id)) {
      validationResults.push({
        severity: "error",
        collectionName,
        recordId: typeof record._id === "string" ? record._id : undefined,
        fieldName: "_id",
        code: "INVALID_OBJECT_ID",
        message: `${collectionName}._id must be a valid 24-character ObjectId string.`,
        suggestedAction: "Regenerate records with stable MongoDB ObjectId strings."
      });
    }

    if (ids.has(record._id)) {
      validationResults.push({
        severity: "error",
        collectionName,
        recordId: record._id,
        fieldName: "_id",
        code: "DUPLICATE_ID",
        message: `${collectionName} contains duplicate generated _id values.`,
        suggestedAction: "Regenerate records with unique identifiers."
      });
    }
    ids.add(record._id);
  }

  for (const field of fields) {
    validateUniqueField(collectionName, records, field, validationResults);
    for (const record of records) {
      validateField(collectionName, record, field, dataset, schemaCollectionNames, validationResults);
    }
  }
}

function validateField(
  collectionName: string,
  record: GeneratedRecord,
  field: SchemaField,
  dataset: GeneratedDataset,
  schemaCollectionNames: string[],
  validationResults: GenerationValidationResult[]
): void {
  const value = record[field.name];
  const isMissing = value === undefined || value === null || value === "";

  if (field.required && isMissing) {
    validationResults.push({
      severity: "error",
      collectionName,
      recordId: record._id,
      fieldName: field.name,
      code: "REQUIRED_FIELD_MISSING",
      message: `${collectionName}.${field.name} is required.`,
      suggestedAction: "Regenerate records with all required fields present."
    });
    return;
  }

  if (isMissing) {
    return;
  }

  if (!valueMatchesType(value, field)) {
    validationResults.push({
      severity: "error",
      collectionName,
      recordId: record._id,
      fieldName: field.name,
      code: "FIELD_TYPE_INVALID",
      message: `${collectionName}.${field.name} must match reviewed type ${field.type}.`,
      suggestedAction: "Regenerate records or adjust the reviewed field type."
    });
  }

  if (field.enum && field.enum.length > 0 && typeof value === "string" && !field.enum.includes(value)) {
    validationResults.push({
      severity: "error",
      collectionName,
      recordId: record._id,
      fieldName: field.name,
      code: "ENUM_VALUE_INVALID",
      message: `${collectionName}.${field.name} must use one of the reviewed enum values.`,
      suggestedAction: `Use one of: ${field.enum.join(", ")}.`
    });
  }

  if (field.ref) {
    validateReference(collectionName, record, field, value, dataset, schemaCollectionNames, validationResults);
  }

  if (field.type === "Object" && field.children && typeof value === "object" && !Array.isArray(value)) {
    for (const child of field.children) {
      validateField(collectionName, { ...record, ...value }, child, dataset, schemaCollectionNames, validationResults);
    }
  }
}

function validateUniqueField(
  collectionName: string,
  records: GeneratedRecord[],
  field: SchemaField,
  validationResults: GenerationValidationResult[]
): void {
  if (!field.unique) {
    return;
  }

  const seen = new Map<string, string>();
  for (const record of records) {
    const value = record[field.name];
    if (value === undefined || value === null) {
      continue;
    }
    const key = JSON.stringify(value);
    const existingRecordId = seen.get(key);
    if (existingRecordId) {
      validationResults.push({
        severity: "error",
        collectionName,
        recordId: record._id,
        fieldName: field.name,
        code: "UNIQUE_VALUE_DUPLICATE",
        message: `${collectionName}.${field.name} duplicates another generated value.`,
        suggestedAction: "Regenerate with unique values for this field."
      });
    } else {
      seen.set(key, record._id);
    }
  }
}

function validateReference(
  collectionName: string,
  record: GeneratedRecord,
  field: SchemaField,
  value: unknown,
  dataset: GeneratedDataset,
  schemaCollectionNames: string[],
  validationResults: GenerationValidationResult[]
): void {
  const parentName = resolveCollectionName(field.ref as string, schemaCollectionNames);
  if (!parentName) {
    return;
  }

  const parentIds = new Set((dataset.collections[parentName] ?? []).map((parent) => parent._id));
  const values = Array.isArray(value) ? value : [value];

  for (const item of values) {
    if (typeof item !== "string" || !parentIds.has(item)) {
      validationResults.push({
        severity: "error",
        collectionName,
        recordId: record._id,
        fieldName: field.name,
        code: "REFERENCE_NOT_FOUND",
        message: `${collectionName}.${field.name} must reference an existing ${parentName} record.`,
        suggestedAction: `Generate referenced ${parentName} records before ${collectionName}.`
      });
    }
  }
}

function valueMatchesType(value: unknown, field: SchemaField): boolean {
  switch (field.type) {
    case "String":
      return typeof value === "string";
    case "Number":
      return typeof value === "number" && Number.isFinite(value);
    case "Boolean":
      return typeof value === "boolean";
    case "Date":
      return typeof value === "string" && !Number.isNaN(Date.parse(value));
    case "ObjectId":
      return typeof value === "string" && isObjectId(value);
    case "Array":
      return Array.isArray(value);
    case "Object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "Mixed":
      return true;
    default:
      return true;
  }
}

function isObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}
