import type {
  DiscoveredCollectionSchema,
  MongoConnectionTestResponse,
  MongoDatabaseInspection,
  MongoSchemaDiscoveryRequest,
  MongoSchemaDiscoveryResponse,
  SchemaField
} from "@testseed/types";

export interface MongoSchemaDiscoveryInspector {
  testConnection(connectionString: string): Promise<{ databaseName?: string }>;
  inspectDatabase(
    connectionString: string,
    options: { sampleSize: number }
  ): Promise<MongoDatabaseInspection>;
}

export interface MongoSchemaDiscoveryOptions {
  inspector: MongoSchemaDiscoveryInspector;
}

type FieldType =
  | "String"
  | "Number"
  | "Boolean"
  | "Date"
  | "ObjectId"
  | "Array"
  | "Object"
  | "Null"
  | "Mixed";

type FieldStats = {
  name: string;
  occurrences: number;
  typeCounts: Map<FieldType, number>;
  values: unknown[];
  childDocuments: Record<string, unknown>[];
  arrayItems: unknown[];
};

const defaultSampleSize = 20;
const maxSampleSize = 100;
const objectIdPattern = /^[a-f\d]{24}$/i;

export async function testMongoConnection(
  request: MongoSchemaDiscoveryRequest,
  options: MongoSchemaDiscoveryOptions
): Promise<MongoConnectionTestResponse> {
  const connectionString = requireConnectionString(request.connectionString);
  const result = await options.inspector.testConnection(connectionString);

  return {
    ok: true,
    databaseName: result.databaseName,
    message: "Connection successful."
  };
}

export async function discoverMongoSchema(
  request: MongoSchemaDiscoveryRequest,
  options: MongoSchemaDiscoveryOptions
): Promise<MongoSchemaDiscoveryResponse> {
  const connectionString = requireConnectionString(request.connectionString);
  const sampleSize = normalizeSampleSize(request.sampleSize);
  const inspection = await options.inspector.inspectDatabase(connectionString, { sampleSize });
  const collectionNames = inspection.collections.map((collection) => collection.name);
  const warnings: string[] = [];

  if (inspection.collections.length === 0) {
    warnings.push("No collections were found. Paste a schema manually or choose another database.");
  }

  const collections: DiscoveredCollectionSchema[] = inspection.collections.map((collection) => {
    if (collection.documents.length === 0) {
      return {
        name: collection.name,
        fields: [],
        sampleCount: 0,
        warnings: ["Collection has no sample documents; fields were not inferred."]
      };
    }

    const fields = inferFields(collection.documents, collectionNames);
    const collectionWarnings = fields.flatMap((field) =>
      (field.warnings ?? []).map((warning) => `${field.name}: ${warning}`)
    );

    return {
      name: collection.name,
      fields,
      sampleCount: collection.documents.length,
      warnings: collectionWarnings
    };
  });

  return {
    databaseName: inspection.databaseName,
    collections,
    schema: {
      collections: collections.map((collection) => ({
        name: collection.name,
        fields: collection.fields
      }))
    },
    warnings: [
      ...warnings,
      ...collections.flatMap((collection) =>
        collection.warnings.map((warning) => `${collection.name}: ${warning}`)
      )
    ]
  };
}

function requireConnectionString(connectionString: string | undefined): string {
  if (!connectionString?.trim()) {
    throw new Error("MongoDB connection string is required.");
  }

  return connectionString.trim();
}

function normalizeSampleSize(sampleSize: number | undefined): number {
  if (!sampleSize || !Number.isFinite(sampleSize)) {
    return defaultSampleSize;
  }

  return Math.min(Math.max(Math.trunc(sampleSize), 1), maxSampleSize);
}

function inferFields(
  documents: Record<string, unknown>[],
  collectionNames: string[]
): SchemaField[] {
  const statsByName = new Map<string, FieldStats>();

  for (const document of documents) {
    for (const [name, value] of Object.entries(document)) {
      const stats = getOrCreateStats(statsByName, name);
      const type = detectValueType(value);

      stats.occurrences += 1;
      stats.typeCounts.set(type, (stats.typeCounts.get(type) ?? 0) + 1);
      stats.values.push(value);

      if (type === "Object" && isPlainRecord(value)) {
        stats.childDocuments.push(value);
      }

      if (Array.isArray(value)) {
        stats.arrayItems.push(...value);
      }
    }
  }

  return [...statsByName.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((stats) => toSchemaField(stats, documents.length, collectionNames));
}

function getOrCreateStats(statsByName: Map<string, FieldStats>, name: string): FieldStats {
  const existing = statsByName.get(name);
  if (existing) {
    return existing;
  }

  const stats: FieldStats = {
    name,
    occurrences: 0,
    typeCounts: new Map(),
    values: [],
    childDocuments: [],
    arrayItems: []
  };
  statsByName.set(name, stats);
  return stats;
}

function toSchemaField(
  stats: FieldStats,
  sampleCount: number,
  collectionNames: string[]
): SchemaField {
  const nonNullTypes = [...stats.typeCounts.keys()].filter((type) => type !== "Null");
  const type = chooseFieldType(nonNullTypes);
  const confidence = calculateConfidence(stats, sampleCount, type);
  const warnings = buildFieldWarnings(stats, sampleCount, type, confidence);
  const ref = inferReference(stats.name, type, collectionNames);

  return {
    name: stats.name,
    type,
    required: stats.occurrences === sampleCount && !stats.typeCounts.has("Null"),
    unique: false,
    confidence,
    warnings: warnings.length > 0 ? warnings : undefined,
    ref,
    itemType: type === "Array" ? inferArrayItemType(stats.arrayItems) : undefined,
    children:
      type === "Object"
        ? inferFields(stats.childDocuments, collectionNames)
        : type === "Array"
          ? inferArrayObjectChildren(stats.arrayItems, collectionNames)
          : undefined
  };
}

function chooseFieldType(types: FieldType[]): FieldType {
  const distinctTypes = [...new Set(types)];
  if (distinctTypes.length === 0) {
    return "Mixed";
  }

  if (distinctTypes.length === 1) {
    return distinctTypes[0];
  }

  if (distinctTypes.length === 2 && distinctTypes.includes("ObjectId") && distinctTypes.includes("String")) {
    return "ObjectId";
  }

  return "Mixed";
}

function calculateConfidence(
  stats: FieldStats,
  sampleCount: number,
  type: FieldType
): "high" | "medium" | "low" {
  const occurrenceRatio = stats.occurrences / sampleCount;
  const nonNullTypeCount = [...stats.typeCounts.keys()].filter((item) => item !== "Null").length;

  if (type === "Mixed" || nonNullTypeCount > 1) {
    return "low";
  }

  if (occurrenceRatio >= 0.9) {
    return "high";
  }

  if (occurrenceRatio > 0.5) {
    return "medium";
  }

  return "low";
}

function buildFieldWarnings(
  stats: FieldStats,
  sampleCount: number,
  type: FieldType,
  confidence: "high" | "medium" | "low"
): string[] {
  const warnings: string[] = [];
  const nonNullTypeCount = [...stats.typeCounts.keys()].filter((item) => item !== "Null").length;

  if (stats.occurrences < sampleCount) {
    warnings.push("Field is sparse across sampled documents.");
  }

  if (type === "Mixed" || nonNullTypeCount > 1) {
    warnings.push("Field has mixed or unclear sampled types.");
  }

  if (confidence === "low") {
    warnings.push("Inference confidence is low.");
  }

  return warnings;
}

function detectValueType(value: unknown): FieldType {
  if (value === null || value === undefined) {
    return "Null";
  }

  if (Array.isArray(value)) {
    return "Array";
  }

  if (value instanceof Date) {
    return "Date";
  }

  if (isObjectIdLike(value)) {
    return "ObjectId";
  }

  if (isPlainRecord(value)) {
    return "Object";
  }

  switch (typeof value) {
    case "string":
      return objectIdPattern.test(value) ? "ObjectId" : "String";
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    default:
      return "Mixed";
  }
}

function inferArrayItemType(items: unknown[]): string | undefined {
  if (items.length === 0) {
    return "Mixed";
  }

  const types = [...new Set(items.map(detectValueType).filter((type) => type !== "Null"))];
  return chooseFieldType(types);
}

function inferArrayObjectChildren(
  items: unknown[],
  collectionNames: string[]
): SchemaField[] | undefined {
  const childDocuments = items.filter(isPlainRecord);
  if (childDocuments.length === 0) {
    return undefined;
  }

  return inferFields(childDocuments, collectionNames);
}

function inferReference(
  fieldName: string,
  type: FieldType,
  collectionNames: string[]
): string | undefined {
  if (type !== "ObjectId") {
    return undefined;
  }

  const normalizedField = normalizeName(fieldName.replace(/Id$/i, ""));
  return collectionNames.find((collectionName) => {
    const normalizedCollection = normalizeName(collectionName);
    return (
      normalizedCollection === normalizedField ||
      normalizedCollection === `${normalizedField}s` ||
      normalizedCollection.replace(/s$/, "") === normalizedField
    );
  });
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !isObjectIdLike(value)
  );
}

function isObjectIdLike(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if ("_bsontype" in value && String(value._bsontype).toLowerCase().includes("objectid")) {
    return true;
  }

  if ("toHexString" in value && typeof value.toHexString === "function") {
    return objectIdPattern.test(String(value.toHexString()));
  }

  return false;
}
