"use client";

import { AppShell } from "@/components/layout/app-shell";
import {
  ProjectContextForm,
  ProjectContextSummary,
  RepositoryContextPanel
} from "@/components/project-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProject as deleteProjectRequest,
  deleteProjectSchema,
  getProjectDetail,
  listProjectHistory,
  removeRepositoryContext,
  restoreProject as restoreProjectRequest,
  restoreProjectSchema,
  startRepositoryContextAuthorization,
  updateProject,
  updateProjectContext,
  updateProjectSchema
} from "@/src/lib/api-client";
import {
  isAuthenticationError,
  redirectToLogin,
  requireStoredSession
} from "@/src/lib/auth-session";
import type {
  ParsedSchema,
  Project,
  ProjectEvent,
  ProjectHistoryResponse,
  ProjectSchemaSnapshot,
  SeedBatch
} from "@testseed/types";
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Check,
  Clock3,
  Database,
  FilePenLine,
  FileJson,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface ProjectDetailPageProps {
  params: {
    projectId: string;
  };
}

type ProjectDetailView = "overview" | "context" | "schema" | "history" | "management";

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [snapshot, setSnapshot] = useState<ProjectSchemaSnapshot | null>(null);
  const [history, setHistory] = useState<ProjectHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ProjectDetailView>("overview");
  const [isEditingSchema, setIsEditingSchema] = useState(false);
  const [schemaDraft, setSchemaDraft] = useState("");
  const [schemaSaveMessage, setSchemaSaveMessage] = useState<string | null>(null);
  const [isSavingSchema, setIsSavingSchema] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [projectDetailsMessage, setProjectDetailsMessage] = useState<string | null>(null);
  const [isSavingProjectDetails, setIsSavingProjectDetails] = useState(false);
  const [contextDraft, setContextDraft] = useState("");
  const [repositoryFullName, setRepositoryFullName] = useState("");
  const [contextSaveMessage, setContextSaveMessage] = useState<string | null>(null);
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [isAuthorizingRepository, setIsAuthorizingRepository] = useState(false);
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [isLifecycleBusy, setIsLifecycleBusy] = useState(false);
  const [activeCollectionIdx, setActiveCollectionIdx] = useState(0);

  useEffect(() => {
    const session = requireStoredSession(router);
    if (!session) {
      return;
    }

    let isMounted = true;
    const token = session.token;

    async function loadProject() {
      try {
        const [detailResponse, historyResponse] = await Promise.all([
          getProjectDetail(params.projectId, token),
          listProjectHistory(params.projectId, token)
        ]);

        if (!isMounted) {
          return;
        }

        if (!detailResponse.project) {
          setError("Project not found");
          return;
        }

        setProject(detailResponse.project);
        setProjectNameDraft(detailResponse.project.name);
        setSnapshot(detailResponse.activeSchemaSnapshot ?? null);
        setSchemaDraft(
          detailResponse.activeSchemaSnapshot
            ? JSON.stringify(detailResponse.activeSchemaSnapshot.schema, null, 2)
            : ""
        );
        setHistory(historyResponse);
        setContextDraft(
          detailResponse.project.context?.description ??
            detailResponse.project.description ??
            ""
        );
        setRepositoryFullName(detailResponse.project.context?.repository?.repositoryFullName ?? "");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (isAuthenticationError(loadError)) {
          redirectToLogin(router, "session_expired");
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Could not load project");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [params.projectId, router]);

  async function handleSaveSchema() {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    let parsedDraft: ParsedSchema;
    try {
      parsedDraft = JSON.parse(schemaDraft) as ParsedSchema;
    } catch {
      setSchemaSaveMessage("Schema JSON is invalid. Fix the JSON before saving.");
      return;
    }

    if (!isParsedSchemaDraft(parsedDraft)) {
      setSchemaSaveMessage("Schema must contain collections with named fields.");
      return;
    }

    setIsSavingSchema(true);
    setSchemaSaveMessage(null);

    try {
      const result = await updateProjectSchema(
        project.id,
        {
          schema: parsedDraft,
          source: snapshot?.source ?? "manual"
        },
        session.token
      );

      setProject(result.project);
      setSnapshot(result.snapshot);
      setSchemaDraft(JSON.stringify(result.snapshot.schema, null, 2));
      setIsEditingSchema(false);
      setSchemaSaveMessage(`Saved schema v${result.project.activeSchemaVersion}.`);
    } catch (saveError) {
      setSchemaSaveMessage(
        saveError instanceof Error ? saveError.message : "Could not save schema."
      );
    } finally {
      setIsSavingSchema(false);
    }
  }

  async function handleSaveProjectDetails() {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    const name = projectNameDraft.trim();
    if (!name) {
      setProjectDetailsMessage("Project name is required.");
      return;
    }

    setIsSavingProjectDetails(true);
    setProjectDetailsMessage(null);

    try {
      const result = await updateProject(
        project.id,
        {
          name,
          description: project.description
        },
        session.token
      );

      setProject(result.project);
      setProjectNameDraft(result.project.name);
      setProjectDetailsMessage("Project details saved.");
    } catch (saveError) {
      setProjectDetailsMessage(
        saveError instanceof Error ? saveError.message : "Could not save project details."
      );
    } finally {
      setIsSavingProjectDetails(false);
    }
  }

  async function handleSaveContext() {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    setIsSavingContext(true);
    setContextSaveMessage(null);

    try {
      const result = await updateProjectContext(
        project.id,
        { description: contextDraft },
        session.token
      );

      setProject(result.project);
      setContextDraft(result.project.context?.description ?? result.project.description ?? "");
      setContextSaveMessage("Project context saved.");
    } catch (saveError) {
      setContextSaveMessage(
        saveError instanceof Error ? saveError.message : "Could not save project context."
      );
    } finally {
      setIsSavingContext(false);
    }
  }

  async function handleAuthorizeRepositoryContext() {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    setIsAuthorizingRepository(true);
    setContextSaveMessage(null);

    try {
      const result = await startRepositoryContextAuthorization(
        project.id,
        { repositoryFullName },
        session.token
      );
      window.location.href = result.authorizationUrl;
    } catch (authorizationError) {
      setContextSaveMessage(
        authorizationError instanceof Error
          ? authorizationError.message
          : "Could not start repository authorization."
      );
      setIsAuthorizingRepository(false);
    }
  }

  async function handleRemoveRepositoryContext() {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    setIsLifecycleBusy(true);
    setContextSaveMessage(null);

    try {
      const result = await removeRepositoryContext(project.id, session.token);
      setProject({
        ...project,
        context: result.context,
        updatedAt: new Date()
      });
      setRepositoryFullName("");
      setContextSaveMessage("Repository context removed.");
    } catch (removeError) {
      setContextSaveMessage(
        removeError instanceof Error ? removeError.message : "Could not remove repository context."
      );
    } finally {
      setIsLifecycleBusy(false);
    }
  }

  async function handleDeleteSchema(mode: "archive" | "hard") {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    const confirmed = window.confirm(
      mode === "archive"
        ? "Archive the active schema snapshot? You can restore it later from this tab."
        : "Permanently delete the active schema snapshot? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    setIsLifecycleBusy(true);
    setLifecycleMessage(null);

    try {
      const result = await deleteProjectSchema(project.id, { mode }, session.token);
      setProject(result.project);
      setSnapshot(null);
      setSchemaDraft("");
      setIsEditingSchema(false);
      setLifecycleMessage(
        mode === "archive" ? "Active schema archived." : "Active schema hard deleted."
      );
    } catch (deleteError) {
      setLifecycleMessage(
        deleteError instanceof Error ? deleteError.message : "Could not delete schema."
      );
    } finally {
      setIsLifecycleBusy(false);
    }
  }

  async function handleDeleteProject(mode: "archive" | "hard") {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    const confirmed = window.confirm(
      mode === "archive"
        ? "Archive this project? You can keep its history for future reference."
        : "Hard delete this project and its saved schema/history? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    setIsLifecycleBusy(true);
    setLifecycleMessage(null);

    try {
      await deleteProjectRequest(project.id, { mode }, session.token);
      router.replace("/dashboard");
    } catch (deleteError) {
      setLifecycleMessage(
        deleteError instanceof Error ? deleteError.message : "Could not delete project."
      );
      setIsLifecycleBusy(false);
    }
  }

  async function handleRestoreProject() {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    setIsLifecycleBusy(true);
    setLifecycleMessage(null);

    try {
      const result = await restoreProjectRequest(project.id, session.token);
      setProject(result.project);
      setLifecycleMessage("Project restored.");
    } catch (restoreError) {
      setLifecycleMessage(
        restoreError instanceof Error ? restoreError.message : "Could not restore project."
      );
    } finally {
      setIsLifecycleBusy(false);
    }
  }

  async function handleRestoreSchema() {
    const session = requireStoredSession(router);
    if (!session || !project) {
      return;
    }

    setIsLifecycleBusy(true);
    setLifecycleMessage(null);

    try {
      const result = await restoreProjectSchema(project.id, session.token);
      setProject(result.project);
      setSnapshot(result.snapshot ?? null);
      setSchemaDraft(result.snapshot ? JSON.stringify(result.snapshot.schema, null, 2) : "");
      setLifecycleMessage(
        result.snapshot ? "Archived schema restored." : "No archived schema was found."
      );
    } catch (restoreError) {
      setLifecycleMessage(
        restoreError instanceof Error ? restoreError.message : "Could not restore schema."
      );
    } finally {
      setIsLifecycleBusy(false);
    }
  }

  const collectionCount = snapshot?.schema.collections.length ?? 0;
  const fieldCount = useMemo(
    () =>
      snapshot?.schema.collections.reduce(
        (count, collection) => count + collection.fields.length,
        0
      ) ?? 0,
    [snapshot]
  );
  const activeCollection = snapshot?.schema.collections[activeCollectionIdx] ?? null;

  useEffect(() => {
    setActiveCollectionIdx(0);
  }, [snapshot?.id]);

  return (
    <AppShell>
      <section className="space-y-5 p-6">
        <div className="border-b border-border pb-5">
          <Button asChild variant="secondary">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
              Back to projects
            </Link>
          </Button>

          {isLoading ? (
            <div className="mt-6 flex min-h-64 items-center justify-center border border-border bg-surface">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="mt-6 border border-error bg-surface px-4 py-3 text-sm text-error">
              {error}
            </div>
          ) : null}

          {!isLoading && project ? (
            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-xs text-accent">project.detail</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                  {project.archivedAt ? (
                    <span className="border border-border bg-background px-2 py-1 text-xs text-muted">
                      Archived {formatDate(project.archivedAt)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  {project.description || "No description saved for this project."}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Metric label="Schema v" value={String(project.activeSchemaVersion)} />
                <Metric label="Collections" value={String(collectionCount)} />
                <Metric label="Fields" value={String(fieldCount)} />
              </div>
            </div>
          ) : null}
        </div>

        {!isLoading && project ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <TabButton active={view === "overview"} onClick={() => setView("overview")}>
                Overview
              </TabButton>
              <TabButton active={view === "context"} onClick={() => setView("context")}>
                Context
              </TabButton>
              <TabButton active={view === "schema"} onClick={() => setView("schema")}>
                Schema
              </TabButton>
              <TabButton active={view === "history"} onClick={() => setView("history")}>
                History
              </TabButton>
              <TabButton active={view === "management"} onClick={() => setView("management")}>
                Project settings
              </TabButton>
            </div>

            {view === "overview" ? (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="Schema version"
                    value={
                      project.activeSchemaVersion > 0
                        ? `v${project.activeSchemaVersion}`
                        : "Not saved"
                    }
                  />
                  <Metric label="Collections" value={String(collectionCount)} />
                  <Metric label="Fields" value={String(fieldCount)} />
                </div>

                <Card>
                  <CardHeader>
                    <p className="font-mono text-xs text-accent">overview.actions</p>
                    <h2 className="mt-1 text-lg font-semibold">Continue this project</h2>
                    <p className="mt-2 text-sm text-muted">
                      {snapshot
                        ? "Generate seed data or review your saved schema before the next run."
                        : "Add and save a schema snapshot before generating seed data."}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row">
                    {snapshot ? (
                      <Button asChild className="h-10 flex-1">
                        <Link href={`/generate?projectId=${project.id}&mode=generate`}>
                          <Play className="h-4 w-4" />
                          Generate seed data
                        </Link>
                      </Button>
                    ) : (
                      <Button className="h-10 flex-1" disabled title="Save a schema snapshot first">
                        <Play className="h-4 w-4" />
                        Generate seed data
                      </Button>
                    )}
                    <Button asChild variant="secondary" className="h-10 flex-1">
                      <Link href={`/generate?projectId=${project.id}&mode=edit`}>
                        <FilePenLine className="h-4 w-4" />
                        {snapshot ? "Review / edit schema" : "Add schema"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid gap-5 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-accent">overview.context</p>
                        <h2 className="mt-1 text-lg font-semibold">Project context</h2>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 shrink-0 px-2 text-xs"
                        onClick={() => setView("context")}
                      >
                        Edit
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <ProjectContextSummary
                        context={project.context}
                        fallbackDescription={project.description}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-accent">overview.schema</p>
                        <h2 className="mt-1 text-lg font-semibold">Schema snapshot</h2>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 shrink-0 px-2 text-xs"
                        onClick={() => setView("schema")}
                      >
                        {snapshot ? "View" : "Add"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {snapshot ? (
                        <>
                          <p className="text-sm text-muted">
                            {collectionCount} collection{collectionCount === 1 ? "" : "s"} with{" "}
                            {fieldCount} fields · saved {formatDate(snapshot.createdAt)}
                          </p>
                          {snapshot.schema.collections.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {snapshot.schema.collections.slice(0, 6).map((collection) => (
                                <span
                                  key={collection.name}
                                  className="rounded-md bg-background/60 px-2 py-1 font-mono text-xs text-foreground"
                                >
                                  {collection.name}
                                </span>
                              ))}
                              {snapshot.schema.collections.length > 6 ? (
                                <span className="px-2 py-1 text-xs text-muted">
                                  +{snapshot.schema.collections.length - 6} more
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-muted">
                          No schema saved yet. Use the wizard to paste, upload, or discover your
                          schema.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {history?.events.length ? (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-accent">overview.activity</p>
                        <h2 className="mt-1 text-lg font-semibold">Recent activity</h2>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 shrink-0 px-2 text-xs"
                        onClick={() => setView("history")}
                      >
                        View all
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <EventRow event={history.events[history.events.length - 1]} />
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}

            {view === "context" ? (
              <Card>
                <CardHeader>
                  <p className="font-mono text-xs text-accent">project.context</p>
                  <h2 className="mt-1 text-lg font-semibold">Context</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProjectContextSummary
                    context={project.context}
                    fallbackDescription={project.description}
                  />
                  <ProjectContextForm
                    description={contextDraft}
                    isSaving={isSavingContext}
                    onDescriptionChange={setContextDraft}
                    onSubmit={handleSaveContext}
                  />
                  <RepositoryContextPanel
                    repositoryFullName={repositoryFullName}
                    isDisabled={isAuthorizingRepository || !repositoryFullName.trim()}
                    onRepositoryFullNameChange={setRepositoryFullName}
                    onAuthorize={handleAuthorizeRepositoryContext}
                  />
                  {project.context?.repository ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isLifecycleBusy}
                      onClick={handleRemoveRepositoryContext}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove repository context
                    </Button>
                  ) : null}
                  {contextSaveMessage ? (
                    <p className="border border-border bg-background px-3 py-2 text-xs text-muted">
                      {contextSaveMessage}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {view === "schema" ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-xs text-accent">schema.snapshot</p>
                      <h2 className="mt-1 text-lg font-semibold">Saved schema</h2>
                      {snapshot ? (
                        <p className="mt-2 text-xs text-muted">
                          v{project.activeSchemaVersion} · {collectionCount} collection
                          {collectionCount === 1 ? "" : "s"} · {fieldCount} fields · saved{" "}
                          {formatDate(snapshot.createdAt)}
                        </p>
                      ) : null}
                    </div>
                    {snapshot ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setIsEditingSchema((editing) => !editing);
                            setSchemaSaveMessage(null);
                          }}
                        >
                          <FilePenLine className="h-4 w-4" />
                          {isEditingSchema ? "Close editor" : "Edit JSON"}
                        </Button>
                        <Button asChild variant="secondary">
                          <Link href={`/generate?projectId=${project.id}&mode=edit`}>
                            <FilePenLine className="h-4 w-4" />
                            Edit with parser
                          </Link>
                        </Button>
                        <Button asChild>
                          <Link href={`/generate?projectId=${project.id}&mode=generate`}>
                            <Play className="h-4 w-4" />
                            Generate
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isLifecycleBusy}
                        onClick={handleRestoreSchema}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore archived schema
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {snapshot ? (
                    <div className="space-y-4">
                      {schemaSaveMessage ? (
                        <div
                          className={`flex items-start gap-2 border px-3 py-2 text-xs ${
                            schemaSaveMessage.startsWith("Saved")
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-error bg-error/10 text-error"
                          }`}
                        >
                          {schemaSaveMessage.startsWith("Saved") ? (
                            <Check className="mt-0.5 h-3.5 w-3.5" />
                          ) : (
                            <FileJson className="mt-0.5 h-3.5 w-3.5" />
                          )}
                          <span>{schemaSaveMessage}</span>
                        </div>
                      ) : null}

                      {lifecycleMessage ? (
                        <p className="border border-border bg-background px-3 py-2 text-xs text-muted">
                          {lifecycleMessage}
                        </p>
                      ) : null}

                      {isEditingSchema ? (
                        <div className="space-y-3">
                          <Textarea
                            value={schemaDraft}
                            onChange={(event) => setSchemaDraft(event.target.value)}
                            spellCheck={false}
                            className="min-h-80 font-mono text-xs leading-relaxed"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={handleSaveSchema} disabled={isSavingSchema}>
                              {isSavingSchema ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Save schema
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setSchemaDraft(JSON.stringify(snapshot.schema, null, 2));
                                setIsEditingSchema(false);
                                setSchemaSaveMessage(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isLifecycleBusy}
                              onClick={() => handleDeleteSchema("archive")}
                            >
                              <Archive className="h-4 w-4" />
                              Archive snapshot
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
                          <div className="rounded-lg border border-border bg-background p-2">
                            <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                              Collections
                            </p>
                            <div className="space-y-1">
                              {snapshot.schema.collections.map((collection, index) => (
                                <button
                                  key={collection.name}
                                  type="button"
                                  onClick={() => setActiveCollectionIdx(index)}
                                  className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs transition-colors ${
                                    index === activeCollectionIdx
                                      ? "bg-accent/10 text-accent"
                                      : "text-muted hover:bg-surface hover:text-foreground"
                                  }`}
                                >
                                  <Database className="h-3.5 w-3.5 shrink-0" />
                                  <span className="min-w-0 flex-1 truncate font-mono">{collection.name}</span>
                                  <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px]">
                                    {collection.fields.length}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="min-w-0 rounded-lg border border-border bg-background">
                            {activeCollection ? (
                              <>
                                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <Database className="h-4 w-4 shrink-0 text-accent" />
                                    <h3 className="truncate text-sm font-semibold">{activeCollection.name}</h3>
                                    <span className="font-mono text-xs text-muted">
                                      {activeCollection.fields.length} fields
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                                    <Button asChild variant="secondary" className="h-8 px-3 text-xs">
                                      <Link href={`/generate?projectId=${project.id}&mode=edit`}>
                                        <FilePenLine className="h-3.5 w-3.5" />
                                        Edit schema
                                      </Link>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className="h-8 px-3 text-xs"
                                      disabled={isLifecycleBusy}
                                      onClick={() => handleDeleteSchema("archive")}
                                    >
                                      <Archive className="h-3.5 w-3.5" />
                                      Archive snapshot
                                    </Button>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="border-b border-border text-muted">
                                      <tr>
                                        <th className="p-3 font-medium">Field</th>
                                        <th className="p-3 font-medium">Type</th>
                                        <th className="p-3 font-medium">Rules</th>
                                        <th className="p-3 font-medium">Details</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {activeCollection.fields.length > 0 ? (
                                        activeCollection.fields.map((field) => (
                                          <tr key={field.name}>
                                            <td className="p-3 font-mono text-foreground">{field.name}</td>
                                            <td className="p-3 text-accent">{field.type}</td>
                                            <td className="p-3 text-muted">
                                              {[
                                                field.required ? "required" : null,
                                                field.unique ? "unique" : null
                                              ]
                                                .filter(Boolean)
                                                .join(", ") || "optional"}
                                            </td>
                                            <td className="p-3 text-muted">{formatFieldDetails(field)}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td className="p-4 text-muted" colSpan={4}>
                                            No fields in this collection.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            ) : (
                              <div className="p-6 text-sm text-muted">Select a collection to view its fields.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {!isEditingSchema ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                          <p className="text-xs text-muted">
                            Permanently remove this schema snapshot from the project.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-error"
                            disabled={isLifecycleBusy}
                            onClick={() => handleDeleteSchema("hard")}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete schema permanently
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {lifecycleMessage ? (
                        <p className="border border-border bg-background px-3 py-2 text-xs text-muted">
                          {lifecycleMessage}
                        </p>
                      ) : null}
                      <div className="border border-border bg-background p-4">
                        <p className="text-sm font-medium">No saved schema yet</p>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          Add and save a schema snapshot from the project wizard, or restore a previously archived one.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild variant="secondary">
                            <Link href={`/generate?projectId=${project.id}&mode=edit`}>
                              <FilePenLine className="h-4 w-4" />
                              Go to schema wizard
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isLifecycleBusy}
                            onClick={handleRestoreSchema}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore archived schema
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {view === "history" ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <Card>
                  <CardHeader>
                    <p className="font-mono text-xs text-accent">project.history</p>
                    <h2 className="mt-1 text-lg font-semibold">Activity</h2>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {history?.events.length ? (
                      history.events.map((event) => <EventRow key={event.id} event={event} />)
                    ) : (
                      <div className="border border-border bg-background p-4">
                        <p className="text-sm font-medium">No history events yet</p>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          Activity appears after saving context, schema snapshots, and generation runs.
                        </p>
                        <Button asChild className="mt-3" variant="secondary">
                          <Link href={`/generate?projectId=${project.id}&mode=edit`}>
                            <Play className="h-4 w-4" />
                            Start a generation run
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <p className="font-mono text-xs text-accent">seed.batches</p>
                    <h2 className="mt-1 text-lg font-semibold">Seed batches</h2>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {history?.seedBatches.length ? (
                      history.seedBatches.map((batch) => <SeedBatchRow key={batch.id} batch={batch} />)
                    ) : (
                      <div className="border border-border bg-background p-4">
                        <p className="text-sm font-medium">No seed batches recorded yet</p>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          Generate records to create a seed batch history entry.
                        </p>
                        <Button asChild className="mt-3" variant="secondary">
                          <Link href={`/generate?projectId=${project.id}&mode=generate`}>
                            <Play className="h-4 w-4" />
                            Generate now
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {view === "management" ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <Card>
                  <CardHeader>
                    <p className="font-mono text-xs text-accent">project.settings</p>
                    <h2 className="mt-1 text-lg font-semibold">Project settings</h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="project-name" className="text-xs text-muted">
                        Project name
                      </label>
                      <Input
                        id="project-name"
                        value={projectNameDraft}
                        onChange={(event) => setProjectNameDraft(event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      disabled={isSavingProjectDetails || !projectNameDraft.trim()}
                      onClick={handleSaveProjectDetails}
                    >
                      {isSavingProjectDetails ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save details
                    </Button>
                    {projectDetailsMessage ? (
                      <p className="border border-border bg-background px-3 py-2 text-xs text-muted">
                        {projectDetailsMessage}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="space-y-5">
                  <Card>
                    <CardHeader>
                      <p className="font-mono text-xs text-accent">project.lifecycle</p>
                      <h2 className="mt-1 text-lg font-semibold">Project lifecycle</h2>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {project.archivedAt ? (
                        <Button
                          type="button"
                          className="w-full justify-start"
                          variant="secondary"
                          disabled={isLifecycleBusy}
                          onClick={handleRestoreProject}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore project
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="w-full justify-start"
                          variant="secondary"
                          disabled={isLifecycleBusy}
                          onClick={() => handleDeleteProject("archive")}
                        >
                          <Archive className="h-4 w-4" />
                          Archive project
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <p className="font-mono text-xs text-error">danger.zone</p>
                      <h2 className="mt-1 text-lg font-semibold">Danger zone</h2>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {lifecycleMessage ? (
                        <p className="border border-border bg-background px-3 py-2 text-xs text-muted">
                          {lifecycleMessage}
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        className="w-full justify-start"
                        variant="secondary"
                        disabled={isLifecycleBusy}
                        onClick={() => handleDeleteProject("hard")}
                      >
                        <Trash2 className="h-4 w-4" />
                        Hard delete project
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function TabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-muted hover:bg-background/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function isParsedSchemaDraft(value: unknown): value is ParsedSchema {
  if (typeof value !== "object" || value === null || !("collections" in value)) {
    return false;
  }

  const collections = (value as { collections?: unknown }).collections;
  if (!Array.isArray(collections)) {
    return false;
  }

  return collections.every((collection) => {
    if (typeof collection !== "object" || collection === null) {
      return false;
    }

    const candidate = collection as { name?: unknown; fields?: unknown };
    return (
      typeof candidate.name === "string" &&
      candidate.name.trim().length > 0 &&
      Array.isArray(candidate.fields) &&
      candidate.fields.every(
        (field) =>
          typeof field === "object" &&
          field !== null &&
          typeof (field as { name?: unknown }).name === "string"
      )
    );
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/50 px-4 py-3">
      <p className="font-mono text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function EventRow({ event }: { event: ProjectEvent }) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-background/50 p-3">
      <Clock3 className="mt-0.5 h-4 w-4 text-accent" />
      <div>
        <p className="text-sm text-foreground">{event.message}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          {event.kind} - {formatDate(event.createdAt)}
        </p>
      </div>
    </div>
  );
}

function SeedBatchRow({ batch }: { batch: SeedBatch }) {
  return (
    <div className="border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-foreground">{batch.seedBatchId}</p>
        <span className="text-xs text-accent">{batch.status}</span>
      </div>
      <p className="mt-2 text-xs text-muted">
        {Object.entries(batch.collectionCounts)
          .map(([collection, count]) => `${collection}: ${count}`)
          .join(", ")}
      </p>
    </div>
  );
}

function formatFieldDetails(field: {
  enum?: string[];
  ref?: string;
  defaultValue?: string;
}): string {
  const details = [
    field.ref ? `ref ${field.ref}` : null,
    field.enum ? `enum ${field.enum.join(", ")}` : null,
    field.defaultValue ? `default ${field.defaultValue}` : null
  ].filter(Boolean);

  return details.join("; ") || "none";
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
