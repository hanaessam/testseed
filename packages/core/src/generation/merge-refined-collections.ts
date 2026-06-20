import type { GeneratedRecord } from "@testseed/types";
import { canonicalCollectionName } from "./build-generation-plan";

export interface MergeRefinedCollectionsResult {
  collections: Record<string, GeneratedRecord[]>;
  preservedCollectionNames: string[];
  partialMergeCollectionNames: string[];
}

export function mergeRefinedCollections(
  current: Record<string, GeneratedRecord[]>,
  refined: Record<string, GeneratedRecord[]>,
  schemaCollectionNames: string[],
  collectionCounts: Record<string, number>
): MergeRefinedCollectionsResult {
  const preservedCollectionNames: string[] = [];
  const partialMergeCollectionNames: string[] = [];
  const merged: Record<string, GeneratedRecord[]> = {};
  const refinedByCanonical = new Map<string, GeneratedRecord[]>();

  for (const [key, records] of Object.entries(refined)) {
    if (!Array.isArray(records)) {
      continue;
    }
    refinedByCanonical.set(canonicalCollectionName(key), records);
  }

  for (const collectionName of schemaCollectionNames) {
    const currentRecords = current[collectionName] ?? [];
    const refinedRecords =
      refined[collectionName] ?? refinedByCanonical.get(canonicalCollectionName(collectionName)) ?? [];
    const expectedCount = collectionCounts[collectionName] ?? currentRecords.length;
    const nextRecords = enforceExpectedCount(
      mergeCollectionRecords(currentRecords, refinedRecords, expectedCount),
      expectedCount
    );

    merged[collectionName] = nextRecords;

    if (refinedRecords.length === 0 && currentRecords.length > 0) {
      preservedCollectionNames.push(collectionName);
      continue;
    }

    if (
      refinedRecords.length > 0 &&
      refinedRecords.length !== currentRecords.length &&
      refinedRecords.length !== expectedCount
    ) {
      partialMergeCollectionNames.push(collectionName);
    }
  }

  return {
    collections: merged,
    preservedCollectionNames,
    partialMergeCollectionNames
  };
}

function mergeCollectionRecords(
  currentRecords: GeneratedRecord[],
  refinedRecords: GeneratedRecord[],
  expectedCount: number
): GeneratedRecord[] {
  if (refinedRecords.length === 0) {
    return currentRecords;
  }

  if (refinedRecords.length === expectedCount) {
    return preserveRecordIds(currentRecords, refinedRecords);
  }

  const refinedById = new Map(
    refinedRecords
      .filter((record) => record._id !== undefined && record._id !== null)
      .map((record) => [String(record._id), record])
  );

  if (refinedById.size === 0) {
    return currentRecords;
  }

  return currentRecords.map((record) => {
    const patch = refinedById.get(String(record._id));
    if (!patch) {
      return record;
    }

    return {
      ...record,
      ...patch,
      _id: record._id
    };
  });
}

function enforceExpectedCount(records: GeneratedRecord[], expectedCount: number): GeneratedRecord[] {
  if (records.length <= expectedCount) {
    return records;
  }

  return records.slice(0, expectedCount);
}

function preserveRecordIds(
  currentRecords: GeneratedRecord[],
  refinedRecords: GeneratedRecord[]
): GeneratedRecord[] {
  const currentById = new Map(currentRecords.map((record) => [String(record._id), record]));

  return refinedRecords.map((record, index) => {
    const matchedCurrent = currentById.get(String(record._id)) ?? currentRecords[index];
    return {
      ...record,
      _id: matchedCurrent?._id ?? record._id
    };
  });
}
