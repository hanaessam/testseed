"use client";

import { EditableTableCell } from "@/components/generation/editable-table-cell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import type {
  FieldInputKind,
  GeneratedDataset,
  GenerationValidationResult,
  ParsedSchema,
  SchemaField
} from "@testseed/types";
import { ChevronLeft, ChevronRight, Database, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

export interface DatasetCellCommitPayload {
  collectionName: string;
  recordId: string;
  fieldName: string;
  rawValue: string;
}

interface CollectionDataTableProps {
  dataset: GeneratedDataset | null;
  regenerationLifecycle?:
    | "idle"
    | "submitted"
    | "in_progress"
    | "accepted"
    | "partial"
    | "rejected"
    | "cancelled"
    | "failed";
  schema?: ParsedSchema | null;
  validationResults?: GenerationValidationResult[];
  activeCollection?: string;
  onActiveCollectionChange?(collectionName: string): void;
  onGenerate?(): void;
  generateDisabled?: boolean;
  isGenerating?: boolean;
  editingDisabled?: boolean;
  editedCellKeys?: Set<string>;
  onCellCommit?(payload: DatasetCellCommitPayload): void;
  className?: string;
}

export function CollectionDataTable({
  dataset,
  regenerationLifecycle = "idle",
  schema,
  validationResults = [],
  activeCollection,
  onActiveCollectionChange,
  onGenerate,
  generateDisabled = false,
  isGenerating = false,
  editingDisabled = false,
  editedCellKeys = new Set<string>(),
  onCellCommit,
  className
}: CollectionDataTableProps) {
  const regenerationInFlight =
    regenerationLifecycle === "submitted" || regenerationLifecycle === "in_progress";
  const collectionNames = useMemo(() => {
    if (!dataset) {
      return [];
    }

    return dataset.generationOrder.length > 0
      ? dataset.generationOrder
      : Object.keys(dataset.collections);
  }, [dataset]);

  const [currentCollection, setCurrentCollection] = useState<string>("");
  const [pageByCollection, setPageByCollection] = useState<Record<string, number>>({});

  useEffect(() => {
    const nextCollection = activeCollection ?? collectionNames[0] ?? "";
    if (nextCollection && nextCollection !== currentCollection) {
      setCurrentCollection(nextCollection);
    }
    if (!nextCollection) {
      setCurrentCollection("");
    }
  }, [activeCollection, collectionNames, currentCollection]);

  const effectiveCollection = currentCollection || collectionNames[0] || "";
  const rows = dataset?.collections[effectiveCollection] ?? [];
  const page = pageByCollection[effectiveCollection] ?? 1;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginatedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const schemaFields = schema?.collections.find(
    (collection) => collection.name === effectiveCollection
  )?.fields;
  const fieldByName = useMemo(
    () => new Map((schemaFields ?? []).map((field) => [field.name, field])),
    [schemaFields]
  );
  const columns = getColumns(schemaFields, rows);
  const validationByCell = useMemo(
    () => buildValidationByCell(validationResults.filter((result) => result.collectionName === effectiveCollection || !result.collectionName)),
    [effectiveCollection, validationResults]
  );
  const collectionErrorCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const result of validationResults) {
      if (result.severity === "error" && result.collectionName) {
        counts.set(result.collectionName, (counts.get(result.collectionName) ?? 0) + 1);
      }
    }

    return counts;
  }, [validationResults]);

  const updateCollection = (collectionName: string) => {
    setCurrentCollection(collectionName);
    onActiveCollectionChange?.(collectionName);
  };

  const updatePage = (nextPage: number) => {
    setPageByCollection((currentPages) => ({
      ...currentPages,
      [effectiveCollection]: nextPage
    }));
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Generated data preview</h2>
        </div>
        <p className="text-xs leading-5 text-muted">
          Click editable cells to fix values directly on the data canvas. Reference and identifier
          fields stay read-only to preserve links between collections.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!dataset ? (
          <div className="rounded-lg border border-dashed border-border bg-background/40 px-4 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Database className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">No preview yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
              Set collection counts in the left rail, then generate realistic seed records to preview
              them here.
            </p>
            {onGenerate ? (
              <Button
                type="button"
                className="mt-5"
                onClick={onGenerate}
                disabled={generateDisabled || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate seed data
              </Button>
            ) : null}
          </div>
        ) : null}

        {dataset && collectionNames.length > 0 ? (
          <>
            {regenerationInFlight ? (
              <div className="rounded-md border border-info-border bg-info-subtle px-3 py-2 text-xs text-info-text">
                Regeneration is running. Current preview remains editable and unchanged until an
                accepted result is returned.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {collectionNames.map((collectionName) => {
                const isActive = collectionName === effectiveCollection;
                const rowCount = dataset.collections[collectionName]?.length ?? 0;
                const hasErrors = (collectionErrorCounts.get(collectionName) ?? 0) > 0;

                return (
                  <button
                    key={collectionName}
                    type="button"
                    onClick={() => updateCollection(collectionName)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-background/40 text-muted hover:text-foreground"
                    )}
                  >
                    <span>{collectionName}</span>
                    {hasErrors ? (
                      <span className="h-2 w-2 rounded-full bg-danger-text" aria-hidden="true" />
                    ) : null}
                    <span className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-medium">
                      {rowCount}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-background/60">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.name}
                        className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted"
                      >
                        <div className="flex items-center gap-2">
                          <span>{column.name}</span>
                          {column.isReference ? (
                            <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px] text-accent">
                              ref
                            </span>
                          ) : null}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={Math.max(columns.length, 1)}
                        className="px-4 py-6 text-center text-sm text-muted"
                      >
                        No rows available for this collection.
                      </td>
                    </tr>
                  ) : null}

                  {paginatedRows.map((row, rowIndex) => {
                    const rowId = getRowId(row, rowIndex, safePage);

                    return (
                      <tr key={rowId} className="align-top">
                        {columns.map((column) => {
                          const value = row[column.name];
                          const field = fieldByName.get(column.name);
                          const inputKind = resolveFieldInputKind(column.name, field);
                          const cellKey = `${rowId}:${column.name}`;
                          const cellErrors = validationByCell.get(cellKey) ?? [];
                          const primaryError = cellErrors.find((entry) => entry.severity === "error");

                          return (
                            <td
                              key={`${rowId}-${column.name}`}
                              className="max-w-[260px] px-3 py-2 text-xs text-foreground"
                            >
                              <EditableTableCell
                                value={value}
                                inputKind={inputKind}
                                enumOptions={field?.enum ?? []}
                                isEdited={editedCellKeys.has(cellKey)}
                                isReadOnly={inputKind === "readonly"}
                                readOnlyReason={
                                  column.name === "_id"
                                    ? "Document identifiers cannot be edited."
                                    : column.isReference
                                      ? "Reference fields preserve links between collections."
                                      : "This field cannot be edited in the table preview."
                                }
                                errorMessage={primaryError?.message ?? null}
                                disabled={editingDisabled || !onCellCommit}
                                onCommit={(rawValue) =>
                                  onCellCommit?.({
                                    collectionName: effectiveCollection,
                                    recordId: rowId,
                                    fieldName: column.name,
                                    rawValue
                                  })
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Page {safePage} of {pageCount} • {rows.length.toLocaleString()} total rows
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={safePage <= 1}
                  onClick={() => updatePage(Math.max(1, safePage - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={safePage >= pageCount}
                  onClick={() => updatePage(Math.min(pageCount, safePage + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getColumns(
  schemaFields: SchemaField[] | undefined,
  rows: Array<Record<string, unknown>>
): Array<{ name: string; isReference: boolean }> {
  if (schemaFields && schemaFields.length > 0) {
    return schemaFields.map((field) => ({
      name: field.name,
      isReference: Boolean(field.ref)
    }));
  }

  const firstRow = rows[0];
  if (!firstRow) {
    return [];
  }

  return Object.keys(firstRow).map((key) => ({
    name: key,
    isReference: /id$/i.test(key) && key !== "_id"
  }));
}

function resolveFieldInputKind(fieldName: string, field?: SchemaField): FieldInputKind {
  if (
    fieldName === "_id" ||
    !field ||
    field.ref ||
    field.type === "ObjectId" ||
    field.type === "Array" ||
    field.type === "Object" ||
    field.type === "Mixed"
  ) {
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

function buildValidationByCell(results: GenerationValidationResult[]) {
  const map = new Map<string, GenerationValidationResult[]>();

  for (const result of results) {
    if (!result.fieldName) {
      continue;
    }

    const recordKey = result.recordId ?? "unknown";
    const mapKey = `${recordKey}:${result.fieldName}`;
    const current = map.get(mapKey) ?? [];
    current.push(result);
    map.set(mapKey, current);
  }

  return map;
}

function getRowId(row: Record<string, unknown>, rowIndex: number, page: number) {
  const explicitId = typeof row._id === "string" ? row._id : undefined;
  return explicitId ?? `${page}-${rowIndex}`;
}
