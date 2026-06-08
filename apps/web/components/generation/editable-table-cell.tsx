"use client";

import { cn } from "@/src/lib/utils";
import type { FieldInputKind } from "@testseed/types";
import { useEffect, useRef, useState } from "react";

interface EditableTableCellProps {
  value: unknown;
  inputKind: FieldInputKind;
  enumOptions?: string[];
  isEdited?: boolean;
  isReadOnly?: boolean;
  readOnlyReason?: string;
  errorMessage?: string | null;
  disabled?: boolean;
  onCommit(rawValue: string): void;
}

export function EditableTableCell({
  value,
  inputKind,
  enumOptions = [],
  isEdited = false,
  isReadOnly = false,
  readOnlyReason = "This field cannot be edited.",
  errorMessage = null,
  disabled = false,
  onCommit
}: EditableTableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(formatEditableValue(value));
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(formatEditableValue(value));
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const cancelEdit = () => {
    setDraftValue(formatEditableValue(value));
    setIsEditing(false);
  };

  const commitEdit = () => {
    setIsEditing(false);
    onCommit(draftValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }

    if (event.key === "Enter" && inputKind !== "enum") {
      event.preventDefault();
      commitEdit();
    }
  };

  if (isReadOnly || inputKind === "readonly") {
    return (
      <div
        className="space-y-1"
        title={readOnlyReason}
      >
        <div className="rounded-sm bg-background/50 px-1 py-0.5 font-mono text-xs text-muted cursor-not-allowed">
          {formatDisplayValue(value)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {isEditing ? (
        inputKind === "enum" ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="w-full rounded-md border border-accent bg-background px-2 py-1 text-xs text-foreground ring-2 ring-accent/40 focus:outline-none"
            value={draftValue}
            disabled={disabled}
            onChange={(event) => {
              setDraftValue(event.target.value);
              onCommit(event.target.value);
              setIsEditing(false);
            }}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          >
            {enumOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : inputKind === "boolean" ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="w-full rounded-md border border-accent bg-background px-2 py-1 text-xs text-foreground ring-2 ring-accent/40 focus:outline-none"
            value={draftValue}
            disabled={disabled}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={inputKind === "number" ? "number" : inputKind === "date" ? "date" : "text"}
            className="w-full rounded-md border border-accent bg-background px-2 py-1 text-xs text-foreground ring-2 ring-accent/40 focus:outline-none"
            value={draftValue}
            disabled={disabled}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          />
        )
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsEditing(true)}
          className={cn(
            "w-full rounded-sm px-1 py-0.5 text-left text-xs leading-5 transition-colors",
            "hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent/40",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-text",
            isEdited && "border-l-2 border-accent pl-2"
          )}
        >
          <span className="break-words">{formatDisplayValue(value)}</span>
        </button>
      )}

      {isEdited ? (
        <span className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
          Edited
        </span>
      ) : null}

      {errorMessage ? (
        <p className="text-[11px] leading-4 text-danger-text">{errorMessage}</p>
      ) : null}
    </div>
  );
}

function formatEditableValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function formatDisplayValue(value: unknown) {
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
