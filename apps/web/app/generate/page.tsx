"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, AlertCircle, Database, Layers, FileCode2, X } from "lucide-react";
import { createProject, getProjectDetail, parseSchema } from "@/src/lib/api-client";
import { getStoredSession } from "@/src/lib/session";
import { ParsedSchema } from "@testseed/types";

interface SchemaFileDraft {
  name: string;
  content: string;
}

export default function GeneratePage() {
  const [projectDescription, setProjectDescription] = useState("");
  const [schemaText, setSchemaText] = useState("");
  const [schemaFiles, setSchemaFiles] = useState<SchemaFileDraft[]>([]);
  const [parsedSchema, setParsedSchema] = useState<ParsedSchema | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [requestedMode, setRequestedMode] = useState<string | null>(null);
  const [activeCollectionIdx, setActiveCollectionIdx] = useState<number>(0);

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
              setProjectDescription(detail.project.description ?? detail.project.name);
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

      let activeProjectId = projectId ?? getProjectIdFromLocation();
      if (!activeProjectId) {
        const project = await createProject(
          {
            name: projectDescription.trim() || "Untitled generation project",
            description: projectDescription.trim() || undefined
          },
          token
        );
        activeProjectId = project.project.id;
        setProjectId(activeProjectId);
        setProjectName(project.project.name);
      }

      const response = await parseSchema(
        {
          schemaText,
          schemaFiles,
          projectId: activeProjectId,
          source: "manual"
        },
        token
      );
      setParsedSchema(response.schema);
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
          <div className="flex-1 space-y-2">
            <Label htmlFor="project-description" className="text-xs uppercase tracking-wider text-muted font-mono">
              {projectId ? "Updating Project" : "Project Description"}
            </Label>
            <Input
              id="project-description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="e.g., E-commerce API with users, products, orders, and reviews"
              className="bg-background border-border text-sm font-medium focus:ring-accent"
              disabled={Boolean(projectId)}
            />
            {projectId ? (
              <p className="text-xs text-muted">
                New analysis will update schema snapshots for {projectName ?? "this project"}.
              </p>
            ) : null}
            {requestedMode === "generate" && parsedSchema ? (
              <p className="text-xs text-accent">
                Loaded the saved schema for {projectName ?? "this project"}.
              </p>
            ) : null}
          </div>
          <Button
            onClick={handleReviewSchema}
            disabled={isLoading || !hasSchemaInput}
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
                {projectId ? "Analyze and save" : "Analyze Schema"}
              </>
            )}
          </Button>
        </div>

        {/* Main Grid Workspace */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-6 p-6">
          {/* Schema Input Panel */}
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
                      </div>

                      <div className="overflow-x-auto rounded border border-border bg-background">
                        <table className="w-full text-left font-mono text-xs">
                          <thead>
                            <tr className="border-b border-border bg-surface text-muted">
                              <th className="p-3 font-semibold">Field</th>
                              <th className="p-3 font-semibold">Type</th>
                              <th className="p-3 font-semibold">Rules</th>
                              <th className="p-3 font-semibold">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {currentCollection.fields.map((field) => (
                              <tr key={field.name} className="hover:bg-surface/50">
                                <td className="p-3 font-bold text-foreground">{field.name}</td>
                                <td className="p-3">
                                  <span className="rounded bg-accent/5 border border-accent/20 px-1.5 py-0.5 text-accent text-[10px]">
                                    {field.type}
                                  </span>
                                </td>
                                <td className="p-3 space-x-1">
                                  {field.required && (
                                    <span className="rounded bg-red-500/10 border border-red-500/20 px-1 py-0.2 text-[9px] text-red-400 font-bold">
                                      REQ
                                    </span>
                                  )}
                                  {field.unique && (
                                    <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-1 py-0.2 text-[9px] text-indigo-400 font-bold">
                                      UNIq
                                    </span>
                                  )}
                                  {!field.required && !field.unique && (
                                    <span className="text-muted text-[10px]">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-[10px] text-muted">
                                  {field.ref && (
                                    <span className="text-accent">
                                      ref → <span className="underline">{field.ref}</span>
                                    </span>
                                  )}
                                  {field.enum && (
                                    <span>
                                      enum: {JSON.stringify(field.enum)}
                                    </span>
                                  )}
                                  {field.defaultValue && (
                                    <span>
                                      default: {field.defaultValue}
                                    </span>
                                  )}
                                  {!field.ref && !field.enum && !field.defaultValue && (
                                    <span className="text-muted/40">none</span>
                                  )}
                                </td>
                              </tr>
                            ))}
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
