import * as vm from "node:vm";
import { ParsedSchema, CollectionSchema, SchemaField } from "@testseed/types";

/**
 * Mock Schema class to capture schema definitions in the VM sandbox
 */
class SchemaMock {
  definition: any;
  options: any;
  static Types = {
    ObjectId: "ObjectId",
    String: "String",
    Number: "Number",
    Boolean: "Boolean",
    Date: "Date",
    Buffer: "Buffer",
    Mixed: "Mixed",
    Array: "Array"
  };

  constructor(definition: any, options?: any) {
    this.definition = definition;
    this.options = options;
  }
}

/**
 * Map JS/TS types to standard TestSeed schema type strings
 */
function getTypeName(val: any): string {
  if (!val) return "Mixed";
  if (val === String || val === "String" || (val && val.name === "String")) return "String";
  if (val === Number || val === "Number" || (val && val.name === "Number")) return "Number";
  if (val === Boolean || val === "Boolean" || (val && val.name === "Boolean")) return "Boolean";
  if (val === Date || val === "Date" || (val && val.name === "Date")) return "Date";
  
  const valStr = String(val);
  if (
    valStr === "ObjectId" ||
    valStr.includes("ObjectId") ||
    valStr.includes("Schema.Types.ObjectId") ||
    valStr.includes("mongoose.Schema.Types.ObjectId")
  ) {
    return "ObjectId";
  }

  if (Array.isArray(val)) return "Array";
  return "Mixed";
}

/**
 * Extract schema fields from raw Mongoose schema definition objects
 */
function parseSchemaDefinition(definition: any): SchemaField[] {
  const fields: SchemaField[] = [];
  if (!definition || typeof definition !== "object") {
    return fields;
  }

  for (const [key, rawValue] of Object.entries(definition)) {
    if (!rawValue) continue;

    const value = rawValue as any;
    let fieldType = "Mixed";
    let required = false;
    let unique = false;
    let enumValues: string[] | undefined = undefined;
    let ref: string | undefined = undefined;
    let defaultValue: string | undefined = undefined;

    if (Array.isArray(value)) {
      fieldType = "Array";
      if (value.length > 0) {
        const arrayItem = value[0];
        if (typeof arrayItem === "object" && arrayItem !== null) {
          if ("type" in arrayItem) {
            const innerType = getTypeName(arrayItem.type);
            if (innerType === "ObjectId" && arrayItem.ref) {
              ref = arrayItem.ref;
            }
          }
        } else {
          const innerType = getTypeName(arrayItem);
        }
      }
    } else if (
      typeof value === "object" &&
      value !== null &&
      !("name" in value && typeof value.name === "string" && (value === String || value === Number || value === Boolean || value === Date))
    ) {
      if ("type" in value) {
        fieldType = getTypeName(value.type);
        required = !!value.required;
        unique = !!value.unique;
        if (Array.isArray(value.enum)) {
          enumValues = value.enum.map((e: any) => String(e));
        }
        if (value.ref) {
          ref = value.ref;
        }
        if (value.default !== undefined) {
          defaultValue = typeof value.default === "function" ? value.default.name || "function" : String(value.default);
        }
      } else {
        // Nested object e.g., address: { street: String }
        fieldType = "Mixed";
      }
    } else {
      fieldType = getTypeName(value);
    }

    fields.push({
      name: key,
      type: fieldType,
      required,
      unique,
      enum: enumValues,
      enumSource: enumValues ? "declared" : undefined,
      ref,
      refConfidence: ref ? "explicit" : undefined,
      defaultValue
    });
  }

  return fields;
}

/**
 * Preprocess JS/TS schema code to remove imports/requires that throw inside the sandbox
 */
function cleanSchemaText(text: string): string {
  return text
    // Remove ES imports e.g., import mongoose from 'mongoose';
    .replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?/g, "")
    // Remove TypeScript-only declarations that are not executable in the VM sandbox.
    .replace(/^\s*export\s+interface\s+\w+[\s\S]*?^\s*}\s*$/gm, "")
    .replace(/^\s*interface\s+\w+[\s\S]*?^\s*}\s*$/gm, "")
    .replace(/^\s*export\s+type\s+\w+[\s\S]*?;\s*$/gm, "")
    .replace(/^\s*type\s+\w+[\s\S]*?;\s*$/gm, "")
    // Convert exported declarations/expressions into sandbox-runnable statements.
    .replace(/^\s*export\s+(?=(const|let|var|class|function)\b)/gm, "")
    .replace(/^\s*export\s+default\s+/gm, "")
    // Remove requires e.g., const mongoose = require('mongoose');
    .replace(/(const|let|var)\s+\w+\s*=\s*require\s*\([^)]+\);?/g, "")
    .replace(/(const|let|var)\s+\{\s*[^}]+\s*\}\s*=\s*require\s*\([^)]+\);?/g, "")
    // Remove type annotations on variable declarations safely, e.g. const UserSchema: Schema = ...
    .replace(/(const|let|var)\s+(\w+)\s*:\s*Schema/g, "$1 $2")
    // Convert top-level/indented const and let to var so they register on the sandbox object
    .replace(/^\s*(const|let)\s+/gm, (match, p1) => match.replace(p1, "var"))
    .trim();
}

/**
 * Deterministic schema parsing via static regex analysis (used as fallback or additional source)
 */
function parseSchemaStatic(text: string): ParsedSchema {
  const collections: CollectionSchema[] = [];
  
  // Find patterns like: new Schema({ ... }) or Schema({ ... })
  const schemaRegex = /(?:const|let|var)\s+(\w+)Schema\s*=\s*(?:new\s+)?(?:mongoose\.)?Schema\(\s*({[\s\S]*?})\s*\)/gi;
  let match;

  while ((match = schemaRegex.exec(text)) !== null) {
    const rawName = match[1];
    const rawFieldsText = match[2];
    const collectionName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    
    const fields: SchemaField[] = [];
    // Extract simple fields: fieldName: Type or fieldName: { type: Type }
    const fieldLines = rawFieldsText.split("\n");
    for (let line of fieldLines) {
      line = line.trim();
      if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) continue;

      const fieldMatch = /^["']?(\w+)["']?\s*:\s*(.+),?$/.exec(line);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const rest = fieldMatch[2].trim().replace(/,$/, "");

        let type = "Mixed";
        let required = false;
        let unique = false;
        let enumValues: string[] | undefined = undefined;
        let ref: string | undefined = undefined;

        if (rest.startsWith("{")) {
          // Config object e.g., { type: String, required: true }
          const typeMatch = /type\s*:\s*([^,}\s]+)/i.exec(rest);
          if (typeMatch) {
            type = typeMatch[1].replace(/['"]/g, "").trim();
          }
          if (/required\s*:\s*true/i.test(rest)) {
            required = true;
          }
          if (/unique\s*:\s*true/i.test(rest)) {
            unique = true;
          }
          const refMatch = /ref\s*:\s*['"]([^'"]+)['"]/i.exec(rest);
          if (refMatch) {
            ref = refMatch[1];
            type = "ObjectId";
          }
          const enumMatch = /enum\s*:\s*\[([^\]]*)\]/i.exec(rest);
          if (enumMatch) {
            enumValues = enumMatch[1]
              .split(",")
              .map((value) => value.replace(/['"]/g, "").trim())
              .filter(Boolean);
          }
        } else {
          // Direct type e.g., String
          type = rest.replace(/[\s,};]/g, "").trim();
        }

        // Standardize type
        if (type.includes("String")) type = "String";
        else if (type.includes("Number")) type = "Number";
        else if (type.includes("Boolean")) type = "Boolean";
        else if (type.includes("Date")) type = "Date";
        else if (type.includes("ObjectId")) type = "ObjectId";
        else if (type.startsWith("[")) type = "Array";
        else type = "Mixed";

        fields.push({
          name: fieldName,
          type,
          required,
          unique,
          enum: enumValues,
          enumSource: enumValues ? "declared" : undefined,
          ref,
          refConfidence: ref ? "explicit" : undefined
        });
      }
    }

    collections.push({
      name: collectionName,
      fields
    });
  }

  return { collections };
}

/**
 * Local Manual Schema Parser
 */
export function parseManualSchemaLocal(schemaText: string): { schema: ParsedSchema; warnings: string[] } {
  const warnings: string[] = [];
  const models: Record<string, SchemaMock> = {};
  
  // Set up Mongoose mock environment
  const mongooseMock = {
    Schema: SchemaMock,
    model: function(name: string, schema: any) {
      models[name] = schema;
      return { name, schema };
    },
    models: {} as Record<string, any>,
    Types: SchemaMock.Types
  };

  const sandbox = {
    mongoose: mongooseMock,
    Schema: SchemaMock,
    SchemaMock: SchemaMock,
    console,
    module: { exports: {} },
    exports: {},
    require: (pkg: string) => {
      if (pkg === "mongoose") return mongooseMock;
      throw new Error(`Cannot require module '${pkg}' inside schema parser sandbox.`);
    }
  };

  const cleanedText = cleanSchemaText(schemaText);

  try {
    const context = vm.createContext(sandbox);
    const script = new vm.Script(cleanedText);
    script.runInContext(context, { timeout: 1000 });

    // 1. Gather all models explicitly registered via mongoose.model
    const collections: CollectionSchema[] = [];
    for (const [modelName, schemaObj] of Object.entries(models)) {
      if (schemaObj && typeof schemaObj === "object" && "definition" in schemaObj) {
        collections.push({
          name: modelName,
          fields: parseSchemaDefinition((schemaObj as any).definition)
        });
      }
    }

    // 2. Fallback: Gather schemas defined in variables but not registered via mongoose.model
    for (const [key, val] of Object.entries(sandbox)) {
      if (val && typeof val === "object" && ("definition" in val || (val.constructor && val.constructor.name === "SchemaMock"))) {
        const potentialModelName = key.replace(/Schema$/, "");
        const formattedName = potentialModelName.charAt(0).toUpperCase() + potentialModelName.slice(1);
        if (!collections.some((c) => c.name === formattedName)) {
          collections.push({
            name: formattedName,
            fields: parseSchemaDefinition((val as any).definition)
          });
        }
      }
    }

    if (collections.length === 0) {
      // If sandbox succeeded but no collections were found, try regex static analysis
      const staticResult = parseSchemaStatic(schemaText);
      if (staticResult.collections.length > 0) {
        return { schema: staticResult, warnings };
      }
      warnings.push("No Mongoose models or Schema variables were detected. Verify your schema format.");
    }

    return {
      schema: { collections },
      warnings
    };

  } catch (error: any) {
    // If sandbox execution fails, fall back to static regex parsing
    const staticResult = parseSchemaStatic(schemaText);
    if (staticResult.collections.length > 0) {
      warnings.push(`Sandbox parser execution bypassed: ${error.message}. Loaded schema via static analysis.`);
      return { schema: staticResult, warnings };
    }

    throw new Error(`Failed to parse manual schema code: ${error.message}`);
  }
}
