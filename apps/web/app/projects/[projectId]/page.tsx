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
import { clearStoredSession, getStoredSession } from "@/src/lib/session";
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
  Archive,
  Bot,
  Check,
  Clock3,
  Database,
  FilePenLine,
  FileJson,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Trash2,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface ProjectDetailPageProps {
  params: {
    projectId: string;
  };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [snapshot, setSnapshot] = useState<ProjectSchemaSnapshot | null>(null);
  const [history, setHistory] = useState<ProjectHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.replace("/login");
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

        if (loadError instanceof Error && loadError.message.includes("Authentication")) {
          clearStoredSession();
          router.replace("/login");
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
      return;
    }

    if (
      mode === "hard" &&
      !window.confirm("Hard delete the active schema snapshot? This cannot be undone.")
    ) {
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
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
    const session = getStoredSession();
    if (!session || !project) {
      clearStoredSession();
      router.replace("/login");
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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <p className="font-mono text-xs text-accent">project.details</p>
                  <h2 className="mt-1 text-lg font-semibold">Details</h2>
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

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-accent">schema.snapshot</p>
                      <h2 className="mt-1 text-lg font-semibold">Saved schema</h2>
                    </div>
                    <FileJson className="h-5 w-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  {snapshot ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 text-xs text-muted">
                        <span className="border border-border bg-background px-2 py-1">
                          Snapshot {snapshot.id}
                        </span>
                        <span className="border border-border bg-background px-2 py-1">
                          Source {snapshot.source}
                        </span>
                        <span className="border border-border bg-background px-2 py-1">
                          Saved {formatDate(snapshot.createdAt)}
                        </span>
                      </div>

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
                            Generate from schema
                          </Link>
                        </Button>
                      </div>

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

                      {isEditingSchema ? (
                        <div className="space-y-3">
                          <Textarea
                            value={schemaDraft}
                            onChange={(event) => setSchemaDraft(event.target.value)}
                            spellCheck={false}
                            className="min-h-80 font-mono text-xs leading-relaxed"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={handleSaveSchema}
                              disabled={isSavingSchema}
                            >
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
                          </div>
                        </div>
                      ) : null}

                      {snapshot.schema.collections.map((collection) => (
                        <div key={collection.name} className="border border-border bg-background">
                          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                            <Database className="h-4 w-4 text-accent" />
                            <h3 className="text-sm font-semibold">{collection.name}</h3>
                            <span className="ml-auto font-mono text-xs text-muted">
                              {collection.fields.length} fields
                            </span>
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
                                {collection.fields.map((field) => (
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
                                    <td className="p-3 text-muted">
                                      {formatFieldDetails(field)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-border bg-background p-4">
                      <p className="text-sm font-medium">No saved schema yet</p>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Analyze a schema from the generation page to attach a snapshot to this
                        project.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <p className="font-mono text-xs text-accent">project.history</p>
                  <h2 className="mt-1 text-lg font-semibold">Activity</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {history?.events.length ? (
                    history.events.map((event) => <EventRow key={event.id} event={event} />)
                  ) : (
                    <p className="text-sm text-muted">No history events saved yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <p className="font-mono text-xs text-accent">primary.work</p>
                  <h2 className="mt-1 text-lg font-semibold">Primary work</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start" variant="secondary">
                    <Link href={`/generate?projectId=${project.id}&mode=edit`}>
                      <FilePenLine className="h-4 w-4" />
                      Edit with parser
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="secondary">
                    <Link href={`/generate?projectId=${project.id}&mode=generate`}>
                      <Play className="h-4 w-4" />
                      Generate from this schema
                    </Link>
                  </Button>
                  <ActionButton icon={Bot} label="Chat with project agent" />
                  <ActionButton icon={RotateCcw} label="Rollback seed batch" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <p className="font-mono text-xs text-accent">schema.management</p>
                  <h2 className="mt-1 text-lg font-semibold">Schema management</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snapshot ? (
                    <Button
                      type="button"
                      className="w-full justify-start"
                      variant="secondary"
                      disabled={isLifecycleBusy}
                      onClick={() => handleDeleteSchema("archive")}
                    >
                      <Archive className="h-4 w-4" />
                      Archive active schema
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full justify-start"
                      variant="secondary"
                      disabled={isLifecycleBusy}
                      onClick={handleRestoreSchema}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore archived schema
                    </Button>
                  )}
                  {lifecycleMessage ? (
                    <p className="border border-border bg-background px-3 py-2 text-xs text-muted">
                      {lifecycleMessage}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <p className="font-mono text-xs text-accent">project.management</p>
                  <h2 className="mt-1 text-lg font-semibold">Project management</h2>
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
                  <Button
                    type="button"
                    className="w-full justify-start"
                    variant="secondary"
                    disabled={isLifecycleBusy || !snapshot}
                    onClick={() => handleDeleteSchema("hard")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hard delete active schema
                  </Button>
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

              <Card>
                <CardHeader>
                  <p className="font-mono text-xs text-accent">seed.batches</p>
                  <h2 className="mt-1 text-lg font-semibold">Seed batches</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {history?.seedBatches.length ? (
                    history.seedBatches.map((batch) => <SeedBatchRow key={batch.id} batch={batch} />)
                  ) : (
                    <p className="text-sm text-muted">No seed batches recorded yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
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
    <div className="border border-border bg-surface px-3 py-2">
      <p className="font-mono text-lg text-foreground">{value}</p>
      <p className="mt-1 text-muted">{label}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Button className="w-full justify-start" variant="secondary" disabled>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function EventRow({ event }: { event: ProjectEvent }) {
  return (
    <div className="flex items-start gap-3 border border-border bg-background p-3">
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
