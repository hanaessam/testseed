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
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Rows3,
  Search,
  Sparkles,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";

type LifecycleFilter = "all" | "active" | "archived";
type SchemaFilter = "all" | "ready" | "needs_schema";
type ProjectSort = "recent" | "name" | "created";
type ProjectViewMode = "cards" | "list" | "compact";

const VIEW_MODE_STORAGE_KEY = "testseed:projects-view";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("active");
  const [schemaFilter, setSchemaFilter] = useState<SchemaFilter>("all");
  const [sort, setSort] = useState<ProjectSort>("recent");
  const [viewMode, setViewMode] = useState<ProjectViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === "cards" || stored === "list" || stored === "compact") {
      setViewMode(stored);
    }
  }, []);

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
  const needsSchema = useMemo(
    () => activeProjects.filter((project) => project.activeSchemaVersion <= 0).length,
    [activeProjects]
  );

  const visibleProjects = useMemo(() => {
    let source =
      lifecycleFilter === "all"
        ? projects
        : lifecycleFilter === "active"
          ? activeProjects
          : archivedProjects;

    if (lifecycleFilter !== "archived" && schemaFilter !== "all") {
      source = source.filter((project) => {
        if (project.archivedAt) {
          return false;
        }

        const hasSchema = project.activeSchemaVersion > 0;
        return schemaFilter === "ready" ? hasSchema : !hasSchema;
      });
    }

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

      if (sort === "created") {
        return right.createdAt.getTime() - left.createdAt.getTime();
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }, [
    activeProjects,
    archivedProjects,
    lifecycleFilter,
    projects,
    schemaFilter,
    searchQuery,
    sort
  ]);

  function handleViewModeChange(mode: ProjectViewMode) {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  }

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
      setLifecycleFilter("archived");
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
      setLifecycleFilter("active");
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

  const listTitle =
    lifecycleFilter === "all"
      ? "All projects"
      : lifecycleFilter === "active"
        ? "Active projects"
        : "Archived projects";

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
          <ProjectsPageSkeleton viewMode={viewMode} />
        ) : (
          <>
            {error ? (
              <Alert tone="danger" title="Something went wrong">
                {error}
              </Alert>
            ) : null}
            {successMessage ? <Alert tone="success">{successMessage}</Alert> : null}

            <PageSection
              label="projects.overview"
              title="Workspace summary"
              description="Counts across your active and archived projects."
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Active" value={activeProjects.length} hint="Open workspaces" />
                <MetricCard label="Ready to generate" value={schemasReady} hint="Schema saved" />
                <MetricCard label="Needs schema" value={needsSchema} hint="Setup incomplete" />
                <MetricCard label="Archived" value={archivedProjects.length} hint="Recoverable" />
              </div>
            </PageSection>

            <PageSection
              label="projects.list"
              title={listTitle}
              description={`${visibleProjects.length} shown · click a project to open details`}
            >
            <Card className="overflow-hidden">
              <CardHeader className="space-y-4 border-b border-border bg-background/30">
                <FilterGroup label="Search">
                  <div className="relative w-full">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by name or description"
                      className="border-border bg-surface pl-9"
                      aria-label="Search projects"
                    />
                  </div>
                </FilterGroup>

                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                  <FilterGroup label="Status">
                    <FilterButton
                      active={lifecycleFilter === "all"}
                      label={`All (${projects.length})`}
                      onClick={() => setLifecycleFilter("all")}
                    />
                    <FilterButton
                      active={lifecycleFilter === "active"}
                      label={`Active (${activeProjects.length})`}
                      onClick={() => setLifecycleFilter("active")}
                    />
                    <FilterButton
                      active={lifecycleFilter === "archived"}
                      label={`Archived (${archivedProjects.length})`}
                      onClick={() => setLifecycleFilter("archived")}
                    />
                  </FilterGroup>

                  {lifecycleFilter !== "archived" ? (
                    <FilterGroup label="Schema">
                      <FilterButton
                        active={schemaFilter === "all"}
                        label="All"
                        onClick={() => setSchemaFilter("all")}
                      />
                      <FilterButton
                        active={schemaFilter === "ready"}
                        label="Ready"
                        onClick={() => setSchemaFilter("ready")}
                      />
                      <FilterButton
                        active={schemaFilter === "needs_schema"}
                        label="Needs schema"
                        onClick={() => setSchemaFilter("needs_schema")}
                      />
                    </FilterGroup>
                  ) : (
                    <FilterGroup label="Schema">
                      <p className="text-xs text-muted">Schema filters apply to active projects only.</p>
                    </FilterGroup>
                  )}

                  <FilterGroup label="Sort by">
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
                    <FilterButton
                      active={sort === "created"}
                      label="Created"
                      onClick={() => setSort("created")}
                    />
                  </FilterGroup>

                  <FilterGroup label="View">
                    <ViewModeButton
                      active={viewMode === "cards"}
                      label="Cards"
                      icon={LayoutGrid}
                      onClick={() => handleViewModeChange("cards")}
                    />
                    <ViewModeButton
                      active={viewMode === "list"}
                      label="List"
                      icon={List}
                      onClick={() => handleViewModeChange("list")}
                    />
                    <ViewModeButton
                      active={viewMode === "compact"}
                      label="Compact"
                      icon={Rows3}
                      onClick={() => handleViewModeChange("compact")}
                    />
                  </FilterGroup>
                </div>
              </CardHeader>

              <CardContent className="bg-background/20 pt-5">
                {visibleProjects.length === 0 ? (
                  <EmptyProjectsState
                    lifecycleFilter={lifecycleFilter}
                    hasSearch={searchQuery.trim().length > 0}
                    onClearSearch={() => setSearchQuery("")}
                  />
                ) : (
                  <ProjectCollection
                    viewMode={viewMode}
                    projects={visibleProjects}
                    busyProjectId={busyProjectId}
                    onOpen={(projectId) => router.push(`/projects/${projectId}`)}
                    onArchive={handleArchiveProject}
                    onRestore={handleRestoreProject}
                    onHardDelete={handleHardDeleteProject}
                  />
                )}
              </CardContent>
            </Card>
            </PageSection>
          </>
        )}
      </section>
    </AppShell>
  );
}

function ProjectCollection({
  viewMode,
  projects,
  busyProjectId,
  onOpen,
  onArchive,
  onRestore,
  onHardDelete
}: {
  viewMode: ProjectViewMode;
  projects: Project[];
  busyProjectId: string | null;
  onOpen(projectId: string): void;
  onArchive(project: Project): void;
  onRestore(project: Project): void;
  onHardDelete(project: Project): void;
}) {
  if (viewMode === "cards") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            viewMode="cards"
            isBusy={busyProjectId === project.id}
            onOpen={() => onOpen(project.id)}
            onArchive={() => onArchive(project)}
            onRestore={() => onRestore(project)}
            onHardDelete={() => onHardDelete(project)}
          />
        ))}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm shadow-black/10">
        <div className="hidden gap-4 border-b border-border bg-background/60 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_10rem]">
          <span>Project</span>
          <span>Description</span>
          <span>Schema</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-border">
          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              viewMode="list"
              isBusy={busyProjectId === project.id}
              onOpen={() => onOpen(project.id)}
              onArchive={() => onArchive(project)}
              onRestore={() => onRestore(project)}
              onHardDelete={() => onHardDelete(project)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface shadow-sm shadow-black/10">
      {projects.map((project) => (
        <ProjectItem
          key={project.id}
          project={project}
          viewMode="compact"
          isBusy={busyProjectId === project.id}
          onOpen={() => onOpen(project.id)}
          onArchive={() => onArchive(project)}
          onRestore={() => onRestore(project)}
          onHardDelete={() => onHardDelete(project)}
        />
      ))}
    </div>
  );
}

function ProjectItem({
  project,
  viewMode,
  isBusy,
  onOpen,
  onArchive,
  onRestore,
  onHardDelete
}: {
  project: Project;
  viewMode: ProjectViewMode;
  isBusy: boolean;
  onOpen(): void;
  onArchive(): void;
  onRestore(): void;
  onHardDelete(): void;
}) {
  const isArchived = Boolean(project.archivedAt);
  const hasSchema = project.activeSchemaVersion > 0;
  const continueHref = hasSchema
    ? `/generate?projectId=${project.id}&mode=generate`
    : `/generate?projectId=${project.id}&mode=edit`;
  const continueLabel = hasSchema ? "Generate" : "Add schema";
  const ContinueIcon = hasSchema ? Sparkles : FileCode2;

  function handleOpen(event: MouseEvent<HTMLElement>) {
    if (event.defaultPrevented) {
      return;
    }

    onOpen();
  }

  function stopAction(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  const actions = (
    <ProjectActions
      project={project}
      isArchived={isArchived}
      isBusy={isBusy}
      continueHref={continueHref}
      continueLabel={continueLabel}
      ContinueIcon={ContinueIcon}
      compact={viewMode === "compact"}
      onStop={stopAction}
      onArchive={onArchive}
      onRestore={onRestore}
      onHardDelete={onHardDelete}
    />
  );

  if (viewMode === "list") {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        className="grid cursor-pointer gap-3 bg-surface px-4 py-3.5 transition-colors hover:bg-background/60 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_10rem] md:items-center"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FolderKanban className="h-4 w-4 shrink-0 text-accent" />
            <h3 className="truncate text-sm font-semibold">{project.name}</h3>
            <ProjectStatusBadge archived={isArchived} hasSchema={hasSchema} />
          </div>
          <p className="mt-1 text-xs text-muted md:hidden">
            Updated {formatRelativeDate(project.updatedAt)}
          </p>
        </div>
        <p className="line-clamp-2 text-xs leading-5 text-muted">
          {project.description || "No description yet."}
        </p>
        <div className="text-xs text-muted">
          <p>{hasSchema ? `v${project.activeSchemaVersion}` : "Not saved"}</p>
          <p className="mt-1 hidden md:block">Updated {formatRelativeDate(project.updatedAt)}</p>
        </div>
        <div onClick={stopAction} role="presentation">
          {actions}
        </div>
      </article>
    );
  }

  if (viewMode === "compact") {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        className="flex cursor-pointer flex-col gap-3 bg-surface px-4 py-3.5 transition-colors hover:bg-background/60 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FolderKanban className="h-4 w-4 shrink-0 text-accent" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-medium">{project.name}</h3>
              <ProjectStatusBadge archived={isArchived} hasSchema={hasSchema} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {hasSchema ? `Schema v${project.activeSchemaVersion}` : "Needs schema"} · Updated{" "}
              {formatRelativeDate(project.updatedAt)}
            </p>
          </div>
        </div>
        <div onClick={stopAction} role="presentation">
          {actions}
        </div>
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="flex h-full cursor-pointer flex-col rounded-lg border border-border bg-surface p-4 shadow-sm shadow-black/10 transition-colors hover:border-accent/30 hover:bg-background/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <h3 className="truncate text-sm font-semibold">{project.name}</h3>
          </div>
          <ProjectStatusBadge archived={isArchived} hasSchema={hasSchema} />
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">
          {project.description || "No description yet."}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>{hasSchema ? `Schema v${project.activeSchemaVersion}` : "Schema not saved"}</span>
          <span>Updated {formatRelativeDate(project.updatedAt)}</span>
          {project.archivedAt ? <span>Archived {formatDate(project.archivedAt)}</span> : null}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4" onClick={stopAction} role="presentation">
        {actions}
      </div>
    </article>
  );
}

function ProjectActions({
  project,
  isArchived,
  isBusy,
  continueHref,
  continueLabel,
  ContinueIcon,
  compact,
  onStop,
  onArchive,
  onRestore,
  onHardDelete
}: {
  project: Project;
  isArchived: boolean;
  isBusy: boolean;
  continueHref: string;
  continueLabel: string;
  ContinueIcon: typeof Sparkles;
  compact: boolean;
  onStop(event: MouseEvent<HTMLElement>): void;
  onArchive(): void;
  onRestore(): void;
  onHardDelete(): void;
}) {
  const buttonClass = compact ? "h-7 px-2 text-[11px]" : "h-8 px-3 text-xs";

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${compact ? "justify-end" : ""}`}
      onClick={onStop}
    >
      <Button asChild className={buttonClass} variant="secondary">
        <Link href={`/projects/${project.id}`} onClick={onStop}>
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>

      {!isArchived ? (
        <>
          <Button asChild variant="secondary" className={buttonClass}>
            <Link href={continueHref} onClick={onStop}>
              <ContinueIcon className="h-3.5 w-3.5" />
              {continueLabel}
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={`${buttonClass} text-muted`}
            disabled={isBusy}
            onClick={(event) => {
              onStop(event);
              onArchive();
            }}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            {!compact ? "Archive" : null}
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="secondary"
            className={buttonClass}
            disabled={isBusy}
            onClick={(event) => {
              onStop(event);
              onRestore();
            }}
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
            className={`${buttonClass} text-error`}
            disabled={isBusy}
            onClick={(event) => {
              onStop(event);
              onHardDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {!compact ? "Delete" : null}
          </Button>
        </>
      )}
    </div>
  );
}

function PageSection({
  label,
  title,
  description,
  children
}: {
  label: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-border pb-3">
        <p className="font-mono text-xs text-accent">{label}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FilterGroup({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3 shadow-sm shadow-black/5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
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
    <Card className="border-border bg-surface shadow-sm shadow-black/10">
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

function ViewModeButton({
  active,
  label,
  icon: Icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: typeof LayoutGrid;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-muted hover:bg-background/60 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function EmptyProjectsState({
  lifecycleFilter,
  hasSearch,
  onClearSearch
}: {
  lifecycleFilter: LifecycleFilter;
  hasSearch: boolean;
  onClearSearch(): void;
}) {
  if (hasSearch) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
        <Search className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-4 text-sm font-medium">No projects match your filters</p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Try a different search term or reset your filters.
        </p>
        <Button type="button" variant="secondary" className="mt-4" onClick={onClearSearch}>
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      <FolderKanban className="mx-auto h-8 w-8 text-accent" />
      <p className="mt-4 text-sm font-medium">
        {lifecycleFilter === "archived" ? "No archived projects" : "No projects in this view"}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">
        {lifecycleFilter === "archived"
          ? "When you archive a project, it will appear here so you can restore it later."
          : "Create a project or adjust filters to see more results."}
      </p>
      {lifecycleFilter !== "archived" ? (
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
    <span className="shrink-0 rounded-md border border-warning-border bg-warning-subtle px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning-text">
      Needs schema
    </span>
  );
}

function ProjectsPageSkeleton({ viewMode }: { viewMode: ProjectViewMode }) {
  const itemCount = viewMode === "cards" ? 6 : 8;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <div
        className={
          viewMode === "cards"
            ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            : "space-y-2"
        }
      >
        {Array.from({ length: itemCount }).map((_, index) => (
          <Skeleton
            key={index}
            className={viewMode === "compact" ? "h-14 rounded-none" : "h-32 rounded-lg"}
          />
        ))}
      </div>
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
