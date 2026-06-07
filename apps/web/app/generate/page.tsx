"use client";

import { ChangeEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, AlertCircle, Database, Layers, FileCode2, X } from "lucide-react";
import {
  createProject,
  discoverMongoSchema,
  getProjectDetail,
  parseSchema,
  startRepositoryContextAuthorization,
  testMongoConnection,
  updateProjectContext,
  updateProjectSchema
} from "@/src/lib/api-client";
import { getStoredSession } from "@/src/lib/session";
import type { ParsedSchema, SchemaField } from "@testseed/types";

interface SchemaFileDraft {
  name: string;
  content: string;
}

export default function GeneratePage() {
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

  // Retrieve auth token on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = getStoredSession();
      const storedToken = session?.token ?? null;
      const existingProjectId = getProjectIdFromLocation();
      setToken(storedToken);
      setRequestedMode(new URLSearchParams(window.location.search).get("mode"));

      if (existingProjectId) {
        setProjectId(existingProjectId);
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
              setRepositoryDraft(detail.project.context?.repository?.repositoryFullName ?? "");
              setContextWarnings(
                detail.project.context?.warnings.map((warning) => warning.message) ?? []
              );
              setParsedSchema(detail.activeSchemaSnapshot?.schema ?? null);
              setActiveCollectionIdx(0);
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
  }, []);

  const hasSchemaInput = useMemo(
    () => Boolean(schemaText.trim()) || schemaFiles.some((file) => file.content.trim()),
    [schemaFiles, schemaText]
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
      setSavedProjectId(null);
      setSchemaSaveMessage(null);
      if (response.warnings && response.warnings.length > 0) {
        setWarnings(response.warnings);
      }
      setActiveCollectionIdx(0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while parsing the schema.");
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
      setWarnings(response.warnings);
      setActiveCollectionIdx(0);
      setMongoConnectionMessage(
        response.databaseName
          ? `Discovered schema from ${response.databaseName}.`
          : "Discovered schema from MongoDB."
      );
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
      setProjectMessage("Project created and context saved.");

      if (repositoryDraft.trim()) {
        const auth = await startRepositoryContextAuthorization(
          activeProjectId,
          { repositoryFullName: repositoryDraft },
          token
        );
        window.location.href = auth.authorizationUrl;
      }
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
    } catch (saveError) {
      setProjectMessage(
        saveError instanceof Error ? saveError.message : "Could not save project context."
      );
    } finally {
      setIsCreatingProject(false);
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
      setSchemaSaveMessage(`Saved schema v${result.project.activeSchemaVersion}.`);
    } catch (saveError) {
      setSchemaSaveMessage(
        saveError instanceof Error ? saveError.message : "Could not save schema."
      );
    } finally {
      setIsSavingSchema(false);
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

  const currentCollection = parsedSchema?.collections[activeCollectionIdx] || null;

  return (
    <AppShell>
      <section className="flex min-h-screen flex-col bg-background text-foreground font-sans">
        {/* Top Context Bar */}
        <div className="flex flex-col gap-4 border-b border-border bg-surface p-6 md:flex-row md:items-end">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-xs uppercase tracking-wider text-muted font-mono">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={projectNameDraft}
                onChange={(e) => setProjectNameDraft(e.target.value)}
                placeholder="e.g., E-commerce API"
                className="bg-background border-border text-sm font-medium focus:ring-accent"
                disabled={Boolean(projectId)}
              />
            </div>
            <div className="space-y-2">
            <Label htmlFor="project-description" className="text-xs uppercase tracking-wider text-muted font-mono">
              Project Context
            </Label>
            <Input
              id="project-description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="e.g., E-commerce API with users, products, orders, and reviews"
              className="bg-background border-border text-sm font-medium focus:ring-accent"
            />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repository-url" className="text-xs uppercase tracking-wider text-muted font-mono">
                GitHub Repository
              </Label>
              <Input
                id="repository-url"
                value={repositoryDraft}
                onChange={(e) => setRepositoryDraft(e.target.value)}
                placeholder="owner/repo or GitHub URL"
              className="bg-background border-border text-sm font-medium focus:ring-accent"
              disabled={Boolean(projectId)}
              />
            </div>
            <div className="md:col-span-3">
            {projectId ? (
              <p className="text-xs text-muted">
                New analysis will update schema snapshots for {projectName ?? "this project"}.
              </p>
            ) : null}
            {contextWarnings.length > 0 ? (
              <div className="mt-2 space-y-1">
                {contextWarnings.map((warning) => (
                  <p key={warning} className="text-xs text-amber-400">
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
            {requestedMode === "generate" && parsedSchema ? (
              <p className="text-xs text-accent">
                Loaded the saved schema for {projectName ?? "this project"}.
              </p>
            ) : null}
            {projectMessage ? (
              <p className="mt-2 text-xs text-muted">{projectMessage}</p>
            ) : null}
            </div>
          </div>
          {!projectId ? (
            <Button
              onClick={handleCreateProject}
              disabled={isCreatingProject || !(projectNameDraft.trim() || projectDescription.trim())}
              variant="secondary"
            >
              {isCreatingProject ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Create project
            </Button>
          ) : (
            <Button
              onClick={handleSaveExistingContext}
              disabled={isCreatingProject}
              variant="secondary"
            >
              {isCreatingProject ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Save context
            </Button>
          )}
          <Button
            onClick={handleReviewSchema}
            disabled={isLoading || !hasSchemaInput || !projectId}
            className="bg-accent text-background hover:bg-accent/90 font-semibold px-6 shadow-focus transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze schema
              </>
            )}
          </Button>
        </div>

        {/* Main Grid Workspace */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-6 p-6">
          {/* Schema Input Panel */}
          <div className="flex flex-col gap-6">
          <Card className="flex flex-col bg-surface border-border overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <p className="font-mono text-xs text-accent">mongodb.discovery</p>
                <h1 className="mt-1 text-lg font-bold tracking-tight">MongoDB Schema Discovery</h1>
              </div>
              <Database className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="mongodb-connection" className="font-mono text-xs uppercase tracking-wider text-muted">
                  Connection string
                </Label>
                <Input
                  id="mongodb-connection"
                  type="password"
                  value={mongoConnectionString}
                  onChange={(event) => setMongoConnectionString(event.target.value)}
                  placeholder="mongodb+srv://..."
                  autoComplete="off"
                  className="bg-background border-border font-mono text-xs"
                />
                <p className="text-xs leading-5 text-muted">
                  Used only for this test or discovery operation. TestSeed does not save it.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestMongoConnection}
                  disabled={isTestingMongo || !mongoConnectionString.trim()}
                >
                  {isTestingMongo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
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
                </Button>
              </div>
              {mongoConnectionMessage ? (
                <p className="text-xs text-muted">{mongoConnectionMessage}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="flex flex-col bg-surface border-border overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <p className="font-mono text-xs text-accent">schema.input</p>
                <h1 className="mt-1 text-lg font-bold tracking-tight">Mongoose Schema Definitions</h1>
              </div>
              <Button
                variant="ghost"
                onClick={handleDemoSchema}
                className="text-xs font-mono border border-border text-muted hover:text-accent hover:border-accent/40"
              >
                Load Demo
              </Button>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-6">
              <div className="mb-4 grid gap-3 border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <Label htmlFor="schema-files" className="font-mono text-xs uppercase tracking-wider text-muted">
                    Schema files
                  </Label>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Add one or more model files; TestSeed parses them together as one project schema.
                  </p>
                </div>
                <Button asChild variant="secondary">
                  <label htmlFor="schema-files" className="cursor-pointer">
                    <FileCode2 className="h-4 w-4" />
                    Add files
                  </label>
                </Button>
                <input
                  id="schema-files"
                  type="file"
                  multiple
                  accept=".js,.jsx,.ts,.tsx,.mjs,.cjs,.txt"
                  className="sr-only"
                  onChange={handleSchemaFiles}
                />
              </div>

              {schemaFiles.length > 0 ? (
                <div className="mb-4 grid gap-2">
                  {schemaFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex min-h-10 items-center gap-3 border border-border bg-background px-3 text-xs"
                    >
                      <FileCode2 className="h-4 w-4 shrink-0 text-accent" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-foreground">{file.name}</p>
                        <p className="text-muted">{file.content.length.toLocaleString()} chars</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted transition-colors hover:border-error hover:text-error"
                        onClick={() => removeSchemaFile(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <Textarea
                className="min-h-[30rem] flex-1 font-mono text-xs leading-relaxed p-4 bg-background border-border text-foreground/90 resize-none focus-visible:ring-accent focus:ring-accent focus:border-accent"
                spellCheck={false}
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                placeholder={`// Paste your Mongoose schemas here...\n\nconst UserSchema = new Schema({\n  email: { type: String, required: true, unique: true },\n  role: { type: String, enum: ["admin", "member"] }\n});`}
              />
            </CardContent>
          </Card>
          </div>

          {/* Parsed Schema Review Panel */}
          <Card className="flex flex-col bg-surface border-border overflow-hidden">
            <CardHeader className="border-b border-border pb-4">
              <p className="font-mono text-xs text-accent">preview.output</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight">Structured Schema Review</h2>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col pt-6 justify-start">
              {/* Warnings and Errors Box */}
              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-md bg-error/10 border border-error/20 p-4 text-sm text-error">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Parsing Error</span>
                    <p className="mt-1 text-xs leading-relaxed text-error/80">{error}</p>
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="mb-4 rounded-md bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-500 space-y-1">
                  <span className="font-semibold block font-mono">Warnings:</span>
                  <ul className="list-disc pl-4 space-y-1">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parsedSchema ? (
                <div className="flex flex-1 flex-col space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleSaveParsedSchema}
                      disabled={isSavingSchema || !projectId}
                    >
                      {isSavingSchema ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Database className="mr-2 h-4 w-4" />
                      )}
                      Save schema
                    </Button>
                    {savedProjectId ? (
                      <Button asChild variant="secondary">
                        <a href={`/projects/${savedProjectId}`}>View project details</a>
                      </Button>
                    ) : null}
                    {schemaSaveMessage ? (
                      <p className="text-xs text-muted">{schemaSaveMessage}</p>
                    ) : null}
                  </div>
                  {/* Collections List (Tabs) */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted font-mono">Discovered Collections</Label>
                    <div className="flex flex-wrap gap-2">
                      {parsedSchema.collections.map((coll, idx) => (
                        <button
                          key={coll.name}
                          onClick={() => setActiveCollectionIdx(idx)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-all duration-150 ${
                            idx === activeCollectionIdx
                              ? "bg-accent/10 border-accent text-accent font-semibold"
                              : "bg-background border-border text-muted hover:text-foreground hover:border-muted/50"
                          }`}
                        >
                          <Database className="h-3 w-3" />
                          {coll.name}
                          <span className="bg-background px-1.5 py-0.5 rounded text-[10px] border border-border text-muted">
                            {coll.fields.length}
                          </span>
                          {coll.warnings && coll.warnings.length > 0 ? (
                            <span className="bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/20 text-amber-400">
                              !
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Collection Fields Table */}
                  {currentCollection && (
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-accent" />
                          <h3 className="text-sm font-bold font-mono">{currentCollection.name} Collection</h3>
                        </div>
                        {typeof currentCollection.sampleCount === "number" ? (
                          <span className="font-mono text-[10px] uppercase text-muted">
                            {currentCollection.sampleCount} samples
                          </span>
                        ) : null}
                      </div>

                      {currentCollection.warnings && currentCollection.warnings.length > 0 ? (
                        <div className="space-y-1 border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">
                          {currentCollection.warnings.map((warning) => (
                            <p key={warning}>{warning}</p>
                          ))}
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
                            {currentCollection.fields.length > 0 ? (
                              currentCollection.fields.map((field) => (
                                <tr key={field.name} className="align-top hover:bg-surface/50">
                                  <td className="p-3 font-bold text-foreground">{field.name}</td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                      <ReviewBadge tone="accent">{field.type}</ReviewBadge>
                                      {field.itemType ? <ReviewBadge>items: {field.itemType}</ReviewBadge> : null}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                      {field.required ? <ReviewBadge tone="danger">required</ReviewBadge> : <ReviewBadge>optional</ReviewBadge>}
                                      {field.unique ? <ReviewBadge tone="info">unique</ReviewBadge> : null}
                                      {field.confidence ? (
                                        <ReviewBadge tone={field.confidence === "low" ? "warning" : "neutral"}>
                                          {field.confidence} confidence
                                        </ReviewBadge>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <FieldEvidence field={field} />
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
                  )}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                  <div className="mx-auto h-2 w-2 animate-pulse bg-accent rounded-full" />
                  <p className="mt-4 text-sm font-semibold text-foreground">No schema reviewed yet.</p>
                  <p className="mt-2 text-xs leading-5 text-muted max-w-[280px]">
                    Paste your Mongoose schema code on the left and click <b>Analyze Schema</b> to extract fields, types, and model structures.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}

function getProjectIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("projectId");
}

type ReviewBadgeTone = "neutral" | "accent" | "danger" | "info" | "warning";

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

function FieldEvidence({ field }: { field: SchemaField }) {
  const hasEvidence = Boolean(
    field.ref ||
      field.enum?.length ||
      field.defaultValue ||
      field.children?.length ||
      field.warnings?.length
  );

  if (!hasEvidence) {
    return <span className="text-[10px] text-muted/50">No extra review evidence.</span>;
  }

  return (
    <div className="space-y-2 text-[10px] text-muted">
      {field.ref ? (
        <div>
          <span className="font-bold text-accent">Reference:</span>{" "}
          <span className="text-foreground">{field.ref}</span>
          {field.refConfidence ? <span> ({field.refConfidence})</span> : null}
        </div>
      ) : null}
      {field.enum && field.enum.length > 0 ? (
        <div className="space-y-1">
          <div>
            <span className="font-bold text-accent">Enum-like values:</span>{" "}
            {field.enumSource ? <span>{field.enumSource}</span> : null}
          </div>
          <div className="flex flex-wrap gap-1">
            {field.enum.map((value) => (
              <ReviewBadge key={value}>{value}</ReviewBadge>
            ))}
          </div>
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
      {field.warnings && field.warnings.length > 0 ? (
        <div className="space-y-1 text-amber-400">
          {field.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
