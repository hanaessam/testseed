import type {
  CandidateChangeSummary,
  CandidateReviewState,
  FeedbackRegenerationMode,
  GeneratedDataset,
  GenerationValidationResult
} from "@testseed/types";

export interface BuildCandidateChangeSummaryInput {
  acceptedDataset: GeneratedDataset;
  candidateDataset?: GeneratedDataset;
  mode: FeedbackRegenerationMode;
  message: string;
  validationResults: GenerationValidationResult[];
}

export function buildCandidateChangeSummary(
  input: BuildCandidateChangeSummaryInput
): CandidateChangeSummary {
  const candidateDataset = input.candidateDataset ?? input.acceptedDataset;
  const collectionsChanged: string[] = [];
  const preservedCollections: string[] = [];
  const fieldChangeCounts = new Map<string, number>();
  const collectionNames = Array.from(
    new Set([
      ...Object.keys(input.acceptedDataset.collections),
      ...Object.keys(candidateDataset.collections)
    ])
  ).sort();

  for (const collectionName of collectionNames) {
    const acceptedRecords = input.acceptedDataset.collections[collectionName] ?? [];
    const candidateRecords = candidateDataset.collections[collectionName] ?? [];
    if (JSON.stringify(acceptedRecords) === JSON.stringify(candidateRecords)) {
      preservedCollections.push(collectionName);
      continue;
    }

    collectionsChanged.push(collectionName);
    collectFieldChanges(collectionName, acceptedRecords, candidateRecords, fieldChangeCounts);
  }

  const notableFieldsChanged = Array.from(fieldChangeCounts.entries())
    .map(([key, count]) => {
      const [collectionName, fieldName] = key.split(":", 2);
      return { collectionName, fieldName, count };
    })
    .sort((left, right) =>
      left.collectionName === right.collectionName
        ? left.fieldName.localeCompare(right.fieldName)
        : left.collectionName.localeCompare(right.collectionName)
    );

  const noMeaningfulChanges = collectionsChanged.length === 0;
  const status = resolveSummaryStatus(input.mode, input.validationResults, noMeaningfulChanges);
  const message = input.message.trim();
  const firstBlockingMessage = input.validationResults.find((result) => result.severity === "error")?.message;

  return {
    status,
    collectionsChanged,
    notableFieldsChanged,
    preservedCollections,
    appliedFeedbackSummary: noMeaningfulChanges
      ? "No meaningful changes were made to the accepted dataset."
      : message || "Candidate changes are ready for review.",
    skippedFeedbackSummary:
      status === "partial" || status === "invalid"
        ? firstBlockingMessage ?? (message || "Some requested changes were skipped to preserve constraints.")
        : undefined,
    noMeaningfulChanges
  };
}

export function canAcceptCandidate(validationResults: GenerationValidationResult[]): boolean {
  return !validationResults.some((result) => result.severity === "error");
}

export function resolveCandidateReviewState(input: {
  mode: FeedbackRegenerationMode;
  validationResults: GenerationValidationResult[];
  retryAttempt?: number;
}): CandidateReviewState {
  if (input.mode === "cancelled") {
    return "rejected";
  }

  if (input.mode === "rejected" && input.retryAttempt === 1 && input.validationResults.length > 0) {
    return "awaiting_revised_feedback";
  }

  if (!canAcceptCandidate(input.validationResults)) {
    return "invalid";
  }

  if (input.mode === "accepted") {
    return "pending_review";
  }

  if (input.mode === "partial") {
    return "pending_review";
  }

  return "rejected";
}

export function hasFixableRetryProblem(validationResults: GenerationValidationResult[]): boolean {
  return validationResults.some(
    (result) =>
      result.code === "UNIQUE_VALUE_DUPLICATE" ||
      result.code === "REFERENCE_NOT_FOUND" ||
      result.code === "COUNT_MISMATCH" ||
      result.code === "REFINEMENT_EMPTY_RESPONSE"
  );
}

function collectFieldChanges(
  collectionName: string,
  acceptedRecords: Array<Record<string, unknown>>,
  candidateRecords: Array<Record<string, unknown>>,
  fieldChangeCounts: Map<string, number>
): void {
  const candidateById = new Map(candidateRecords.map((record) => [String(record._id), record]));

  for (const acceptedRecord of acceptedRecords) {
    const candidateRecord = candidateById.get(String(acceptedRecord._id));
    if (!candidateRecord) {
      incrementFieldChange(fieldChangeCounts, collectionName, "_record");
      continue;
    }

    const fieldNames = Array.from(
      new Set([...Object.keys(acceptedRecord), ...Object.keys(candidateRecord)])
    ).filter((fieldName) => fieldName !== "_id");

    for (const fieldName of fieldNames) {
      if (JSON.stringify(acceptedRecord[fieldName]) !== JSON.stringify(candidateRecord[fieldName])) {
        incrementFieldChange(fieldChangeCounts, collectionName, fieldName);
      }
    }
  }

  const acceptedIds = new Set(acceptedRecords.map((record) => String(record._id)));
  for (const candidateRecord of candidateRecords) {
    if (!acceptedIds.has(String(candidateRecord._id))) {
      incrementFieldChange(fieldChangeCounts, collectionName, "_record");
    }
  }
}

function incrementFieldChange(
  fieldChangeCounts: Map<string, number>,
  collectionName: string,
  fieldName: string
): void {
  const key = `${collectionName}:${fieldName}`;
  fieldChangeCounts.set(key, (fieldChangeCounts.get(key) ?? 0) + 1);
}

function resolveSummaryStatus(
  mode: FeedbackRegenerationMode,
  validationResults: GenerationValidationResult[],
  noMeaningfulChanges: boolean
): CandidateChangeSummary["status"] {
  if (validationResults.some((result) => result.severity === "error") || mode === "rejected") {
    return "invalid";
  }

  if (mode === "partial") {
    return "partial";
  }

  return noMeaningfulChanges ? "unchanged" : "changed";
}
