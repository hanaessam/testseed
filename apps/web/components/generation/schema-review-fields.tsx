"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SchemaField } from "@testseed/types";
import type { ReactNode } from "react";

type ReviewBadgeTone = "neutral" | "accent" | "danger" | "info" | "warning";

const REVIEW_FIELD_TYPE_OPTIONS = [
  "String",
  "Number",
  "Boolean",
  "Date",
  "ObjectId",
  "Array",
  "Object",
  "Mixed"
];

interface SchemaReviewFieldsPanelProps {
  collectionName: string;
  sampleCount?: number;
  collectionWarnings?: string[];
  fields: SchemaField[];
  activeCollectionIdx: number;
  onFieldChange(
    collectionIndex: number,
    fieldIndex: number,
    updateField: (field: SchemaField) => SchemaField
  ): void;
}

export function SchemaReviewFieldsPanel({
  collectionName,
  sampleCount,
  collectionWarnings,
  fields,
  activeCollectionIdx,
  onFieldChange
}: SchemaReviewFieldsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{collectionName} fields</h3>
        </div>
        {typeof sampleCount === "number" ? (
          <span className="font-mono text-[10px] uppercase text-muted">
            {sampleCount} samples
          </span>
        ) : null}
      </div>

      {collectionWarnings && collectionWarnings.length > 0 ? (
        <div className="rounded-md border border-warning-border bg-warning-subtle px-3 py-2 text-xs text-warning-text">
          <p className="font-semibold text-foreground">Collection warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {collectionWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-border bg-background">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-border bg-surface text-muted">
              <th className="p-3 font-semibold">Field</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Rules</th>
              <th className="p-3 font-semibold">Review Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.length > 0 ? (
              fields.map((field, fieldIndex) => (
                <tr key={field.name} className="align-top hover:bg-surface/50">
                  <td className="p-3 font-bold text-foreground">{field.name}</td>
                  <td className="p-3">
                    <div className="space-y-2">
                      <select
                        aria-label={`${field.name} type`}
                        className="h-8 w-full rounded border border-border bg-surface px-2 text-xs text-foreground focus:border-accent focus:outline-none"
                        value={field.type}
                        onChange={(event) =>
                          onFieldChange(activeCollectionIdx, fieldIndex, (currentField) => ({
                            ...currentField,
                            type: event.target.value,
                            itemType:
                              event.target.value === "Array"
                                ? currentField.itemType
                                : undefined,
                            children:
                              event.target.value === "Array" || event.target.value === "Object"
                                ? currentField.children
                                : undefined
                          }))
                        }
                      >
                        {!REVIEW_FIELD_TYPE_OPTIONS.includes(field.type) ? (
                          <option value={field.type}>{field.type}</option>
                        ) : null}
                        {REVIEW_FIELD_TYPE_OPTIONS.map((typeOption) => (
                          <option key={typeOption} value={typeOption}>
                            {typeOption}
                          </option>
                        ))}
                      </select>
                      {field.itemType ? <ReviewBadge>items: {field.itemType}</ReviewBadge> : null}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex h-7 items-center gap-2 rounded border border-border bg-surface px-2 text-[10px] font-bold text-muted">
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-current"
                          checked={field.required}
                          onChange={(event) =>
                            onFieldChange(activeCollectionIdx, fieldIndex, (currentField) => ({
                              ...currentField,
                              required: event.target.checked
                            }))
                          }
                        />
                        required
                      </label>
                      {field.unique ? <ReviewBadge tone="info">unique</ReviewBadge> : null}
                      {field.confidence ? (
                        <ReviewBadge
                          tone={field.confidence === "low" ? "warning" : "neutral"}
                        >
                          {field.confidence} confidence
                        </ReviewBadge>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3">
                    <FieldEvidence
                      field={field}
                      onFieldChange={(nextField) =>
                        onFieldChange(activeCollectionIdx, fieldIndex, () => nextField)
                      }
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4 text-xs text-muted" colSpan={4}>
                  No fields were inferred for this collection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReviewBadge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: ReviewBadgeTone;
}) {
  const toneClass = {
    neutral: "border-border bg-surface text-muted",
    accent: "border-accent/20 bg-accent/5 text-accent",
    danger: "border-danger-border bg-danger-subtle text-danger-text",
    info: "border-info-border bg-info-subtle text-info-text",
    warning: "border-warning-border bg-warning-subtle text-warning-text"
  }[tone];

  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${toneClass}`}>
      {children}
    </span>
  );
}

export function FieldEvidence({
  field,
  onFieldChange
}: {
  field: SchemaField;
  onFieldChange: (field: SchemaField) => void;
}) {
  const hasEvidence = Boolean(
    field.ref ||
      field.enum?.length ||
      field.defaultValue ||
      field.children?.length ||
      field.warnings?.length
  );
  const canEditReference = field.refConfidence !== "explicit";
  const canEditEnum = field.enumSource !== "declared";

  if (!hasEvidence && !canEditReference) {
    return <span className="text-[10px] text-muted/50">No extra review evidence.</span>;
  }

  return (
    <div className="space-y-2 text-[10px] text-muted">
      <div className="space-y-1">
        <span className="font-bold text-accent">Reference:</span>
        {canEditReference ? (
          <Input
            aria-label={`${field.name} reference`}
            className="h-7 border-border bg-surface px-2 font-mono text-[10px]"
            value={field.ref ?? ""}
            onChange={(event) => {
              const nextRef = event.target.value.trim();
              onFieldChange({
                ...field,
                ref: nextRef || undefined,
                refConfidence: nextRef ? field.refConfidence ?? "possible" : undefined
              });
            }}
            placeholder="Collection name"
          />
        ) : (
          <div>
            <span className="text-foreground">{field.ref}</span>
            {field.refConfidence ? <span> ({field.refConfidence})</span> : null}
          </div>
        )}
      </div>

      {field.enumSource === "declared" && field.enum && field.enum.length > 0 ? (
        <div className="space-y-1">
          <div>
            <span className="font-bold text-accent">Declared enum values:</span>{" "}
            <span>read-only</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {field.enum.map((value) => (
              <ReviewBadge key={value}>{value}</ReviewBadge>
            ))}
          </div>
        </div>
      ) : null}

      {canEditEnum && (field.enumSource === "inferred" || (field.enum?.length ?? 0) > 0) ? (
        <div className="space-y-1">
          <div>
            <span className="font-bold text-accent">Enum-like values:</span>{" "}
            <span>inferred</span>
          </div>
          <Input
            aria-label={`${field.name} inferred enum values`}
            className="h-7 border-border bg-surface px-2 font-mono text-[10px]"
            value={(field.enum ?? []).join(", ")}
            onChange={(event) => {
              const values = splitReviewValues(event.target.value);
              onFieldChange({
                ...field,
                enum: values.length > 0 ? values : undefined,
                enumSource: values.length > 0 ? "inferred" : undefined
              });
            }}
            placeholder="value one, value two"
          />
        </div>
      ) : null}

      {field.defaultValue ? (
        <div>
          <span className="font-bold text-accent">Default:</span>{" "}
          <span className="text-foreground">{field.defaultValue}</span>
        </div>
      ) : null}

      {field.children && field.children.length > 0 ? (
        <div className="space-y-1">
          <span className="font-bold text-accent">Nested fields:</span>
          <div className="flex flex-wrap gap-1">
            {field.children.map((child) => (
              <ReviewBadge key={child.name}>
                {child.name}: {child.type}
              </ReviewBadge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <span className="font-bold text-accent">Warnings:</span>
        <Textarea
          aria-label={`${field.name} warnings`}
          className="min-h-16 resize-y border-border bg-surface p-2 font-mono text-[10px] text-warning-text"
          value={(field.warnings ?? []).join("\n")}
          onChange={(event) => {
            const nextWarnings = splitReviewLines(event.target.value);
            onFieldChange({
              ...field,
              warnings: nextWarnings.length > 0 ? nextWarnings : undefined
            });
          }}
          placeholder="No field warnings."
        />
      </div>
    </div>
  );
}

function splitReviewValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitReviewLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
