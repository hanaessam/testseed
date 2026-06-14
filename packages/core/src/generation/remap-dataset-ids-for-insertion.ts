import { randomBytes } from "crypto";
import type { GeneratedDataset, GeneratedRecord, ParsedSchema, SchemaField } from "@testseed/types";
import { resolveCollectionName } from "./build-generation-plan";

export interface RemapDatasetIdsForInsertionOptions {
  generateId?: () => string;
}

export function remapDatasetIdsForInsertion(
  dataset: GeneratedDataset,
  schema: ParsedSchema,
  options: RemapDatasetIdsForInsertionOptions = {}
): GeneratedDataset {
  const generateId = options.generateId ?? (() => randomBytes(12).toString("hex"));
  const schemaCollectionNames = schema.collections.map((collection) => collection.name);
  const collectionByName = new Map(schema.collections.map((collection) => [collection.name, collection]));
  const orderedCollections = dataset.generationOrder.filter(
    (collectionName) => (dataset.collections[collectionName] ?? []).length > 0
  );
  const idMappings = new Map<string, Map<string, string>>();
  const remappedCollections: Record<string, GeneratedRecord[]> = {};

  for (const collectionName of orderedCollections) {
    const records = dataset.collections[collectionName] ?? [];
    const mapping = new Map<string, string>();

    remappedCollections[collectionName] = records.map((record) => {
      const oldId = String(record._id);
      const newId = mapping.get(oldId) ?? generateId();
      mapping.set(oldId, newId);
      return {
        ...record,
        _id: newId
      };
    });

    idMappings.set(collectionName, mapping);
  }

  for (const collectionName of orderedCollections) {
    const collection = collectionByName.get(collectionName);
    if (!collection) {
      continue;
    }

    remappedCollections[collectionName] = remappedCollections[collectionName].map((record) =>
      remapReferenceFields(record, collection.fields, idMappings, schemaCollectionNames)
    );
  }

  return {
    ...dataset,
    collections: {
      ...dataset.collections,
      ...remappedCollections
    }
  };
}

function remapReferenceFields(
  record: GeneratedRecord,
  fields: SchemaField[],
  idMappings: Map<string, Map<string, string>>,
  schemaCollectionNames: string[]
): GeneratedRecord {
  const updated: GeneratedRecord = { ...record };

  for (const field of fields) {
    if (field.type !== "ObjectId" || !field.ref) {
      continue;
    }

    const parentName = resolveCollectionName(field.ref, schemaCollectionNames);
    if (!parentName) {
      continue;
    }

    const parentMap = idMappings.get(parentName);
    if (!parentMap) {
      continue;
    }

    const value = updated[field.name];
    if (typeof value === "string") {
      const remapped = parentMap.get(value);
      if (remapped) {
        updated[field.name] = remapped;
      }
      continue;
    }

    if (Array.isArray(value)) {
      updated[field.name] = value.map((entry) => {
        if (typeof entry !== "string") {
          return entry;
        }

        return parentMap.get(entry) ?? entry;
      });
    }
  }

  return updated;
}
