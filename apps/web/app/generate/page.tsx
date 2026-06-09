"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AgentDockMessage } from "@/components/generation/agent-dock";
import { GenerationWorkbench } from "@/components/generation/generation-workbench";
import {
  isWizardStep,
  ProjectSetupWizard,
  type WizardStep
} from "@/components/generation/project-setup-wizard";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { DatasetCellCommitPayload } from "@/components/generation/collection-data-table";
import {
  applyDatasetCellEdit,
  createProject,
  discoverMongoSchema,
  generateSeedData,
  getGenerationPlan,
  getGenerationStreamUrl,
  getProjectDetail,
  getSavedGeneratedDataset,
  listSavedGeneratedDatasets,
  parseSchema,
  patchSavedGeneratedDataset,
  regenerateWithFeedback,
  saveManualEditDataset,
  startRepositoryContextAuthorization,
  testMongoConnection,
  updateProjectContext,
  updateProjectSchema
} from "@/src/lib/api-client";
import { redirectToLogin } from "@/src/lib/auth-session";
import { streamWorkbenchRequest } from "@/src/lib/generation-stream";
import type {
  CollectionProgress,
  PendingRegenerationCandidate
} from "@/src/lib/generation-workbench-state";
import { getSessionStatus, getStoredSession } from "@/src/lib/session";
import type {
  ChatRefinementMessage,
  ContextWarning,
  GeneratedDataset,
  GenerationPlanResponse,
  GenerationValidationResult,
  ParsedSchema,
  ProjectContext,
  ProjectSchemaSnapshot,
  RepositoryContextSource,
  SavedGeneratedDatasetSummary,
  SchemaField
} from "@testseed/types";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface SchemaFileDraft {
  name: string;
  content: string;
}

type SchemaInputMethod = "paste" | "upload" | "mongodb";

const GENERIC_REPOSITORY_WARNING_MESSAGE = "Repository context summary included a note.";
const STREAMING_ENABLED =
  process.env.NEXT_PUBLIC_GENERATION_WORKBENCH_STREAMING !== "false";
const EXPORT_ENABLED = process.env.NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT === "true";
const QUICK_PROMPT_CHIPS = [
  "Make users Canadian",
  "Use university.edu emails",
  "Increase product price variance"
];

type RegenerationLifecycleState =
  | "idle"
  | "submitted"
  | "in_progress"
  | "accepted"
  | "partial"
  | "rejected"
  | "cancelled"
  | "failed";

export default function GeneratePage() {
  const router = useRouter();
  const pathname = usePathname();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [repositoryDraft, setRepositoryDraft] = useState("");
  const [schemaText, setSchemaText] = useState("");
  const [schemaFiles, setSchemaFiles] = useState<SchemaFileDraft[]>([]);
  const [parsedSchema, setParsedSchema] = useState<ParsedSchema | null>(null);
  const [schemaSource, setSchemaSource] = useState<"manual" | "mongodb">("manual");
  const [mongoConnectionString, setMongoConnectionString] = useState("");
  const [mongoConnectionMessage, setMongoConnectionMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [contextWarnings, setContextWarnings] = useState<ContextWarning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [activeCollectionIdx, setActiveCollectionIdx] = useState(0);
  const [activeCollectionTab, setActiveCollectionTab] = useState("");
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [schemaSaveMessage, setSchemaSaveMessage] = useState<string | null>(null);
  const [isSavingSchema, setIsSavingSchema] = useState(false);
  const [isTestingMongo, setIsTestingMongo] = useState(false);
  const [isDiscoveringMongo, setIsDiscoveringMongo] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>({});
  const [generatedDataset, setGeneratedDataset] = useState<GeneratedDataset | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationValidationResults, setGenerationValidationResults] = useState<
    GenerationValidationResult[]
  >([]);
  const [isGeneratingSeedData, setIsGeneratingSeedData] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentDockMessage[]>([]);
  const [isRefiningDataset, setIsRefiningDataset] = useState(false);
  const [isGithubBusy, setIsGithubBusy] = useState(false);
  const [schemaMethod, setSchemaMethod] = useState<SchemaInputMethod>("paste");
  const [schemaIsSaved, setSchemaIsSaved] = useState(false);
  const [connectedRepository, setConnectedRepository] = useState<RepositoryContextSource | null>(
    null
  );
  const [setupRailExpanded, setSetupRailExpanded] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("project");
  const [workbenchActive, setWorkbenchActive] = useState(false);
  const [generationPlan, setGenerationPlan] = useState<GenerationPlanResponse | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<CollectionProgress[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [schemaSnapshot, setSchemaSnapshot] = useState<ProjectSchemaSnapshot | null>(null);
  const [contextUpdatedAt, setContextUpdatedAt] = useState<Date | null>(null);
  const [savedDatasets, setSavedDatasets] = useState<SavedGeneratedDatasetSummary[]>([]);
  const [isSavedDatasetsLoading, setIsSavedDatasetsLoading] = useState(false);
  const [activeSavedDatasetId, setActiveSavedDatasetId] = useState<string | null>(null);
  const [lastAcceptedDataset, setLastAcceptedDataset] = useState<GeneratedDataset | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<PendingRegenerationCandidate | null>(
    null
  );
  const [regenerationLifecycle, setRegenerationLifecycle] =
    useState<RegenerationLifecycleState>("idle");
  const [datasetBaselineFingerprint, setDatasetBaselineFingerprint] = useState<string | null>(null);
  const [editedCellKeys, setEditedCellKeys] = useState<Set<string>>(() => new Set());
  const [isSavingDataset, setIsSavingDataset] = useState(false);
  const [isCommittingCellEdit, setIsCommittingCellEdit] = useState(false);
  const [isAcceptingCandidate, setIsAcceptingCandidate] = useState(false);

  const hasUnsavedEdits = useMemo(() => {
    if (!generatedDataset) {
      return false;
    }

    if (!datasetBaselineFingerprint) {
      return editedCellKeys.size > 0;
    }

    return computeDatasetFingerprint(generatedDataset) !== datasetBaselineFingerprint;
  }, [datasetBaselineFingerprint, editedCellKeys, generatedDataset]);

  const canSaveDataset = useMemo(() => {
    if (!generatedDataset) {
      return false;
    }

    const hasErrors = generationValidationResults.some((result) => result.severity === "error");
    return generatedDataset.status === "valid" && !hasErrors;
  }, [generatedDataset, generationValidationResults]);

  const editingDisabled =
    isGeneratingSeedData || isRefiningDataset || isCommittingCellEdit || isSavingDataset;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const status = getSessionStatus();
    if (status === "expired") {
      redirectToLogin(router, "session_expired");
      return;
    }
    if (status === "missing") {
      redirectToLogin(router, "session_inactive");
      return;
    }

    const session = getStoredSession();
    const storedToken = session?.token ?? null;
    const existingProjectId = getProjectIdFromLocation();
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const urlStep = params.get("step");
    const githubConnected = params.get("context") === "github";

    setToken(storedToken);

    if (existingProjectId) {
      setProjectId(existingProjectId);
      setSavedProjectId(existingProjectId);
    }

    if (githubConnected) {
      setProjectMessage(
        "GitHub repository connected. Review the context below, then continue or skip."
      );
      setWizardStep("github");
    }

    if (!storedToken || !existingProjectId) {
      return;
    }

    getProjectDetail(existingProjectId, storedToken)
      .then((detail) => {
        if (!detail.project) {
          return;
        }

        setProjectName(detail.project.name);
        setProjectNameDraft(detail.project.name);
        setProjectDescription(
          detail.project.context?.description ?? detail.project.description ?? detail.project.name
        );
        setConnectedRepository(detail.project.context?.repository ?? null);
        setRepositoryDraft(detail.project.context?.repository?.repositoryFullName ?? "");
        setContextWarnings(detail.project.context?.warnings ?? []);
        setContextUpdatedAt(detail.project.context?.updatedAt ?? null);
        setSchemaSnapshot(detail.activeSchemaSnapshot ?? null);

        const activeSchema = detail.activeSchemaSnapshot?.schema ?? null;
        setParsedSchema(activeSchema);
        setSchemaMethod(detail.activeSchemaSnapshot?.source === "mongodb" ? "mongodb" : "paste");
        setSchemaSource(detail.activeSchemaSnapshot?.source === "mongodb" ? "mongodb" : "manual");
        setSchemaIsSaved(Boolean(activeSchema));
        setActiveCollectionIdx(0);
        setActiveCollectionTab(activeSchema?.collections[0]?.name ?? "");

        if (urlStep && isWizardStep(urlStep)) {
          setWizardStep(urlStep);
          setWorkbenchActive(false);
        } else if (githubConnected) {
          setWizardStep("github");
          setWorkbenchActive(false);
        } else if (mode === "generate") {
          setWorkbenchActive(Boolean(activeSchema));
          setSetupRailExpanded(false);
          if (!activeSchema) {
            setWizardStep("schema-choose");
          }
        } else if (mode === "edit") {
          setWorkbenchActive(false);
          setWizardStep(activeSchema ? "review" : "schema-choose");
        } else if (!existingProjectId) {
          setWizardStep("project");
          setWorkbenchActive(false);
        } else {
          setWizardStep("github");
          setWorkbenchActive(false);
        }

        if (githubConnected) {
          clearGithubCallbackParams();
        }
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the project for the generation workbench."
        );
      });
  }, [router]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [pathname]);

  useEffect(() => {
    if (!token || !projectId || !workbenchActive) {
      return;
    }

    let cancelled = false;

    const activeProjectId = projectId;
    const activeToken = token;

    async function hydrateSavedRuns() {
      const datasets = await refreshSavedDatasets(activeProjectId, activeToken);
      if (cancelled || datasets.length === 0) {
        return;
      }

      try {
        const latest = datasets[0];
        if (!latest) {
          return;
        }

        const response = await getSavedGeneratedDataset(activeProjectId, latest.id, activeToken);
        if (cancelled) {
          return;
        }

        setCollectionCounts({ ...response.dataset.collectionCounts });
        syncDatasetState(response.dataset, response.dataset.id);
        setAgentMessages(buildAgentMessagesFromChatHistory(response.dataset.chatHistory ?? []));
        setGenerationProgress(
          buildCompleteProgress(response.dataset, response.dataset.collectionCounts)
        );
      } catch {
        // Saved runs remain selectable from the panel if auto-load fails.
      }
    }

    void hydrateSavedRuns();

    return () => {
      cancelled = true;
    };
  }, [projectId, token, workbenchActive]);

  const hasSchemaInput = useMemo(
    () => Boolean(schemaText.trim()) || schemaFiles.some((file) => file.content.trim()),
    [schemaFiles, schemaText]
  );

  useEffect(() => {
    if (!parsedSchema) {
      setCollectionCounts({});
      setGenerationPlan(null);
      setActiveCollectionTab("");
      return;
    }

    setCollectionCounts((currentCounts) =>
      Object.fromEntries(
        parsedSchema.collections.map((collection) => [
          collection.name,
          currentCounts[collection.name] ?? 3
        ])
      )
    );
    setGeneratedDataset(null);
    setLastAcceptedDataset(null);
    setPendingCandidate(null);
    setGenerationValidationResults([]);
    setGenerationMessage(null);
    setRegenerationLifecycle("idle");
    setAgentMessages([]);
    setGenerationProgress([]);
    setActiveCollectionIdx(0);
    setActiveCollectionTab(parsedSchema.collections[0]?.name ?? "");
  }, [parsedSchema]);

  useEffect(() => {
    if (!projectId || !token || !parsedSchema) {
      setGenerationPlan(null);
      return;
    }

    let cancelled = false;
    setIsPlanLoading(true);

    getGenerationPlan(projectId, collectionCounts, token)
      .then((plan) => {
        if (cancelled) {
          return;
        }
        setGenerationPlan(plan);
      })
      .catch((planError) => {
        if (cancelled) {
          return;
        }

        setGenerationPlan(null);
        if (schemaIsSaved) {
          setGenerationMessage(
            planError instanceof Error
              ? planError.message
              : "Could not load the generation plan."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPlanLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [collectionCounts, parsedSchema, projectId, schemaIsSaved, token]);

  const totalRequestedRecords = useMemo(
    () => Object.values(collectionCounts).reduce((sum, count) => sum + count, 0),
    [collectionCounts]
  );

  const currentCollection = parsedSchema?.collections[activeCollectionIdx] ?? null;
  const meaningfulRepositoryWarnings = useMemo(
    () => getMeaningfulRepositoryWarnings(connectedRepository?.warnings ?? []),
    [connectedRepository]
  );
  const projectContext = useMemo<ProjectContext | null>(() => {
    if (!projectId) {
      return null;
    }

    return {
      description: projectDescription.trim() || undefined,
      repository: connectedRepository ?? undefined,
      warnings: contextWarnings,
      updatedAt: contextUpdatedAt ?? new Date()
    };
  }, [connectedRepository, contextUpdatedAt, contextWarnings, projectDescription, projectId]);

  const isBusy =
    isCreatingProject ||
    isGithubBusy ||
    isLoading ||
    isTestingMongo ||
    isDiscoveringMongo ||
    isSavingSchema ||
    isGeneratingSeedData ||
    isRefiningDataset ||
    isAcceptingCandidate;

  const canGenerate = Boolean(projectId && parsedSchema && totalRequestedRecords > 0) && !isBusy;
  const canFinish = Boolean(projectId && generatedDataset) && !isGeneratingSeedData;

  const abortInFlightOperation = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  };

  const startAbortableOperation = () => {
    abortInFlightOperation();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  };

  const syncDatasetState = (
    dataset: GeneratedDataset,
    savedDatasetId?: string,
    options: { setAsAccepted?: boolean } = {}
  ) => {
    setGeneratedDataset(dataset);
    setGenerationValidationResults([...dataset.validationResults, ...dataset.warnings]);
    setActiveCollectionTab(dataset.generationOrder[0] ?? Object.keys(dataset.collections)[0] ?? "");
    setDatasetBaselineFingerprint(computeDatasetFingerprint(dataset));
    setEditedCellKeys(new Set());
    setPendingCandidate(null);
    if (options.setAsAccepted ?? true) {
      setLastAcceptedDataset(dataset);
    }
    if (savedDatasetId) {
      setActiveSavedDatasetId(savedDatasetId);
    }
  };

  const handleCellCommit = async (payload: DatasetCellCommitPayload) => {
    if (!token || !projectId || !generatedDataset || !schemaSnapshot?.id) {
      setGenerationMessage("Save your schema and generate data before editing cells.");
      return;
    }

    const cellKey = `${payload.recordId}:${payload.fieldName}`;
    setIsCommittingCellEdit(true);

    try {
      const response = await applyDatasetCellEdit(
        projectId,
        {
          schemaSnapshotId: schemaSnapshot.id,
          collectionCounts,
          dataset: generatedDataset,
          edit: {
            collectionName: payload.collectionName,
            recordId: payload.recordId,
            fieldName: payload.fieldName,
            rawValue: payload.rawValue
          }
        },
        token
      );

      setGeneratedDataset(response.dataset);
      setGenerationValidationResults([...response.validationResults, ...response.warnings]);
      setEditedCellKeys((current) => {
        const next = new Set(current);
        next.add(cellKey);
        return next;
      });
    } catch (commitError) {
      setGenerationMessage(
        commitError instanceof Error ? commitError.message : "Could not apply the cell edit."
      );
    } finally {
      setIsCommittingCellEdit(false);
    }
  };

  const handleSaveDataset = async () => {
    if (!token || !projectId || !generatedDataset || !canSaveDataset || !hasUnsavedEdits) {
      return;
    }

    setIsSavingDataset(true);

    try {
      if (activeSavedDatasetId) {
        const response = await patchSavedGeneratedDataset(
          projectId,
          activeSavedDatasetId,
          { dataset: generatedDataset },
          token
        );
        syncDatasetState(response.dataset, response.dataset.id);
        setGenerationMessage("Saved changes to the active dataset run.");
      } else {
        const response = await saveManualEditDataset(
          projectId,
          {
            dataset: generatedDataset,
            chatHistory: toChatHistoryPayload(agentMessages)
          },
          token
        );
        syncDatasetState(response.dataset, response.savedDatasetId);
        setGenerationMessage("Saved dataset as a new run.");
      }

      await refreshSavedDatasets(projectId, token);
    } catch (saveError) {
      setGenerationMessage(
        saveError instanceof Error ? saveError.message : "Could not save the edited dataset."
      );
    } finally {
      setIsSavingDataset(false);
    }
  };

  const handleSaveDatasetAsNew = async () => {
    if (!token || !projectId || !generatedDataset || !canSaveDataset || !hasUnsavedEdits) {
      return;
    }

    setIsSavingDataset(true);

    try {
      const response = await saveManualEditDataset(
        projectId,
        {
          dataset: generatedDataset,
          chatHistory: toChatHistoryPayload(agentMessages)
        },
        token
      );
      syncDatasetState(response.dataset, response.savedDatasetId);
      setGenerationMessage("Saved a new dataset run from your edits.");
      await refreshSavedDatasets(projectId, token);
    } catch (saveError) {
      setGenerationMessage(
        saveError instanceof Error ? saveError.message : "Could not save the edited dataset."
      );
    } finally {
      setIsSavingDataset(false);
    }
  };

  const handleAcceptPendingCandidate = async () => {
    if (!token || !projectId || !pendingCandidate) {
      return;
    }

    const hasCandidateErrors = pendingCandidate.validationResults.some(
      (result) => result.severity === "error"
    );
    if (pendingCandidate.dataset.status !== "valid" || hasCandidateErrors) {
      setGenerationMessage("Resolve candidate validation errors before accepting it.");
      return;
    }

    setIsAcceptingCandidate(true);

    try {
      if (activeSavedDatasetId) {
        const response = await patchSavedGeneratedDataset(
          projectId,
          activeSavedDatasetId,
          {
            dataset: pendingCandidate.dataset,
            chatHistory: pendingCandidate.chatHistory
          },
          token
        );
        syncDatasetState(response.dataset, response.dataset.id, { setAsAccepted: true });
      } else {
        const response = await saveManualEditDataset(
          projectId,
          {
            dataset: pendingCandidate.dataset,
            chatHistory: pendingCandidate.chatHistory
          },
          token
        );
        syncDatasetState(response.dataset, response.savedDatasetId, { setAsAccepted: true });
      }

      setAgentMessages(buildAgentMessagesFromChatHistory(pendingCandidate.chatHistory));
      setRegenerationLifecycle("accepted");
      setGenerationMessage("Accepted regenerated candidate and saved it as the active dataset.");
      await refreshSavedDatasets(projectId, token);
    } catch (acceptError) {
      setGenerationMessage(
        acceptError instanceof Error
          ? acceptError.message
          : "Could not accept the regenerated candidate."
      );
    } finally {
      setIsAcceptingCandidate(false);
    }
  };

  const handleRejectPendingCandidate = () => {
    setPendingCandidate(null);
    setRegenerationLifecycle("rejected");
    setGenerationMessage("Rejected regenerated candidate. The last accepted dataset remains active.");
  };

  const handleNavigateToValidationIssue = (issue: GenerationValidationResult) => {
    if (issue.collectionName) {
      setActiveCollectionTab(issue.collectionName);
    }
  };

  useEffect(() => {
    if (!hasUnsavedEdits) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor?.href) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin || nextUrl.pathname === pathname) {
        return;
      }

      const shouldLeave = window.confirm(
        "You have unsaved edits on the data canvas. Leave without saving?"
      );
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedEdits, pathname]);

  const refreshSavedDatasets = async (targetProjectId: string, authToken: string) => {
    setIsSavedDatasetsLoading(true);
    try {
      const response = await listSavedGeneratedDatasets(targetProjectId, authToken);
      setSavedDatasets(response.datasets);
      return response.datasets;
    } catch {
      return [];
    } finally {
      setIsSavedDatasetsLoading(false);
    }
  };

  const loadSavedDataset = async (datasetId: string) => {
    if (!token || !projectId) {
      return;
    }

    try {
      const response = await getSavedGeneratedDataset(projectId, datasetId, token);
      setCollectionCounts({ ...response.dataset.collectionCounts });
      syncDatasetState(response.dataset, response.dataset.id);
      setGenerationProgress(buildCompleteProgress(response.dataset, response.dataset.collectionCounts));
      setGenerationMessage("Loaded a saved dataset preview.");
      setRegenerationLifecycle("idle");
      setAgentMessages(buildAgentMessagesFromChatHistory(response.dataset.chatHistory ?? []));
      setExportOpen(false);
    } catch (loadError) {
      setGenerationMessage(
        loadError instanceof Error ? loadError.message : "Could not load the saved dataset."
      );
    }
  };

  const handleReviewSchema = async () => {
    if (!projectId) {
      setError("Create a project first so TestSeed can save context before analysis.");
      return;
    }

    if (!hasSchemaInput) {
      setError("Paste a Mongoose schema or add one or more schema files first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      if (!token) {
        throw new Error("You must be logged in to parse schemas. Please sign in first.");
      }

      const response = await parseSchema(
        {
          schemaText,
          schemaFiles,
          source: "manual"
        },
        token
      );

      setParsedSchema(response.schema);
      setSchemaSource("manual");
      setSchemaMethod(schemaFiles.length > 0 ? "upload" : "paste");
      setSchemaSnapshot(null);
      setSchemaIsSaved(false);
      setSavedProjectId(projectId);
      setSchemaSaveMessage(null);
      setWarnings(response.warnings ?? []);
      setActiveCollectionIdx(0);
      setWizardStep("review");
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "An unexpected error occurred while parsing the schema."
      );
      setParsedSchema(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMongoConnection = async () => {
    if (!token) {
      setMongoConnectionMessage("You must be logged in to test a MongoDB connection.");
      return;
    }

    if (!mongoConnectionString.trim()) {
      setMongoConnectionMessage("Enter a MongoDB connection string first.");
      return;
    }

    setIsTestingMongo(true);
    setMongoConnectionMessage(null);
    setError(null);

    try {
      const result = await testMongoConnection(
        {
          connectionString: mongoConnectionString,
          projectId: projectId ?? undefined
        },
        token
      );

      setMongoConnectionMessage(
        result.databaseName
          ? `Connection successful for ${result.databaseName}.`
          : result.message
      );
    } catch (testError) {
      setMongoConnectionMessage(
        testError instanceof Error ? testError.message : "Could not test the MongoDB connection."
      );
    } finally {
      setIsTestingMongo(false);
    }
  };

  const handleDiscoverMongoSchema = async () => {
    if (!projectId) {
      setError("Create a project first so TestSeed can save context before discovery.");
      return;
    }

    if (!token) {
      setError("You must be logged in to discover a MongoDB schema.");
      return;
    }

    if (!mongoConnectionString.trim()) {
      setError("Enter a MongoDB connection string first.");
      return;
    }

    setIsDiscoveringMongo(true);
    setError(null);
    setWarnings([]);
    setMongoConnectionMessage(null);
    setSchemaSaveMessage(null);

    try {
      const response = await discoverMongoSchema(
        {
          connectionString: mongoConnectionString,
          projectId,
          sampleSize: 20
        },
        token
      );

      setParsedSchema(response.schema);
      setSchemaSource("mongodb");
      setSchemaMethod("mongodb");
      setSchemaSnapshot(null);
      setSchemaIsSaved(false);
      setWarnings(response.warnings);
      setMongoConnectionMessage(
        response.databaseName
          ? `Discovered schema from ${response.databaseName}.`
          : "Discovered schema from MongoDB."
      );
      setActiveCollectionIdx(0);
      setWizardStep("review");
    } catch (discoverError) {
      setError(
        discoverError instanceof Error
          ? discoverError.message
          : "Could not discover MongoDB schema."
      );
      setParsedSchema(null);
    } finally {
      setIsDiscoveringMongo(false);
    }
  };

  const handleCreateProject = async () => {
    if (!token) {
      setProjectMessage("You must be logged in to create a project.");
      return;
    }

    const nextProjectName = projectNameDraft.trim() || projectDescription.trim();
    if (!nextProjectName) {
      setProjectMessage("Project name is required.");
      return;
    }

    setIsCreatingProject(true);
    setProjectMessage(null);
    setContextWarnings([]);

    try {
      const created = await createProject(
        {
          name: nextProjectName,
          description: projectDescription.trim() || undefined
        },
        token
      );

      const activeProjectId = created.project.id;
      setProjectId(activeProjectId);
      setSavedProjectId(activeProjectId);
      setProjectName(created.project.name);
      setProjectNameDraft(created.project.name);

      const contextResponse = await updateProjectContext(
        activeProjectId,
        {
          description: projectDescription
        },
        token
      );

      setProjectDescription(
        contextResponse.project.context?.description ??
          contextResponse.project.description ??
          projectDescription
      );
      setConnectedRepository(contextResponse.project.context?.repository ?? null);
      setContextWarnings(contextResponse.project.context?.warnings ?? []);
      setContextUpdatedAt(contextResponse.project.context?.updatedAt ?? null);
      setProjectMessage("Project created. Add optional GitHub context next.");
      setWizardStep("github");
    } catch (createError) {
      setProjectMessage(
        createError instanceof Error ? createError.message : "Could not create project."
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleSaveExistingContext = async () => {
    if (!token || !projectId) {
      setProjectMessage("Create or load a project before saving context.");
      return;
    }

    setIsCreatingProject(true);
    setProjectMessage(null);

    try {
      const contextResponse = await updateProjectContext(
        projectId,
        {
          description: projectDescription
        },
        token
      );

      setProjectDescription(
        contextResponse.project.context?.description ??
          contextResponse.project.description ??
          projectDescription
      );
      setConnectedRepository(contextResponse.project.context?.repository ?? null);
      setContextWarnings(contextResponse.project.context?.warnings ?? []);
      setContextUpdatedAt(contextResponse.project.context?.updatedAt ?? null);
      setProjectMessage("Project context saved.");
    } catch (saveError) {
      setProjectMessage(
        saveError instanceof Error ? saveError.message : "Could not save project context."
      );
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleGithubSkip = () => {
    setProjectMessage(null);
    setWizardStep("schema-choose");
  };

  const handleGithubContinue = () => {
    setProjectMessage(null);
    setWizardStep("schema-choose");
  };

  const handleChooseSchemaMethod = (method: SchemaInputMethod) => {
    setSchemaMethod(method);
    setError(null);
    setSchemaSaveMessage(null);
    if (method === "paste") {
      setWizardStep("schema-paste");
      return;
    }
    if (method === "upload") {
      setWizardStep("schema-upload");
      return;
    }
    setWizardStep("schema-mongodb");
  };

  const handleWizardBack = () => {
    setError(null);
    setProjectMessage(null);
    setSchemaSaveMessage(null);
    setGenerationMessage(null);

    setWizardStep((current) => {
      if (current === "review") {
        if (schemaMethod === "paste") return "schema-paste";
        if (schemaMethod === "upload") return "schema-upload";
        if (schemaMethod === "mongodb") return "schema-mongodb";
        return "schema-choose";
      }
      if (current === "schema-paste" || current === "schema-upload" || current === "schema-mongodb") {
        return "schema-choose";
      }
      if (current === "schema-choose") return "github";
      if (current === "github") return "project";
      return current;
    });
  };

  const handleOpenWorkbench = () => {
    if (!projectId || !schemaIsSaved || !parsedSchema) {
      return;
    }

    setWorkbenchActive(true);
    setSetupRailExpanded(false);
    setError(null);
    setGenerationMessage(null);
    router.replace(`/generate?projectId=${encodeURIComponent(projectId)}&mode=generate`);
  };

  const handleGithubConnect = async () => {
    if (!token || !projectId) {
      setProjectMessage("Create a project before connecting GitHub.");
      return;
    }

    if (!repositoryDraft.trim()) {
      setProjectMessage("Enter owner/repo or a GitHub URL.");
      return;
    }

    setIsGithubBusy(true);
    setProjectMessage(null);

    try {
      const auth = await startRepositoryContextAuthorization(
        projectId,
        { repositoryFullName: repositoryDraft },
        token
      );
      window.location.href = auth.authorizationUrl;
    } catch (authError) {
      setProjectMessage(
        authError instanceof Error ? authError.message : "Could not start GitHub authorization."
      );
      setIsGithubBusy(false);
    }
  };

  const handleSaveParsedSchema = async () => {
    if (!token || !projectId || !parsedSchema) {
      setSchemaSaveMessage("Analyze a schema for a saved project before saving.");
      return;
    }

    setIsSavingSchema(true);
    setSchemaSaveMessage(null);

    try {
      const result = await updateProjectSchema(
        projectId,
        {
          schema: parsedSchema,
          source: schemaSource
        },
        token
      );

      setSavedProjectId(result.project.id);
      setSchemaSnapshot(result.snapshot);
      setSchemaIsSaved(true);
      setSchemaSaveMessage(`Saved schema v${result.project.activeSchemaVersion}.`);
    } catch (saveError) {
      setSchemaSaveMessage(
        saveError instanceof Error ? saveError.message : "Could not save schema."
      );
    } finally {
      setIsSavingSchema(false);
    }
  };

  const handleGenerateSeedData = async () => {
    if (!token || !projectId) {
      setGenerationMessage("Create or load a project before generating seed data.");
      return;
    }

    if (!parsedSchema) {
      setGenerationMessage("Review and save a schema before generating seed data.");
      return;
    }

    setIsGeneratingSeedData(true);
    setGenerationMessage(null);
    setGenerationValidationResults([]);
    setGeneratedDataset(null);
    setLastAcceptedDataset(null);
    setPendingCandidate(null);
    setRegenerationLifecycle("idle");
    setAgentMessages([]);
    setExportOpen(false);
    setGenerationProgress(buildInitialProgress(parsedSchema, collectionCounts));

    try {
      if (STREAMING_ENABLED) {
        const controller = startAbortableOperation();

        const fallbackResult = await streamWorkbenchRequest({
          url: getGenerationStreamUrl(projectId),
          token,
          body: { collectionCounts },
          signal: controller.signal,
          fallback: () => generateSeedData(projectId, { collectionCounts }, token),
          onEvent: (event) => {
            if (event.type === "plan") {
              setGenerationPlan((currentPlan) =>
                currentPlan
                  ? {
                      ...currentPlan,
                      orderedCollections: event.payload.orderedCollections,
                      totalRecords: event.payload.totalRecords
                    }
                  : currentPlan
              );
              return;
            }

            if (event.type === "collection_start") {
              setGenerationProgress((current) =>
                updateProgressStatus(current, event.payload.collectionName, "in_progress")
              );
              return;
            }

            if (event.type === "collection_complete") {
              setGenerationProgress((current) =>
                updateProgressStatus(
                  current,
                  event.payload.collectionName,
                  "complete",
                  event.payload.records.length
                )
              );
              setGenerationValidationResults((current) => [
                ...current,
                ...event.payload.validationResults
              ]);
              setGeneratedDataset((current) =>
                mergeCollectionIntoDataset(
                  current,
                  event.payload.collectionName,
                  event.payload.records,
                  projectId,
                  schemaSnapshot?.id ?? "",
                  collectionCounts,
                  parsedSchema.collections.map((collection) => collection.name)
                )
              );
              if (!activeCollectionTab) {
                setActiveCollectionTab(event.payload.collectionName);
              }
              return;
            }

            if (event.type === "collection_error") {
              setGenerationProgress((current) =>
                updateProgressStatus(current, event.payload.collectionName, "failed")
              );
              setGenerationMessage(event.payload.message);
              return;
            }

            if (event.type === "complete" && event.payload.dataset) {
              syncDatasetState(event.payload.dataset, event.payload.savedDatasetId);
              setGenerationProgress(buildCompleteProgress(event.payload.dataset, collectionCounts));
              setGenerationMessage(event.payload.message ?? "Generation completed.");
              return;
            }

            if (event.type === "error") {
              setGenerationMessage(event.payload.message);
              if (event.payload.validationResults) {
                setGenerationValidationResults(event.payload.validationResults);
              }
              return;
            }

            if (event.type === "cancelled") {
              setGenerationMessage("Generation cancelled.");
              setGeneratedDataset(null);
            }
          }
        });

        if (fallbackResult) {
          syncDatasetState(fallbackResult.dataset, fallbackResult.savedDatasetId);
          setGenerationProgress(buildCompleteProgress(fallbackResult.dataset, collectionCounts));
          setGenerationMessage(fallbackResult.message);
        }
      } else {
        const result = await generateSeedData(projectId, { collectionCounts }, token);
        syncDatasetState(result.dataset, result.savedDatasetId);
        setGenerationProgress(buildCompleteProgress(result.dataset, collectionCounts));
        setGenerationMessage(result.message);
      }

      if (token && projectId) {
        await refreshSavedDatasets(projectId, token);
      }
    } catch (generateError) {
      if (!isAbortError(generateError)) {
        setGenerationMessage(
          generateError instanceof Error ? generateError.message : "Could not generate seed data."
        );
      }
      setLastAcceptedDataset(null);
      setRegenerationLifecycle("idle");
    } finally {
      abortControllerRef.current = null;
      setIsGeneratingSeedData(false);
    }
  };

  const handleRefineGeneratedDataset = async (message: string) => {
    if (!token || !projectId || !generatedDataset) {
      setGenerationMessage("Generate a valid dataset before submitting regeneration feedback.");
      return;
    }

    if (isRefiningDataset) {
      return;
    }

    if (pendingCandidate) {
      setGenerationMessage("Accept or reject the pending regenerated candidate before sending new feedback.");
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setGenerationMessage("Feedback cannot be empty.");
      return;
    }

    const acceptedDataset = lastAcceptedDataset;
    if (!acceptedDataset) {
      setGenerationMessage("Generate a valid dataset before submitting regeneration feedback.");
      return;
    }

    const userMessage = createAgentMessage("user", trimmedMessage);
    const assistantMessageId = createMessageId();
    const priorChatHistory = toChatHistoryPayload(agentMessages);
    const schemaContext = parsedSchema
      ? parsedSchema.collections.map((collection) => `${collection.name}(${collection.fields.length})`).join(", ")
      : undefined;

    setIsRefiningDataset(true);
    setRegenerationLifecycle("submitted");
    setGenerationMessage(null);
    setAgentMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        status: "streaming",
        createdAt: new Date().toISOString()
      }
    ]);

    try {
      const controller = startAbortableOperation();
      setRegenerationLifecycle("in_progress");

      const result = await regenerateWithFeedback(
        projectId,
        {
          acceptedDataset,
          feedback: trimmedMessage,
          chatHistory: priorChatHistory,
          savedDatasetId: activeSavedDatasetId ?? undefined,
          projectContext: projectContext?.description,
          schemaContext,
          collectionCounts: acceptedDataset.collectionCounts
        },
        token,
        controller.signal
      );

      if (result.mode === "accepted" && result.dataset) {
        setPendingCandidate({
          dataset: result.dataset,
          message: result.message,
          savedDatasetId: result.savedDatasetId,
          validationResults: result.validationResults,
          warnings: result.warnings,
          chatHistory: result.chatHistory,
          candidateReview: result.candidateReview
        });
        setAgentMessages(buildAgentMessagesFromChatHistory(result.chatHistory));
      } else if (result.savedDatasetId) {
        setPendingCandidate(null);
        setAgentMessages(buildAgentMessagesFromChatHistory(result.chatHistory));
        setGenerationValidationResults([...result.validationResults, ...result.warnings]);
        setActiveSavedDatasetId(result.savedDatasetId);
      } else {
        setPendingCandidate(null);
        setAgentMessages(buildAgentMessagesFromChatHistory(result.chatHistory));
        setGenerationValidationResults([...result.validationResults, ...result.warnings]);
      }

      setRegenerationLifecycle(result.mode);
      setGenerationMessage(result.message);

      if (token && projectId) {
        await refreshSavedDatasets(projectId, token);
      }
    } catch (refineError) {
      if (isAbortError(refineError)) {
        setRegenerationLifecycle("cancelled");
        setAgentMessages((currentMessages) =>
          currentMessages.filter((currentMessage) => currentMessage.id !== assistantMessageId)
        );
        setGenerationMessage("Regeneration cancelled.");
      } else {
        const errorMessage =
          refineError instanceof Error
            ? refineError.message
            : "Could not regenerate the dataset from feedback.";

        setRegenerationLifecycle("failed");
        setAgentMessages((currentMessages) =>
          currentMessages.map((entry) =>
            entry.id === assistantMessageId
              ? { ...entry, content: errorMessage, status: "error" as const }
              : entry
          )
        );
        setGenerationMessage(errorMessage);
      }
    } finally {
      abortControllerRef.current = null;
      setIsRefiningDataset(false);
    }
  };

  const handleDemoSchema = () => {
    const demo = `const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
  profile: {
    age: Number,
    active: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, enum: ['Electronics', 'Books', 'Clothing'] },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true }
});

mongoose.model('User', UserSchema);
mongoose.model('Product', ProductSchema);`;
    setSchemaText(demo);
    setSchemaFiles([]);
    setSchemaMethod("paste");
    setError(null);
  };

  const handleSchemaFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const fileDrafts = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        content: await file.text()
      }))
    );

    setSchemaFiles((currentFiles) => [...currentFiles, ...fileDrafts]);
    setSchemaMethod("upload");
    setError(null);
    event.target.value = "";
  };

  const removeSchemaFile = (fileIndex: number) => {
    setSchemaFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex));
  };

  const updateReviewedField = (
    collectionIndex: number,
    fieldIndex: number,
    updateField: (field: SchemaField) => SchemaField
  ) => {
    setParsedSchema((currentSchema) => {
      if (!currentSchema) {
        return currentSchema;
      }

      return {
        ...currentSchema,
        collections: currentSchema.collections.map((collection, currentCollectionIndex) =>
          currentCollectionIndex === collectionIndex
            ? {
                ...collection,
                fields: collection.fields.map((field, currentFieldIndex) =>
                  currentFieldIndex === fieldIndex ? updateField(field) : field
                )
              }
            : collection
        )
      };
    });
  };

  const handleFinish = () => {
    if (!projectId) {
      return;
    }

    abortInFlightOperation();
    setPendingCandidate(null);
    router.push(`/projects/${projectId}`);
  };

  const handleEditProjectSetup = () => {
    setPendingCandidate(null);
    setWorkbenchActive(false);
    setWizardStep(schemaIsSaved ? "review" : "schema-choose");
    router.replace(
      projectId
        ? `/generate?projectId=${encodeURIComponent(projectId)}&mode=edit`
        : "/generate"
    );
  };

  const handleCollectionCountChange = (collectionName: string, nextCount: number) => {
    const safeCount = Math.max(0, Math.floor(Number(nextCount) || 0));
    const nextCounts = { ...collectionCounts, [collectionName]: safeCount };

    setCollectionCounts(nextCounts);

    if (generatedDataset) {
      const countsChanged = Object.keys(nextCounts).some(
        (name) => (nextCounts[name] ?? 0) !== (generatedDataset.collectionCounts[name] ?? 0)
      );

      if (countsChanged) {
        setGeneratedDataset(null);
        setLastAcceptedDataset(null);
        setPendingCandidate(null);
        setGenerationValidationResults([]);
        setGenerationProgress([]);
        setRegenerationLifecycle("idle");
        setActiveSavedDatasetId(null);
        setAgentMessages([]);
        setExportOpen(false);
        setGenerationMessage("Collection counts updated. Generate again to refresh the preview.");
      }
    }
  };

  const workbenchSetupContent = (
    <div className="space-y-4 text-sm">
      <p className="leading-6 text-muted">
        Project context and schema were configured in the setup wizard. Adjust collection counts
        below, review the generation plan, or return to edit setup.
      </p>
      <Button type="button" variant="secondary" className="w-full" onClick={handleEditProjectSetup}>
        Edit project setup
      </Button>
      {projectId ? (
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/projects/${projectId}`}>View project details</Link>
        </Button>
      ) : null}
    </div>
  );

  const wizardView = (
    <ProjectSetupWizard
      step={wizardStep}
      projectId={projectId}
      projectNameDraft={projectNameDraft}
      projectDescription={projectDescription}
      repositoryDraft={repositoryDraft}
      connectedRepository={connectedRepository}
      contextWarnings={contextWarnings}
      projectMessage={projectMessage}
      schemaText={schemaText}
      schemaFiles={schemaFiles}
      parsedSchema={parsedSchema}
      mongoConnectionString={mongoConnectionString}
      mongoConnectionMessage={mongoConnectionMessage}
      warnings={warnings}
      schemaSaveMessage={schemaSaveMessage}
      schemaIsSaved={schemaIsSaved}
      savedProjectId={savedProjectId}
      activeCollectionIdx={activeCollectionIdx}
      error={error}
      isCreatingProject={isCreatingProject}
      isGithubBusy={isGithubBusy}
      isLoading={isLoading}
      isTestingMongo={isTestingMongo}
      isDiscoveringMongo={isDiscoveringMongo}
      isSavingSchema={isSavingSchema}
      isBusy={isBusy}
      meaningfulRepositoryWarnings={meaningfulRepositoryWarnings}
      onProjectNameChange={setProjectNameDraft}
      onProjectDescriptionChange={setProjectDescription}
      onRepositoryDraftChange={setRepositoryDraft}
      onSchemaTextChange={setSchemaText}
      onMongoConnectionStringChange={setMongoConnectionString}
      onActiveCollectionIdxChange={setActiveCollectionIdx}
      onCreateProject={handleCreateProject}
      onSaveExistingContext={handleSaveExistingContext}
      onGithubConnect={handleGithubConnect}
      onGithubSkip={handleGithubSkip}
      onGithubContinue={handleGithubContinue}
      onChooseSchemaMethod={handleChooseSchemaMethod}
      onDemoSchema={handleDemoSchema}
      onReviewSchema={handleReviewSchema}
      onSchemaFiles={handleSchemaFiles}
      onRemoveSchemaFile={removeSchemaFile}
      onTestMongoConnection={handleTestMongoConnection}
      onDiscoverMongoSchema={handleDiscoverMongoSchema}
      onSaveParsedSchema={handleSaveParsedSchema}
      onFieldChange={updateReviewedField}
      onBack={handleWizardBack}
      onContinueToWorkbench={handleOpenWorkbench}
    />
  );

  const workbenchView = (
    <section className="flex h-svh shrink-0 flex-col overflow-hidden bg-background text-foreground">
      <div className="shrink-0 border-b border-border bg-surface px-6 py-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs text-accent">generation.workbench</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {projectName ?? "Generation workbench"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Generate seed data, preview collections, and refine with AI.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
              {schemaSnapshot ? (
                <span className="rounded-md border border-border bg-background/40 px-2.5 py-1">
                  Schema v{schemaSnapshot.version}
                </span>
              ) : null}
              {projectId ? (
                <span className="rounded-md border border-border bg-background/40 px-2.5 py-1 font-mono">
                  {projectId}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="secondary" onClick={handleEditProjectSetup}>
              Setup wizard
            </Button>
            <Button type="button" onClick={handleGenerateSeedData} disabled={!canGenerate}>
              {isGeneratingSeedData ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
            <Button type="button" variant="secondary" onClick={handleFinish} disabled={!canFinish}>
              Finish
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-3 lg:px-6 lg:py-4">
        {error ? (
          <Alert tone="danger" title="Action needed" className="shrink-0">
            {error}
          </Alert>
        ) : null}

        {generationMessage ? (
          <Alert tone="info" className="shrink-0">
            {generationMessage}
          </Alert>
        ) : null}

        <GenerationWorkbench
          className="min-h-0 flex-1"
          context={projectContext}
          schema={parsedSchema}
          plan={generationPlan}
          planIsLoading={isPlanLoading}
          regenerationLifecycle={regenerationLifecycle}
          dataset={generatedDataset}
          validationResults={generationValidationResults}
          progress={generationProgress}
          setupRailExpanded={setupRailExpanded}
          onSetupRailExpandedChange={setSetupRailExpanded}
          agentMessages={agentMessages}
          onAgentSubmit={handleRefineGeneratedDataset}
          agentBusy={isRefiningDataset}
          pendingCandidate={pendingCandidate}
          onAcceptCandidate={handleAcceptPendingCandidate}
          onRejectCandidate={handleRejectPendingCandidate}
          isAcceptingCandidate={isAcceptingCandidate}
          quickPromptChips={QUICK_PROMPT_CHIPS}
          setupContent={workbenchSetupContent}
          activeCollection={activeCollectionTab}
          onActiveCollectionChange={setActiveCollectionTab}
          showExport={EXPORT_ENABLED}
          exportOpen={exportOpen}
          onExportOpenChange={setExportOpen}
          savedDatasets={savedDatasets}
          savedDatasetsLoading={isSavedDatasetsLoading}
          activeSavedDatasetId={activeSavedDatasetId}
          onSavedDatasetSelect={loadSavedDataset}
          onGenerate={handleGenerateSeedData}
          generateDisabled={!canGenerate}
          isGenerating={isGeneratingSeedData}
          collectionCounts={collectionCounts}
          onCollectionCountChange={handleCollectionCountChange}
          countsDisabled={isBusy}
          editingDisabled={editingDisabled}
          editedCellKeys={editedCellKeys}
          onCellCommit={handleCellCommit}
          hasUnsavedEdits={hasUnsavedEdits}
          canSaveDataset={canSaveDataset}
          isSavingDataset={isSavingDataset}
          onSaveDataset={handleSaveDataset}
          onSaveDatasetAsNew={handleSaveDatasetAsNew}
          onNavigateToValidationIssue={handleNavigateToValidationIssue}
        />
      </div>
    </section>
  );

  return <AppShell>{workbenchActive ? workbenchView : wizardView}</AppShell>;
}

function getMeaningfulRepositoryWarnings(warnings: ContextWarning[]): ContextWarning[] {
  const seenMessages = new Set<string>();

  return warnings.filter((warning) => {
    const message = warning.message?.trim();
    if (!message || message === GENERIC_REPOSITORY_WARNING_MESSAGE) {
      return false;
    }

    const dedupeKey = message.toLowerCase();
    if (seenMessages.has(dedupeKey)) {
      return false;
    }

    seenMessages.add(dedupeKey);
    return true;
  });
}

function clearGithubCallbackParams(): void {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (!params.has("context")) {
    return;
  }

  params.delete("context");
  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

function getProjectIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("projectId");
}

function createMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createAgentMessage(
  role: AgentDockMessage["role"],
  content: string,
  status: AgentDockMessage["status"] = "complete"
): AgentDockMessage {
  return {
    id: createMessageId(),
    role,
    content,
    status,
    createdAt: new Date().toISOString()
  };
}

function buildAgentMessagesFromChatHistory(chatHistory: ChatRefinementMessage[]): AgentDockMessage[] {
  return chatHistory.map((message) =>
    createAgentMessage(message.role, message.content, "complete")
  );
}

function toChatHistoryPayload(messages: AgentDockMessage[]): ChatRefinementMessage[] {
  return messages
    .filter(
      (message): message is AgentDockMessage & { role: "user" | "assistant" } =>
        message.role === "user" || message.role === "assistant"
    )
    .map((message) => ({
      role: message.role,
      content: message.content
    }));
}

function buildInitialProgress(
  schema: ParsedSchema,
  collectionCounts: Record<string, number>
): CollectionProgress[] {
  return schema.collections.map((collection) => ({
    collectionName: collection.name,
    status: "pending",
    recordCount: collectionCounts[collection.name] ?? 0,
    rowsReceived: 0
  }));
}

function updateProgressStatus(
  currentProgress: CollectionProgress[],
  collectionName: string,
  status: CollectionProgress["status"],
  rowsReceived?: number
) {
  return currentProgress.map((item) =>
    item.collectionName === collectionName
      ? {
          ...item,
          status,
          rowsReceived: rowsReceived ?? item.rowsReceived
        }
      : item
  );
}

function buildCompleteProgress(
  dataset: GeneratedDataset,
  collectionCounts: Record<string, number>
): CollectionProgress[] {
  return dataset.generationOrder.map((collectionName) => ({
    collectionName,
    status: "complete",
    recordCount: collectionCounts[collectionName] ?? dataset.collections[collectionName]?.length ?? 0,
    rowsReceived: dataset.collections[collectionName]?.length ?? 0
  }));
}

function mergeCollectionIntoDataset(
  currentDataset: GeneratedDataset | null,
  collectionName: string,
  records: Array<Record<string, unknown>>,
  projectId: string,
  schemaSnapshotId: string,
  collectionCounts: Record<string, number>,
  generationOrder: string[]
): GeneratedDataset {
  const existingCollections = currentDataset?.collections ?? {};

  return {
    projectId,
    schemaSnapshotId,
    status: "valid",
    generationOrder,
    collectionCounts,
    collections: {
      ...existingCollections,
      [collectionName]: records.map((record) => record as GeneratedDataset["collections"][string][number])
    },
    validationResults: currentDataset?.validationResults ?? [],
    warnings: currentDataset?.warnings ?? [],
    createdAt: currentDataset?.createdAt ?? new Date().toISOString()
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function computeDatasetFingerprint(dataset: GeneratedDataset) {
  return JSON.stringify(dataset.collections);
}
