"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  FolderKanban,
  Loader2,
  Play,
  RotateCcw,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ProjectFilter = "active" | "archived";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<ProjectFilter>("active");
  const [error, setError] = useState<string | null>(null);
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
  const visibleProjects = filter === "active" ? activeProjects : archivedProjects;

  async function handleArchiveProject(project: Project) {
    const session = requireStoredSession(router);
    if (!session) {
      return;
    }

    if (!window.confirm(`Archive ${project.name}? You can restore it later.`)) {
      return;
    }

    setBusyProjectId(project.id);
    setError(null);

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
    setError(null);

    try {
      const response = await restoreProject(project.id, session.token);
      setProjects((currentProjects) =>
        currentProjects.map((currentProject) =>
          currentProject.id === project.id ? response.project : currentProject
        )
      );
      setFilter("active");
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

    if (!window.confirm(`Hard delete ${project.name}? This cannot be undone.`)) {
      return;
    }

    setBusyProjectId(project.id);
    setError(null);

    try {
      await deleteProject(project.id, { mode: "hard" }, session.token);
      setProjects((currentProjects) =>
        currentProjects.filter((currentProject) => currentProject.id !== project.id)
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not hard delete project."
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  return (
    <AppShell>
      <section className="space-y-5 p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs text-accent">projects.workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Manage active work, recover archived projects, and open project-specific schemas.
            </p>
          </div>
          <Button asChild>
            <Link href="/generate">
              New project
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center border border-border bg-surface">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : (
          <>
            {error ? (
              <div className="border border-error bg-surface px-4 py-3 text-sm text-error">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
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

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-accent">
                      {filter === "active" ? "projects.active" : "projects.archived"}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      {filter === "active" ? "Active projects" : "Archived projects"}
                    </h2>
                  </div>
                  <FolderKanban className="h-5 w-5 text-accent" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {visibleProjects.length === 0 ? (
                  <div className="border border-border bg-background p-4">
                    <p className="text-sm font-medium">
                      {filter === "active" ? "No active projects" : "No archived projects"}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      {filter === "active"
                        ? "Create a new project to get started."
                        : "Archived projects will appear here after you archive them."}
                    </p>
                  </div>
                ) : (
                  visibleProjects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isBusy={busyProjectId === project.id}
                      isArchived={filter === "archived"}
                      onArchive={() => handleArchiveProject(project)}
                      onRestore={() => handleRestoreProject(project)}
                      onHardDelete={() => handleHardDeleteProject(project)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </AppShell>
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

function ProjectRow({
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
  return (
    <div className="grid gap-3 border border-border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{project.name}</h3>
          <span className="border border-border px-2 py-0.5 font-mono text-xs text-muted">
            schema v{project.activeSchemaVersion}
          </span>
          {project.archivedAt ? (
            <span className="border border-border px-2 py-0.5 text-xs text-muted">
              Archived {formatDate(project.archivedAt)}
            </span>
          ) : null}
        </div>
        <p className="mt-2 truncate text-xs text-muted">
          {project.description || "No description saved."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href={`/projects/${project.id}`}>
            Open
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        {!isArchived ? (
          <>
            <Button asChild variant="secondary">
              <Link href={`/generate?projectId=${project.id}&mode=generate`}>
                <Play className="h-4 w-4" />
                Generate
              </Link>
            </Button>
            <Button type="button" variant="secondary" disabled={isBusy} onClick={onArchive}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Archive
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" disabled={isBusy} onClick={onRestore}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Restore
            </Button>
            <Button type="button" variant="secondary" disabled={isBusy} onClick={onHardDelete}>
              <Trash2 className="h-4 w-4" />
              Hard delete
            </Button>
          </>
        )}
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
