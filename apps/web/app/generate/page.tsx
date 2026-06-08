"use client";

import { ChangeEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Loader2,
  Database,
  Layers,
  FileCode2,
  X,
  ArrowLeft,
  ArrowRight,
  GitBranch,
  Upload,
  FileText
} from "lucide-react";
import {
  createProject,
  discoverMongoSchema,
  generateSeedData,
  getProjectDetail,
  parseSchema,
  refineGeneratedDataset,
  startRepositoryContextAuthorization,
  testMongoConnection,
  updateProjectContext,
  updateProjectSchema
} from "@/src/lib/api-client";
import { redirectToLogin } from "@/src/lib/auth-session";
import { getSessionStatus, getStoredSession } from "@/src/lib/session";
import { useRouter } from "next/navigation";
import type {
  ChatRefinementMessage,
  GeneratedDataset,
  GenerationValidationResult,
  ParsedSchema,
  ContextWarning,
  RepositoryContextSource,
  SchemaField
} from "@testseed/types";

interface SchemaFileDraft {
  name: string;
  content: string;
}

type WizardStep =
  | "project"
  | "github"
  | "schema-choose"
  | "schema-paste"
  | "schema-upload"
  | "schema-mongodb"
  | "review"
  | "generate"
  | "refine";

type SchemaInputMethod = "paste" | "upload" | "mongodb";

export default function GeneratePage() {
  const router = useRouter();
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
  const [contextWarnings, setContextWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [requestedMode, setRequestedMode] = useState<string | null>(null);
  const [activeCollectionIdx, setActiveCollectionIdx] = useState<number>(0);
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
  const [generationValidationResults, setGenerationValidationResults] = useState<GenerationValidationResult[]>([]);
  const [isGeneratingSeedData, setIsGeneratingSeedData] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatRefinementMessage[]>([]);
  const [isRefiningDataset, setIsRefiningDataset] = useState(false);
  const [isGithubBusy, setIsGithubBusy] = useState(false);
  const [schemaMethod, setSchemaMethod] = useState<SchemaInputMethod | null>(null);
  const [schemaIsSaved, setSchemaIsSaved] = useState(false);
  const [connectedRepository, setConnectedRepository] = useState<RepositoryContextSource | null>(null);
  const [step, setStep] = useState<WizardStep>("project");

  // Retrieve auth token on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
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
      const urlStep = params.get("step") as WizardStep | null;
      const githubConnected = params.get("context") === "github";
      setToken(storedToken);
      setRequestedMode(mode);

      if (existingProjectId) {
        setProjectId(existingProjectId);
      }

      if (githubConnected) {
        setProjectMessage("GitHub repository connected. Review the context below, then continue or skip.");
      }

      if (storedToken && existingProjectId) {
        getProjectDetail(existingProjectId, storedToken)
          .then((detail) => {
            if (detail.project) {
              setProjectName(detail.project.name);
              setProjectNameDraft(detail.project.name);
              setProjectDescription(
                detail.project.context?.description ?? detail.project.description ?? detail.project.name
              );
              const repository = detail.project.context?.repository ?? null;
              setRepositoryDraft(repository?.repositoryFullName ?? "");
              setConnectedRepository(repository);
              setContextWarnings(
                detail.project.context?.warnings.map((warning) => warning.message) ?? []
              );
              const activeSchema = detail.activeSchemaSnapshot?.schema ?? null;
              setParsedSchema(activeSchema);
              setActiveCollectionIdx(0);
              setSchemaIsSaved(Boolean(activeSchema));

              if (urlStep && isWizardStep(urlStep)) {
                setStep(urlStep);
              } else if (githubConnected) {
                setStep("github");
              } else if (mode === "generate") {
                setStep(activeSchema ? "generate" : "schema-choose");
              } else if (mode === "edit") {
                setStep(activeSchema ? "review" : "schema-choose");
              } else {
                setStep("github");
              }

              if (githubConnected) {
                clearGithubCallbackParams();
              }
            }
          })
          .catch((loadError) => {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Could not load the project for schema update."
            );
          });
      }
    }
  }, [router]);

  const hasSchemaInput = useMemo(
    () => Boolean(schemaText.trim()) || schemaFiles.some((file) => file.content.trim()),
    [schemaFiles, schemaText]
  );

  useEffect(() => {
    if (!parsedSchema) {
      setCollectionCounts({});
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
    setGenerationValidationResults([]);
    setGenerationMessage(null);
    setChatHistory([]);
  }, [parsedSchema]);

  const totalRequestedRecords = useMemo(
    () => Object.values(collectionCounts).reduce((sum, count) => sum + count, 0),
    [collectionCounts]
  );

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
    setContextWarnings([]);

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
      setSchemaIsSaved(false);
      setSavedProjectId(null);
      setSchemaSaveMessage(null);
      if (response.warnings && response.warnings.length > 0) {
        setWarnings(response.warnings);
      }
      setActiveCollectionIdx(0);
      setStep("review");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred while parsing the schema.");
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
    setSavedProjectId(null);

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
      setSchemaIsSaved(false);
      setWarnings(response.warnings);
      setActiveCollectionIdx(0);
      setMongoConnectionMessage(
        response.databaseName
          ? `Discovered schema from ${response.databaseName}.`
          : "Discovered schema from MongoDB."
      );
      setStep("review");
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

    const projectName = projectNameDraft.trim() || projectDescription.trim();
    if (!projectName) {
      setProjectMessage("Project name is required.");
      return;
    }

    setIsCreatingProject(true);
    setProjectMessage(null);
    setContextWarnings([]);

    try {
      const created = await createProject(
        {
          name: projectName,
          description: projectDescription.trim() || undefined
        },
        token
      );
      const activeProjectId = created.project.id;
      setProjectId(activeProjectId);
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
      setContextWarnings(
        contextResponse.project.context?.warnings.map((warning) => warning.message) ?? []
      );
      setProjectMessage("Project created. Add optional GitHub context next.");
      setStep("github");
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
    setContextWarnings([]);

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
      setContextWarnings(
        contextResponse.project.context?.warnings.map((warning) => warning.message) ?? []
      );
      setProjectMessage("Project context saved.");
      setStep("github");
    } catch (saveError) {
      setProjectMessage(
        saveError instanceof Error ? saveError.message : "Could not save project context."
      );
    } finally {
      setIsCreatingProject(false);
    }
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

  const handleGithubSkip = () => {
    setProjectMessage(null);
    setStep("schema-choose");
  };

  const handleGithubContinue = () => {
    setProjectMessage(null);
    setStep("schema-choose");
  };

  const handleChooseSchemaMethod = (method: SchemaInputMethod) => {
    setSchemaMethod(method);
    setError(null);
    setSchemaSaveMessage(null);
    if (method === "paste") {
      setStep("schema-paste");
      return;
    }
    if (method === "upload") {
      setStep("schema-upload");
      return;
    }
    setStep("schema-mongodb");
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
    setChatHistory([]);

    try {
      const result = await generateSeedData(projectId, { collectionCounts }, token);
      setGeneratedDataset(result.dataset);
      setGenerationMessage(result.message);
      setGenerationValidationResults([
        ...result.dataset.validationResults,
        ...result.dataset.warnings
      ]);
    } catch (generateError) {
      setGenerationMessage(
        generateError instanceof Error ? generateError.message : "Could not generate seed data."
      );
    } finally {
      setIsGeneratingSeedData(false);
    }
  };

  const handleRefineGeneratedDataset = async () => {
    if (!token || !projectId || !generatedDataset) {
      setGenerationMessage("Generate a valid dataset before using AI chat refinement.");
      return;
    }

    const trimmedMessage = chatMessage.trim();
    if (!trimmedMessage) {
      return;
    }

    setIsRefiningDataset(true);
    setGenerationMessage(null);

    try {
      const result = await refineGeneratedDataset(
        projectId,
        {
          currentDataset: generatedDataset,
          message: trimmedMessage,
          chatHistory
        },
        token
      );
      setChatHistory(result.chatHistory);
      setChatMessage("");
      setGenerationValidationResults([
        ...result.validationResults,
        ...result.warnings
      ]);

      if (result.dataset) {
        setGeneratedDataset(result.dataset);
      }

      setGenerationMessage(result.message);
    } catch (refineError) {
      setChatHistory((currentHistory) => [
        ...currentHistory,
        { role: "user", content: trimmedMessage },
        {
          role: "assistant",
          content:
            refineError instanceof Error
              ? refineError.message
              : "Could not refine the generated dataset."
        }
      ]);
      setGenerationMessage(
        refineError instanceof Error ? refineError.message : "Could not refine the generated dataset."
      );
    } finally {
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

  const currentCollection = parsedSchema?.collections[activeCollectionIdx] || null;

  const steps = useMemo(
    () => [
      { id: "project", title: "Basics", description: "Name + domain context" },
      { id: "github", title: "GitHub", description: "Optional repository" },
      { id: "schema", title: "Schema", description: "Choose input method" },
      { id: "review", title: "Review", description: "Edit + save snapshot" },
      { id: "generate", title: "Generate", description: "Counts + run" },
      { id: "refine", title: "Refine", description: "Optional AI chat" }
    ],
    []
  );

  const stepperActiveId = useMemo(() => getStepperActiveId(step), [step]);
  const meaningfulRepositoryWarnings = useMemo(
    () => getMeaningfulRepositoryWarnings(connectedRepository?.warnings ?? []),
    [connectedRepository]
  );

  const isBusy =
    isCreatingProject ||
    isGithubBusy ||
    isLoading ||
    isTestingMongo ||
    isDiscoveringMongo ||
    isSavingSchema ||
    isGeneratingSeedData ||
    isRefiningDataset;

  const canContinueFromReview = schemaIsSaved && Boolean(parsedSchema) && !isBusy;
  const canContinueFromGenerate = Boolean(generatedDataset) && !isBusy;
  const showTopContinue = step === "generate";

  function goBack() {
    setError(null);
    setProjectMessage(null);
    setSchemaSaveMessage(null);
    setGenerationMessage(null);

    setStep((current) => {
      if (current === "refine") return "generate";
      if (current === "generate") return "review";
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
  }

  function goNext() {
    setError(null);
    setProjectMessage(null);
    setSchemaSaveMessage(null);
    setGenerationMessage(null);

    setStep((current) => {
      if (current === "review" && canContinueFromReview) return "generate";
      if (current === "generate" && canContinueFromGenerate) return "refine";
      return current;
    });
  }

  return (
    <AppShell>
      <section className="min-h-screen bg-background text-foreground">
        <div className="border-b border-border bg-surface px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-xs text-accent">project.wizard</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">New project</h1>
              <p className="mt-2 text-sm text-muted">
                One step at a time. Optional steps can be skipped.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" disabled={step === "project"} onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {showTopContinue ? (
                <Button
                  type="button"
                  disabled={step === "generate" && !canContinueFromGenerate}
                  onClick={goNext}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-4">
            <Stepper steps={steps} activeStepId={stepperActiveId} />
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl p-6">
          {error ? (
            <Alert tone="danger" title="Action needed" className="mb-5">
              {error}
            </Alert>
          ) : null}

          {step === "project" ? (
            <Card className="bg-surface">
              <CardHeader>
                <p className="font-mono text-xs text-accent">step.project</p>
                <h2 className="mt-1 text-lg font-semibold">Project basics</h2>
                <p className="mt-2 text-sm text-muted">
                  Give your project a name and describe the domain so generated data feels realistic.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input
                      id="project-name"
                      value={projectNameDraft}
                      onChange={(event) => setProjectNameDraft(event.target.value)}
                      placeholder="e.g., E-commerce API"
                      disabled={Boolean(projectId)}
                    />
                    {!projectId && !projectNameDraft.trim() ? (
                      <p className="text-xs text-error">Project name is required.</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-context">Project context</Label>
                    <Textarea
                      id="project-context"
                      value={projectDescription}
                      onChange={(event) => setProjectDescription(event.target.value)}
                      placeholder="Describe users, products, orders, geography, tone, and relationships…"
                      className="min-h-28"
                    />
                    <p className="text-xs text-muted">
                      Recommended. More context helps AI generate domain-specific seed data.
                    </p>
                  </div>
                </div>

                {contextWarnings.length > 0 ? (
                  <Alert tone="warning" title="Context warnings">
                    <ul className="list-disc space-y-1 pl-4">
                      {contextWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </Alert>
                ) : null}

                {projectMessage ? (
                  <Alert tone={projectMessage.toLowerCase().includes("saved") || projectMessage.toLowerCase().includes("created") ? "success" : "info"}>
                    {projectMessage}
                  </Alert>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {!projectId ? (
                    <Button
                      type="button"
                      onClick={handleCreateProject}
                      disabled={isCreatingProject || !projectNameDraft.trim()}
                    >
                      {isCreatingProject ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4" />
                      )}
                      Create project & continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSaveExistingContext}
                        disabled={isCreatingProject}
                      >
                        {isCreatingProject ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Database className="h-4 w-4" />
                        )}
                        Save context
                      </Button>
                      <Button type="button" onClick={() => setStep("github")}>
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === "github" ? (
            <Card className="bg-surface">
              <CardHeader>
                <p className="font-mono text-xs text-accent">step.github</p>
                <h2 className="mt-1 text-lg font-semibold">GitHub context (optional)</h2>
                <p className="mt-2 text-sm text-muted">
                  Connect a repository so TestSeed can read schemas, models, and docs for better generation context.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {!connectedRepository ? (
                  <div className="space-y-2">
                    <Label htmlFor="project-repo">Repository</Label>
                    <Input
                      id="project-repo"
                      value={repositoryDraft}
                      onChange={(event) => setRepositoryDraft(event.target.value)}
                      placeholder="owner/repo or GitHub URL"
                    />
                  </div>
                ) : null}

                {connectedRepository ? (
                  <div className="space-y-4 rounded-lg border border-border bg-background p-4">
                    <Alert tone="success" title="Connected repository">
                      <a
                        href={connectedRepository.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-accent underline-offset-2 hover:underline"
                      >
                        {connectedRepository.repositoryFullName}
                      </a>
                    </Alert>
                    {connectedRepository.summary ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted">Repository context</p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {connectedRepository.summary}
                        </p>
                      </div>
                    ) : null}
                    {connectedRepository.contextCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {connectedRepository.contextCategories.map((category) => (
                          <span
                            key={category}
                            className="rounded border border-accent/20 bg-accent/5 px-2 py-0.5 font-mono text-[10px] text-accent"
                          >
                            {category.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {meaningfulRepositoryWarnings.length > 0 ? (
                      <Alert tone="warning" title="Repository warnings">
                        <ul className="list-disc space-y-1 pl-4">
                          {meaningfulRepositoryWarnings.map((warning) => (
                            <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>
                          ))}
                        </ul>
                      </Alert>
                    ) : null}
                  </div>
                ) : null}

                {projectMessage ? (
                  <Alert tone={connectedRepository ? "success" : "info"}>{projectMessage}</Alert>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
                  {!connectedRepository ? (
                    <>
                      <Button
                        type="button"
                        onClick={handleGithubConnect}
                        disabled={isGithubBusy || !repositoryDraft.trim() || !projectId}
                      >
                        {isGithubBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <GitBranch className="h-4 w-4" />
                        )}
                        Connect GitHub
                      </Button>
                      <Button type="button" variant="secondary" onClick={handleGithubSkip}>
                        Skip for now
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={handleGithubContinue} disabled={!projectId}>
                      Continue to schema
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === "schema-choose" ? (
            <Card className="bg-surface">
              <CardHeader>
                <p className="font-mono text-xs text-accent">step.schema.choose</p>
                <h2 className="mt-1 text-lg font-semibold">How do you want to add your schema?</h2>
                <p className="mt-2 text-sm text-muted">Pick one method. Each option opens its own step.</p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <SchemaMethodCard
                  icon={FileText}
                  title="Paste schema code"
                  description="Paste Mongoose model definitions directly."
                  onClick={() => handleChooseSchemaMethod("paste")}
                />
                <SchemaMethodCard
                  icon={Upload}
                  title="Upload schema files"
                  description="Upload one or more Mongoose model files."
                  onClick={() => handleChooseSchemaMethod("upload")}
                />
                <SchemaMethodCard
                  icon={Database}
                  title="MongoDB discovery"
                  description="Infer schema from a live database connection."
                  onClick={() => handleChooseSchemaMethod("mongodb")}
                />
              </CardContent>
            </Card>
          ) : null}

          {step === "schema-paste" ? (
            <Card className="bg-surface">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-accent">step.schema.paste</p>
                  <h2 className="mt-1 text-lg font-semibold">Paste Mongoose schema</h2>
                </div>
                <Button type="button" variant="secondary" onClick={handleDemoSchema}>
                  Load demo
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  className="min-h-[24rem] font-mono text-xs leading-relaxed"
                  spellCheck={false}
                  value={schemaText}
                  onChange={(event) => setSchemaText(event.target.value)}
                  placeholder={`// Paste Mongoose schema(s) here\n\nconst UserSchema = new Schema({\n  email: { type: String, required: true, unique: true }\n});`}
                />
                <Button
                  type="button"
                  onClick={handleReviewSchema}
                  disabled={isLoading || !schemaText.trim() || !projectId}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Analyze schema
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {step === "schema-upload" ? (
            <Card className="bg-surface">
              <CardHeader>
                <p className="font-mono text-xs text-accent">step.schema.upload</p>
                <h2 className="mt-1 text-lg font-semibold">Upload Mongoose schema files</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-accent" />
                  <p className="mt-3 text-sm font-medium">Add model files</p>
                  <p className="mt-1 text-xs text-muted">.js, .ts, .mjs, .cjs, or .txt</p>
                  <Button asChild className="mt-4" variant="secondary">
                    <label htmlFor="schema-files-upload" className="cursor-pointer">
                      Choose files
                    </label>
                  </Button>
                  <input
                    id="schema-files-upload"
                    type="file"
                    multiple
                    accept=".js,.jsx,.ts,.tsx,.mjs,.cjs,.txt"
                    className="sr-only"
                    onChange={handleSchemaFiles}
                  />
                </div>

                {schemaFiles.length > 0 ? (
                  <div className="grid gap-2">
                    {schemaFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex min-h-10 items-center gap-3 rounded border border-border bg-background px-3 text-xs"
                      >
                        <FileCode2 className="h-4 w-4 shrink-0 text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-foreground">{file.name}</p>
                          <p className="text-muted">{file.content.length.toLocaleString()} chars</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted hover:border-error hover:text-error"
                          onClick={() => removeSchemaFile(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert tone="info" title="Next action">
                    Upload at least one schema file to continue.
                  </Alert>
                )}

                <Button
                  type="button"
                  onClick={handleReviewSchema}
                  disabled={isLoading || schemaFiles.length === 0 || !projectId}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Analyze uploaded files
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {step === "schema-mongodb" ? (
            <Card className="bg-surface">
              <CardHeader>
                <p className="font-mono text-xs text-accent">step.schema.mongodb</p>
                <h2 className="mt-1 text-lg font-semibold">Discover schema from MongoDB</h2>
                <p className="mt-2 text-sm text-muted">
                  The connection string is used only for this operation and is not stored.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mongodb-connection">Connection string</Label>
                  <Input
                    id="mongodb-connection"
                    type="password"
                    value={mongoConnectionString}
                    onChange={(event) => setMongoConnectionString(event.target.value)}
                    placeholder="mongodb+srv://..."
                    autoComplete="off"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestMongoConnection}
                    disabled={isTestingMongo || !mongoConnectionString.trim()}
                  >
                    {isTestingMongo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Test connection
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDiscoverMongoSchema}
                    disabled={isDiscoveringMongo || !projectId || !mongoConnectionString.trim()}
                  >
                    {isDiscoveringMongo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Discover schema
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {mongoConnectionMessage ? (
                  <Alert tone={mongoConnectionMessage.toLowerCase().includes("successful") ? "success" : "info"}>
                    {mongoConnectionMessage}
                  </Alert>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {step === "review" ? (
            <Card className="bg-surface">
              <CardHeader>
                <p className="font-mono text-xs text-accent">step.review</p>
                <h2 className="mt-1 text-lg font-semibold">Review and save schema</h2>
              </CardHeader>
              <CardContent className="space-y-5">
                {warnings.length > 0 ? (
                  <Alert tone="warning" title="Schema warnings">
                    <ul className="list-disc space-y-1 pl-4">
                      {warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </Alert>
                ) : null}

                {!parsedSchema ? (
                  <Alert tone="info" title="Next action">
                    Go back and add a schema using paste, upload, or MongoDB discovery.
                  </Alert>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted font-mono">
                        Collections
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {parsedSchema.collections.map((coll, idx) => (
                          <button
                            key={coll.name}
                            type="button"
                            onClick={() => setActiveCollectionIdx(idx)}
                            className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-mono transition-colors ${
                              idx === activeCollectionIdx
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border bg-background text-muted hover:text-foreground"
                            }`}
                          >
                            <Database className="h-3 w-3" />
                            {coll.name}
                            <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                              {coll.fields.length}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {currentCollection ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-accent" />
                            <h3 className="text-sm font-semibold">
                              {currentCollection.name} fields
                            </h3>
                          </div>
                          {typeof currentCollection.sampleCount === "number" ? (
                            <span className="font-mono text-[10px] uppercase text-muted">
                              {currentCollection.sampleCount} samples
                            </span>
                          ) : null}
                        </div>

                        {currentCollection.warnings?.length ? (
                          <Alert tone="warning" title="Collection warnings">
                            <ul className="list-disc space-y-1 pl-4">
                              {currentCollection.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          </Alert>
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
                              {currentCollection.fields.length > 0 ? (
                                currentCollection.fields.map((field, fieldIndex) => (
                                  <tr key={field.name} className="align-top hover:bg-surface/50">
                                    <td className="p-3 font-bold text-foreground">{field.name}</td>
                                    <td className="p-3">
                                      <div className="space-y-2">
                                        <select
                                          aria-label={`${field.name} type`}
                                          className="h-8 w-full rounded border border-border bg-surface px-2 text-xs text-foreground focus:border-accent focus:outline-none"
                                          value={field.type}
                                          onChange={(event) =>
                                            updateReviewedField(activeCollectionIdx, fieldIndex, (currentField) => ({
                                              ...currentField,
                                              type: event.target.value,
                                              itemType:
                                                event.target.value === "Array"
                                                  ? currentField.itemType
                                                  : undefined,
                                              children:
                                                event.target.value === "Array" ||
                                                event.target.value === "Object"
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
                                              updateReviewedField(activeCollectionIdx, fieldIndex, (currentField) => ({
                                                ...currentField,
                                                required: event.target.checked
                                              }))
                                            }
                                          />
                                          required
                                        </label>
                                        {field.unique ? <ReviewBadge tone="info">unique</ReviewBadge> : null}
                                        {field.confidence ? (
                                          <ReviewBadge tone={field.confidence === "low" ? "warning" : "neutral"}>
                                            {field.confidence} confidence
                                          </ReviewBadge>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <FieldEvidence
                                        field={field}
                                        onFieldChange={(nextField) =>
                                          updateReviewedField(activeCollectionIdx, fieldIndex, () => nextField)
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
                    ) : null}

                    <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        {schemaSaveMessage ? (
                          <Alert tone="success">{schemaSaveMessage}</Alert>
                        ) : (
                          <p className="text-xs text-muted">
                            Save your schema snapshot, then continue to generation.
                          </p>
                        )}
                        {savedProjectId ? (
                          <Button asChild variant="secondary" className="h-8">
                            <a href={`/projects/${savedProjectId}`}>View project details</a>
                          </Button>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleSaveParsedSchema}
                          disabled={isSavingSchema || !projectId}
                        >
                          {isSavingSchema ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Database className="h-4 w-4" />
                          )}
                          Save schema
                        </Button>
                        <Button
                          type="button"
                          onClick={goNext}
                          disabled={!canContinueFromReview}
                        >
                          Next
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          {step === "generate" ? (
            <Card className="bg-surface">
              <CardHeader>
                <p className="font-mono text-xs text-accent">step.generate</p>
                <h2 className="mt-1 text-lg font-semibold">Generate records</h2>
              </CardHeader>
              <CardContent className="space-y-5">
                {!parsedSchema ? (
                  <Alert tone="info" title="Next action">
                    Go back and load a schema.
                  </Alert>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <p className="text-xs text-muted">
                          Total requested records:{" "}
                          <span className="font-mono text-accent">{totalRequestedRecords}</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleGenerateSeedData}
                        disabled={isGeneratingSeedData || !projectId || totalRequestedRecords <= 0}
                      >
                        {isGeneratingSeedData ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Generate records
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {parsedSchema.collections.map((collection) => (
                        <label key={collection.name} className="grid gap-1 text-xs font-mono text-muted">
                          {collection.name}
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={collectionCounts[collection.name] ?? 0}
                            onChange={(event) =>
                              setCollectionCounts((currentCounts) => ({
                                ...currentCounts,
                                [collection.name]: Math.max(0, Number(event.target.value) || 0)
                              }))
                            }
                            className="h-9 bg-background"
                          />
                        </label>
                      ))}
                    </div>

                    {generationMessage ? <Alert tone="info">{generationMessage}</Alert> : null}

                    {generationValidationResults.length > 0 ? (
                      <Alert tone="warning" title="Validation & warnings">
                        <div className="space-y-1">
                          {generationValidationResults.map((result, index) => (
                            <p key={`${result.code}-${index}`}>
                              <span className="font-semibold">{result.code}:</span> {result.message}
                            </p>
                          ))}
                        </div>
                      </Alert>
                    ) : null}

                    {isGeneratingSeedData ? (
                      <div className="space-y-3 rounded border border-border bg-background p-4">
                        <p className="text-xs text-muted">Preparing output…</p>
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-40 w-full" />
                      </div>
                    ) : null}

                    {generatedDataset ? (
                      <div className="space-y-3 rounded border border-border bg-background p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-mono text-xs text-accent">generated.dataset</p>
                            <p className="mt-1 text-sm font-semibold">Valid JSON grouped by collection</p>
                          </div>
                          <ReviewBadge tone={generatedDataset.status === "valid" ? "accent" : "danger"}>
                            {generatedDataset.status}
                          </ReviewBadge>
                        </div>
                        <pre className="max-h-80 overflow-auto rounded border border-border bg-surface p-3 text-xs leading-relaxed text-foreground">
                          {JSON.stringify(generatedDataset.collections, null, 2)}
                        </pre>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" onClick={() => setStep("refine")}>
                            Continue to refinement
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Button asChild type="button" variant="secondary">
                            <a href={`/projects/${projectId ?? ""}`}>Finish and view project</a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Alert tone="info" title="Next action">
                        Generate records to unlock refinement (optional) and project handoff.
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}

          {step === "refine" ? (
            <Card className="bg-surface">
              <CardHeader>
                <p className="font-mono text-xs text-accent">step.refine</p>
                <h2 className="mt-1 text-lg font-semibold">Refine with AI (optional)</h2>
              </CardHeader>
              <CardContent className="space-y-5">
                {!generatedDataset ? (
                  <Alert tone="info" title="Next action">
                    Go back and generate a dataset first.
                  </Alert>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild variant="secondary">
                        <a href={`/projects/${projectId ?? ""}`}>Skip refinement</a>
                      </Button>
                    </div>

                    {chatHistory.length > 0 ? (
                      <div className="max-h-64 space-y-2 overflow-auto rounded border border-border bg-background p-3 text-xs">
                        {chatHistory.map((message, index) => (
                          <div key={`${message.role}-${index}`} className="rounded border border-border bg-surface p-2">
                            <span className="font-mono text-accent">{message.role}</span>
                            <p className="mt-1 text-muted">{message.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert tone="info" title="Tip">
                        Ask for a specific change like “Make users Canadian” or “Use university.edu emails”.
                      </Alert>
                    )}

                    <Textarea
                      value={chatMessage}
                      onChange={(event) => setChatMessage(event.target.value)}
                      placeholder="Ask for a change…"
                      className="min-h-28 bg-background text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleRefineGeneratedDataset}
                        disabled={isRefiningDataset || !chatMessage.trim()}
                      >
                        {isRefiningDataset ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Send refinement
                      </Button>
                      <Button asChild variant="secondary">
                        <a href={`/projects/${projectId ?? ""}`}>Finish</a>
                      </Button>
                    </div>

                    {generationMessage ? <Alert tone="info">{generationMessage}</Alert> : null}

                    <div className="space-y-2 rounded border border-border bg-background p-3">
                      <p className="text-xs text-muted">Current dataset</p>
                      <pre className="max-h-64 overflow-auto rounded border border-border bg-surface p-3 text-xs leading-relaxed text-foreground">
                        {JSON.stringify(generatedDataset.collections, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

const WIZARD_STEPS: WizardStep[] = [
  "project",
  "github",
  "schema-choose",
  "schema-paste",
  "schema-upload",
  "schema-mongodb",
  "review",
  "generate",
  "refine"
];

function isWizardStep(value: string): value is WizardStep {
  return WIZARD_STEPS.includes(value as WizardStep);
}

function getStepperActiveId(step: WizardStep): string {
  if (
    step === "schema-choose" ||
    step === "schema-paste" ||
    step === "schema-upload" ||
    step === "schema-mongodb"
  ) {
    return "schema";
  }
  return step;
}

function SchemaMethodCard({
  icon: Icon,
  title,
  description,
  onClick
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col rounded-lg border border-border bg-background p-5 text-left transition-colors hover:border-accent hover:bg-accent/5"
    >
      <Icon className="h-6 w-6 text-accent" />
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
        Continue
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

const GENERIC_REPOSITORY_WARNING_MESSAGE = "Repository context summary included a note.";

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

function ReviewBadge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: ReviewBadgeTone;
}) {
  const toneClass = {
    neutral: "border-border bg-surface text-muted",
    accent: "border-accent/20 bg-accent/5 text-accent",
    danger: "border-red-500/20 bg-red-500/10 text-red-400",
    info: "border-indigo-500/20 bg-indigo-500/10 text-indigo-400",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-400"
  }[tone];

  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${toneClass}`}>
      {children}
    </span>
  );
}

function FieldEvidence({
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
          className="min-h-16 resize-y border-border bg-surface p-2 font-mono text-[10px] text-amber-400"
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
