import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import {
  remapDatasetIdsForInsertion,
  type RemapDatasetIdsForInsertionOptions
} from "./remap-dataset-ids-for-insertion";

export function isMongoObjectIdString(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}

export function datasetUsesMongoObjectIds(dataset: GeneratedDataset): boolean {
  for (const records of Object.values(dataset.collections)) {
    for (const record of records ?? []) {
      if (!isMongoObjectIdString(String(record._id))) {
        return false;
      }
    }
  }

  return true;
}

export function prepareDatasetIdsForInsertion(
  dataset: GeneratedDataset,
  schema: ParsedSchema,
  options: RemapDatasetIdsForInsertionOptions = {}
): GeneratedDataset {
  if (datasetUsesMongoObjectIds(dataset)) {
    return dataset;
  }

  return remapDatasetIdsForInsertion(dataset, schema, options);
}
