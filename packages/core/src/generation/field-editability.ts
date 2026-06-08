import type { SchemaField } from "@testseed/types";

export type FieldInputKind = "text" | "number" | "boolean" | "date" | "enum" | "readonly";

export function isFieldEditable(fieldName: string, field?: SchemaField): boolean {
  if (fieldName === "_id") {
    return false;
  }

  if (!field) {
    return false;
  }

  if (field.ref) {
    return false;
  }

  if (field.type === "ObjectId" || field.type === "Array" || field.type === "Object" || field.type === "Mixed") {
    return false;
  }

  return true;
}

export function getFieldInputKind(fieldName: string, field?: SchemaField): FieldInputKind {
  if (!isFieldEditable(fieldName, field) || !field) {
    return "readonly";
  }

  if (field.enum && field.enum.length > 0) {
    return "enum";
  }

  switch (field.type) {
    case "Number":
      return "number";
    case "Boolean":
      return "boolean";
    case "Date":
      return "date";
    default:
      return "text";
  }
}
