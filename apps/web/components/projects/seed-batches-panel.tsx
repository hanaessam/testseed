"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { applySeedBatchVersion } from "@/src/lib/api-client";
import {
  canApplySeedBatchVersion,
  findActiveSeedBatch,
  formatSeedBatchStatus,
  totalSeedBatchRecords
} from "@/src/lib/seed-batch-versions";
import type { SeedBatch } from "@testseed/types";
import { Copy, Database, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

interface SeedBatchesPanelProps {
  projectId: string;
  token: string;
  batches: SeedBatch[];
  mongoUri?: string;
  onMongoUriChange?: (value: string) => void;
  onBatchRolledBack?: () => void | Promise<void>;
  title?: string;
  description?: string;
  emptyMessage?: string;
  className?: string;
}

export function SeedBatchesPanel({
  projectId,
  token,
  batches,
  mongoUri: controlledMongoUri,
  onMongoUriChange,
  onBatchRolledBack,
  title = "Seed runs",
  description = "Each direct seed creates a run. Pick any run to reseed MongoDB with that version.",
  emptyMessage = "No seed runs yet. Direct seed a dataset to create version history.",
  className
}: SeedBatchesPanelProps) {
  const [internalMongoUri, setInternalMongoUri] = useState("");
  const [applyingBatchId, setApplyingBatchId] = useState<string | null>(null);
  const [rowMessages, setRowMessages] = useState<Record<string, { tone: "success" | "error"; text: string }>>({});
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const mongoUri = controlledMongoUri ?? internalMongoUri;
  const setMongoUri = onMongoUriChange ?? setInternalMongoUri;
  const activeBatch = useMemo(() => findActiveSeedBatch(batches), [batches]);

  const handleApply = async (batch: SeedBatch) => {
    const trimmedConnection = mongoUri.trim();
    if (!trimmedConnection) {
      setRowMessages((current) => ({
        ...current,
        [batch.seedBatchId]: {
          tone: "error",
          text: "Enter the MongoDB connection string before applying a seed run."
        }
      }));
      return;
    }

    const confirmed = await confirm({
      title: "Apply this seed run?",
      description: `Reseed MongoDB with seed run ${batch.seedBatchId}? This replaces the current MongoDB data with that version.`,
      confirmLabel: "Apply to MongoDB"
    });
    if (!confirmed) {
      return;
    }

    setApplyingBatchId(batch.seedBatchId);
    setRowMessages((current) => {
      const next = { ...current };
      delete next[batch.seedBatchId];
      return next;
    });

    try {
      const result = await applySeedBatchVersion(
        projectId,
        {
          seedBatchId: batch.seedBatchId,
          mongoUri: trimmedConnection
        },
        token
      );

      setRowMessages((current) => ({
        ...current,
        [batch.seedBatchId]: {
          tone: "success",
          text: result.message
        }
      }));
      await onBatchRolledBack?.();
    } catch (error) {
      setRowMessages((current) => ({
        ...current,
        [batch.seedBatchId]: {
          tone: "error",
          text: error instanceof Error ? error.message : "Could not apply this seed run."
        }
      }));
    } finally {
      setApplyingBatchId(null);
    }
  };

  const handleCopyBatchId = async (seedBatchId: string) => {
    try {
      await navigator.clipboard.writeText(seedBatchId);
      setRowMessages((current) => ({
        ...current,
        [seedBatchId]: { tone: "success", text: "Copied seed run ID to clipboard." }
      }));
    } catch {
      setRowMessages((current) => ({
        ...current,
        [seedBatchId]: { tone: "error", text: "Could not copy seed run ID." }
      }));
    }
  };

  return (
    <div className={className}>
      <ConfirmDialog />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs leading-5 text-muted">{description}</p>
        <Input
          type="password"
          autoComplete="off"
          value={mongoUri}
          onChange={(event) => setMongoUri(event.target.value)}
          placeholder="MongoDB connection string"
        />
      </div>

      <div className="mt-4 space-y-3">
        {batches.length === 0 ? (
          <div className="border border-border bg-background p-4 text-xs leading-5 text-muted">{emptyMessage}</div>
        ) : (
          batches
            .slice()
            .reverse()
            .map((batch) => (
              <SeedBatchVersionRow
                key={batch.id}
                batch={batch}
                activeBatch={activeBatch}
                isApplying={applyingBatchId === batch.seedBatchId}
                message={rowMessages[batch.seedBatchId]}
                onCopy={() => handleCopyBatchId(batch.seedBatchId)}
                onApply={() => handleApply(batch)}
              />
            ))
        )}
      </div>
    </div>
  );
}

interface SeedBatchVersionRowProps {
  batch: SeedBatch;
  activeBatch: SeedBatch | null;
  isApplying: boolean;
  message?: { tone: "success" | "error"; text: string };
  onCopy: () => void;
  onApply: () => void;
}

function SeedBatchVersionRow({
  batch,
  activeBatch,
  isApplying,
  message,
  onCopy,
  onApply
}: SeedBatchVersionRowProps) {
  const isActive = activeBatch?.seedBatchId === batch.seedBatchId;
  const canApply = canApplySeedBatchVersion(batch);
  const recordCount = totalSeedBatchRecords(batch);
  const collectionCounts = batch.collectionCounts ?? {};
  const collectionOrder = batch.collectionOrder ?? [];

  return (
    <div className="border border-border bg-background p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs text-foreground">{batch.seedBatchId}</p>
            <Button type="button" variant="secondary" className="h-7 px-2 text-xs" onClick={onCopy}>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs ${
                isActive ? "border-accent/30 text-accent" : "border-border text-muted"
              }`}
            >
              {formatSeedBatchStatus(batch, activeBatch)}
            </span>
          </div>
          <p className="text-xs text-muted">
            {recordCount} record{recordCount === 1 ? "" : "s"}
            {collectionOrder.length > 0 ? ` · ${collectionOrder.join(" → ")}` : ""}
          </p>
          {Object.keys(collectionCounts).length > 0 ? (
            <p className="text-xs text-muted">
              {Object.entries(collectionCounts)
                .map(([collection, count]) => `${collection}: ${count}`)
                .join(", ")}
            </p>
          ) : null}
        </div>

        {canApply && !isActive ? (
          <Button type="button" variant="primary" disabled={isApplying} onClick={onApply} className="shrink-0">
            {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Apply to MongoDB
          </Button>
        ) : null}
      </div>

      {isApplying ? <p className="mt-2 text-xs text-muted">Applying seed run...</p> : null}

      {message ? (
        <Alert tone={message.tone === "success" ? "success" : "danger"} className="mt-3">
          {message.text}
        </Alert>
      ) : null}

      {!canApply && recordCount === 0 ? (
        <p className="mt-2 text-xs text-muted">This run inserted zero records.</p>
      ) : null}
    </div>
  );
}
