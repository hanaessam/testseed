"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteProject,
  listProjects,
  restoreProject
} from "@/src/lib/api-client";
import {
  isAuthenticationError,
  redirectToLogin,
  requireStoredSession
} from "@/src/lib/auth-session";
import type { Project } from "@testseed/types";
import {
  Archive,
  ArrowRight,
  FileCode2,
  FolderKanban,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ProjectFilter = "active" | "archived";
type ProjectSort = "recent" | "name";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<ProjectFilter>("active");
  const [sort, setSort] = useState<ProjectSort>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  useEffect(() => {
    const session = requireStoredSession(router);
    if (!session) {
      return;
    }

    let isMounted = true;
    const token = session.token;

    async function loadProjects() {
      try {
        const response = await listProjects(token, { includeArchived: true });
        if (isMounted) {
          setProjects(response.projects);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (isAuthenticationError(loadError)) {
          redirectToLogin(router, "session_expired");
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Could not load projects.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.archivedAt),
    [projects]
  );
  const archivedProjects = useMemo(
    () => projects.filter((project) => project.archivedAt),
    [projects]
  );
  const schemasReady = useMemo(
    () => activeProjects.filter((project) => project.activeSchemaVersion > 0).length,
    [activeProjects]
  );

  const visibleProjects = useMemo(() => {
    const source = filter === "active" ? activeProjects : archivedProjects;
    const query = searchQuery.trim().toLowerCase();

    const filtered = query
      ? source.filter((project) => {
          const haystack = `${project.name} ${project.description ?? ""}`.toLowerCase();
          return haystack.includes(query);
        })
      : source;

    return [...filtered].sort((left, right) => {
      if (sort === "name") {
        return left.name.localeCompare(right.name);
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }, [activeProjects, archivedProjects, filter, searchQuery, sort]);

  function clearFeedback() {
    setError(null);
    setSuccessMessage(null);
  }

  async function handleArchiveProject(project: Project) {
    const session = requireStoredSession(router);
    if (!session) {
      return;
    }

    if (!window.confirm(`Archive "${project.name}"? You can restore it anytime from the Archived tab.`)) {
      return;
    }

    setBusyProjectId(project.id);
    clearFeedback();

    try {
      const response = await deleteProject(project.id, { mode: "archive" }, session.token);
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === project.id && response.project
            ? response.project
            : currentProject
        )
      );
      setFilter("archived");
      setSuccessMessage(`"${project.name}" was archived.`);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Could not archive project."
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleRestoreProject(project: Project) {
    const session = requireStoredSession(router);
    if (!session) {
      return;
    }

    setBusyProjectId(project.id);
    clearFeedback();

    try {
      const response = await restoreProject(project.id, session.token);
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === project.id ? response.project : currentProject
        )
      );
      setFilter("active");
      setSuccessMessage(`"${project.name}" is active again.`);
    } catch (restoreError) {
      setError(
        restoreError instanceof Error ? restoreError.message : "Could not restore project."
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleHardDeleteProject(project: Project) {
    const session = requireStoredSession(router);
    if (!session) {
      return;
    }

    if (
      !window.confirm(
        `Permanently delete "${project.name}"? This removes the project and cannot be undone.`
      )
    ) {
      return;
    }

    setBusyProjectId(project.id);
    clearFeedback();

    try {
      await deleteProject(project.id, { mode: "hard" }, session.token);
      setProjects((currentProjects) =>
        currentProjects.filter((currentProject) => currentProject.id !== project.id)
      );
      setSuccessMessage(`"${project.name}" was deleted.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete project."
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  return (
    <AppShell>
      <section className="space-y-6 p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs text-accent">projects.workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Browse workspaces, pick up where you left off, and manage archived projects.
            </p>
          </div>
          <Button asChild className="h-10 px-4">
            <Link href="/generate">
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <ProjectsPageSkeleton />
        ) : (
          <>
            {error ? (
              <Alert tone="danger" title="Something went wrong">
                {error}
              </Alert>
            ) : null}
            {successMessage ? <Alert tone="success">{successMessage}</Alert> : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Active" value={activeProjects.length} hint="Open workspaces" />
              <MetricCard
                label="Ready to generate"
                value={schemasReady}
                hint="Schema saved"
              />
              <MetricCard label="Archived" value={archivedProjects.length} hint="Recoverable" />
            </div>

            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-mono text-xs text-accent">projects.list</p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {filter === "active" ? "Active projects" : "Archived projects"}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {filter === "active"
                        ? "Open a project to review schema, generate data, or view history."
                        : "Restore a project to continue work, or delete it permanently."}
                    </p>
                  </div>
                  <div className="relative w-full lg:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by name or description"
                      className="pl-9"
                      aria-label="Search projects"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-1">
                    <FilterButton
                      active={filter === "active"}
                      label={`Active (${activeProjects.length})`}
                      onClick={() => setFilter("active")}
                    />
                    <FilterButton
                      active={filter === "archived"}
                      label={`Archived (${archivedProjects.length})`}
                      onClick={() => setFilter("archived")}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-xs text-muted">Sort</span>
                    <FilterButton
                      active={sort === "recent"}
                      label="Recent"
                      onClick={() => setSort("recent")}
                    />
                    <FilterButton
                      active={sort === "name"}
                      label="Name"
                      onClick={() => setSort("name")}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {visibleProjects.length === 0 ? (
                  <EmptyProjectsState
                    filter={filter}
                    hasSearch={searchQuery.trim().length > 0}
                    onClearSearch={() => setSearchQuery("")}
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        isBusy={busyProjectId === project.id}
                        isArchived={filter === "archived"}
                        onArchive={() => handleArchiveProject(project)}
                        onRestore={() => handleRestoreProject(project)}
                        onHardDelete={() => handleHardDeleteProject(project)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  hint
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-mono text-3xl font-semibold text-foreground">{value}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}

function FilterButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
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
      {label}
    </button>
  );
}

function EmptyProjectsState({
  filter,
  hasSearch,
  onClearSearch
}: {
  filter: ProjectFilter;
  hasSearch: boolean;
  onClearSearch(): void;
}) {
  if (hasSearch) {
    return (
      <div className="rounded-lg bg-background/50 px-6 py-12 text-center">
        <Search className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-4 text-sm font-medium">No projects match your search</p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Try a different name or clear the search to see all projects.
        </p>
        <Button type="button" variant="secondary" className="mt-4" onClick={onClearSearch}>
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-background/50 px-6 py-12 text-center">
      <FolderKanban className="mx-auto h-8 w-8 text-accent" />
      <p className="mt-4 text-sm font-medium">
        {filter === "active" ? "No active projects yet" : "No archived projects"}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">
        {filter === "active"
          ? "Create a project and TestSeed will guide you through context, schema, and generation."
          : "When you archive a project, it will appear here so you can restore it later."}
      </p>
      {filter === "active" ? (
        <Button asChild className="mt-4">
          <Link href="/generate">
            <Plus className="h-4 w-4" />
            Create your first project
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function ProjectCard({
  project,
  isBusy,
  isArchived,
  onArchive,
  onRestore,
  onHardDelete
}: {
  project: Project;
  isBusy: boolean;
  isArchived: boolean;
  onArchive(): void;
  onRestore(): void;
  onHardDelete(): void;
}) {
  const hasSchema = project.activeSchemaVersion > 0;
  const continueHref = hasSchema
    ? `/generate?projectId=${project.id}&mode=generate`
    : `/generate?projectId=${project.id}&mode=edit`;
  const continueLabel = hasSchema ? "Generate" : "Add schema";
  const ContinueIcon = hasSchema ? Sparkles : FileCode2;

  return (
    <article className="flex h-full flex-col rounded-lg bg-background/50 p-4 transition-colors hover:bg-background/70">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/projects/${project.id}`} className="min-w-0 group">
            <h3 className="truncate text-sm font-semibold group-hover:text-accent">
              {project.name}
            </h3>
          </Link>
          <ProjectStatusBadge archived={Boolean(project.archivedAt)} hasSchema={hasSchema} />
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">
          {project.description || "No description yet."}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>
            {hasSchema ? `Schema v${project.activeSchemaVersion}` : "Schema not saved"}
          </span>
          <span>Updated {formatRelativeDate(project.updatedAt)}</span>
          {project.archivedAt ? (
            <span>Archived {formatDate(project.archivedAt)}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button asChild className="h-8 px-3 text-xs">
          <Link href={`/projects/${project.id}`}>
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>

        {!isArchived ? (
          <>
            <Button asChild variant="secondary" className="h-8 px-3 text-xs">
              <Link href={continueHref}>
                <ContinueIcon className="h-3.5 w-3.5" />
                {continueLabel}
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto h-8 px-2 text-xs text-muted"
              disabled={isBusy}
              onClick={onArchive}
            >
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              Archive
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={isBusy}
              onClick={onRestore}
            >
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Restore
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto h-8 px-2 text-xs text-error"
              disabled={isBusy}
              onClick={onHardDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function ProjectStatusBadge({
  archived,
  hasSchema
}: {
  archived: boolean;
  hasSchema: boolean;
}) {
  if (archived) {
    return (
      <span className="shrink-0 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
        Archived
      </span>
    );
  }

  if (hasSchema) {
    return (
      <span className="shrink-0 rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
        Ready
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
      Needs schema
    </span>
  );
}

function ProjectsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatRelativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return formatDate(date);
}
