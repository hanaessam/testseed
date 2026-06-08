import type {
  DatasetCellEdit,
  GeneratedDataset,
  GeneratedRecord,
  ParsedSchema,
  SchemaField
} from "@testseed/types";
import { getFieldInputKind, isFieldEditable } from "./field-editability";
import { validateGeneratedDataset } from "./validate-generated-dataset";

export type CellEditRejectCode =
  | "FIELD_NOT_EDITABLE"
  | "RECORD_NOT_FOUND"
  | "FIELD_NOT_FOUND"
  | "COERCION_FAILED";

export class CellEditRejectedError extends Error {
  readonly code: CellEditRejectCode;
  readonly collectionName?: string;
  readonly fieldName?: string;

  constructor(
    code: CellEditRejectCode,
    message: string,
    options: { collectionName?: string; fieldName?: string } = {}
  ) {
    super(message);
    this.name = "CellEditRejectedError";
    this.code = code;
    this.collectionName = options.collectionName;
    this.fieldName = options.fieldName;
  }
}

export interface ApplyCellEditToDatasetInput {
  dataset: GeneratedDataset;
  schema: ParsedSchema;
  collectionCounts: Record<string, number>;
  edit: DatasetCellEdit;
}

export function applyCellEditToDataset(input: ApplyCellEditToDatasetInput): GeneratedDataset {
  const collection = input.schema.collections.find(
    (entry) => entry.name === input.edit.collectionName
  );
  if (!collection) {
    throw new CellEditRejectedError("FIELD_NOT_FOUND", `${input.edit.collectionName} is not part of the reviewed schema.`, {
      collectionName: input.edit.collectionName,
      fieldName: input.edit.fieldName
    });
  }

  const field = collection.fields.find((entry) => entry.name === input.edit.fieldName);
  if (!field) {
    throw new CellEditRejectedError("FIELD_NOT_FOUND", `${input.edit.fieldName} is not part of the reviewed schema.`, {
      collectionName: input.edit.collectionName,
      fieldName: input.edit.fieldName
    });
  }

  if (!isFieldEditable(input.edit.fieldName, field)) {
    throw new CellEditRejectedError(
      "FIELD_NOT_EDITABLE",
      input.edit.fieldName === "_id" || field.ref
        ? "Reference and identifier fields cannot be edited."
        : "This field cannot be edited in the table preview.",
      { collectionName: input.edit.collectionName, fieldName: input.edit.fieldName }
    );
  }

  const records = input.dataset.collections[input.edit.collectionName] ?? [];
  const recordIndex = records.findIndex((record) => record._id === input.edit.recordId);
  if (recordIndex < 0) {
    throw new CellEditRejectedError("RECORD_NOT_FOUND", "The selected record could not be found.", {
      collectionName: input.edit.collectionName,
      fieldName: input.edit.fieldName
    });
  }

  const coercedValue = coerceRawValue(input.edit.rawValue, field);
  const nextRecord: GeneratedRecord = {
    ...records[recordIndex],
    [input.edit.fieldName]: coercedValue
  };

  const nextCollections = {
    ...input.dataset.collections,
    [input.edit.collectionName]: records.map((record, index) =>
      index === recordIndex ? nextRecord : record
    )
  };

  const candidate: GeneratedDataset = {
    ...input.dataset,
    collections: nextCollections
  };

  const validation = validateGeneratedDataset({
    dataset: candidate,
    schema: input.schema,
    collectionCounts: input.collectionCounts
  });

  return {
    ...candidate,
    status: validation.status === "valid" ? "valid" : "invalid",
    validationResults: validation.validationResults,
    warnings: validation.warnings
  };
}

function coerceRawValue(rawValue: string, field: SchemaField): unknown {
  const trimmed = rawValue.trim();
  const inputKind = getFieldInputKind(field.name, field);

  if (inputKind === "enum") {
    if (!field.enum?.includes(trimmed)) {
      throw new CellEditRejectedError("COERCION_FAILED", "Select one of the reviewed enum values.", {
        fieldName: field.name
      });
    }
    return trimmed;
  }

  switch (field.type) {
    case "Number": {
      if (trimmed.length === 0) {
        return "";
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        throw new CellEditRejectedError("COERCION_FAILED", "Enter a valid number.", {
          fieldName: field.name
        });
      }
      return parsed;
    }
    case "Boolean": {
      if (trimmed === "true") {
        return true;
      }
      if (trimmed === "false") {
        return false;
      }
      throw new CellEditRejectedError("COERCION_FAILED", "Select true or false.", {
        fieldName: field.name
      });
    }
    case "Date":
      return trimmed;
    case "String":
    default:
      return rawValue;
  }
}
