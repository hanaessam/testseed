"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import type {
  GeneratedDataset,
  GenerationValidationResult,
  ParsedSchema,
  SchemaField
} from "@testseed/types";
import { ChevronLeft, ChevronRight, Database, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

interface CollectionDataTableProps {
  dataset: GeneratedDataset | null;
  schema?: ParsedSchema | null;
  validationResults?: GenerationValidationResult[];
  activeCollection?: string;
  onActiveCollectionChange?(collectionName: string): void;
  onGenerate?(): void;
  generateDisabled?: boolean;
  isGenerating?: boolean;
  className?: string;
}

export function CollectionDataTable({
  dataset,
  schema,
  validationResults = [],
  activeCollection,
  onActiveCollectionChange,
  onGenerate,
  generateDisabled = false,
  isGenerating = false,
  className
}: CollectionDataTableProps) {
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
  const columns = getColumns(schemaFields, rows);
  const collectionValidation = validationResults.filter(
    (result) => !result.collectionName || result.collectionName === effectiveCollection
  );
  const validationByCell = useMemo(
    () => buildValidationByCell(collectionValidation),
    [collectionValidation]
  );

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
          Inspect each collection in a paginated table. Reference fields are rendered in monospace,
          and validation messages stay visible alongside the preview.
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
            <div className="flex flex-wrap gap-2">
              {collectionNames.map((collectionName) => {
                const isActive = collectionName === effectiveCollection;
                const rowCount = dataset.collections[collectionName]?.length ?? 0;

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
                    <span className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-medium">
                      {rowCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {collectionValidation.length > 0 ? (
              <Alert tone="warning" title="Validation messages">
                <div className="space-y-2">
                  {collectionValidation.map((result, index) => (
                    <div key={`${result.code}-${index}`} className="text-xs leading-5">
                      <span className="font-medium text-foreground">{result.code}</span>:{" "}
                      {result.message}
                      {result.fieldName ? (
                        <span className="ml-1 font-mono text-muted">[{result.fieldName}]</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Alert>
            ) : null}

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
                          const cellWarnings = validationByCell.get(`${rowId}:${column.name}`) ?? [];

                          return (
                            <td
                              key={`${rowId}-${column.name}`}
                              className="max-w-[260px] px-3 py-2 text-xs text-foreground"
                            >
                              <div className="space-y-1">
                                <div
                                  className={cn(
                                    "break-words leading-5",
                                    column.isReference && "font-mono text-accent"
                                  )}
                                >
                                  {formatCellValue(value)}
                                </div>
                                {cellWarnings.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {cellWarnings.map((warning, index) => (
                                      <span
                                        key={`${warning.code}-${index}`}
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                          warning.severity === "error"
                                            ? "border-danger-border bg-danger-subtle text-danger-text"
                                            : "border-warning-border bg-warning-subtle text-warning-text"
                                        )}
                                      >
                                        <ShieldAlert className="h-3 w-3" />
                                        {warning.code}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
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

function formatCellValue(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
