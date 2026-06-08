"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, listProjectHistory, listProjects } from "@/src/lib/api-client";
import {
  isAuthenticationError,
  redirectToLogin,
  requireStoredSession
} from "@/src/lib/auth-session";
import { updateStoredSessionUser } from "@/src/lib/session";
import type { AuthUser, Project, ProjectHistoryResponse } from "@testseed/types";
import {
  ArrowRight,
  FolderKanban,
  Layers,
  Plus,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface ProjectWithHistory {
  project: Project;
  history: ProjectHistoryResponse | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectWithHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = requireStoredSession(router);
    if (!session) {
      return;
    }

    let isMounted = true;
    const token = session.token;

    async function loadDashboard() {
      try {
        const [accountResponse, projectsResponse] = await Promise.all([
          getCurrentUser(token),
          listProjects(token)
        ]);

        if (!isMounted) {
          return;
        }

        if (accountResponse.user) {
          updateStoredSessionUser(accountResponse.user);
          setAccount(accountResponse.user);
        }

        const projectsWithHistory = await Promise.all(
          projectsResponse.projects.map(async (project) => ({
            project,
            history: await listProjectHistory(project.id, token)
          }))
        );

        if (isMounted) {
          setProjects(projectsWithHistory);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (isAuthenticationError(loadError)) {
          redirectToLogin(router, "session_expired");
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Could not load dashboard");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const metrics = useMemo(() => {
    const seedBatches = projects.reduce(
      (count, item) => count + (item.history?.seedBatches.length ?? 0),
      0
    );
    const rollbacks = projects.reduce(
      (count, item) =>
        count +
        (item.history?.seedBatches.filter((batch) => batch.status === "rolled_back").length ?? 0),
      0
    );
    const schemasReady = projects.filter((item) => item.project.activeSchemaVersion > 0).length;

    return [
      { label: "Projects", value: projects.length, hint: "Saved workspaces" },
      { label: "Schemas ready", value: schemasReady, hint: "Ready to generate" },
      { label: "Seed batches", value: seedBatches, hint: "Generation runs" },
      { label: "Rollbacks", value: rollbacks, hint: "Reverted inserts" }
    ];
  }, [projects]);

  const recentProjects = projects.slice(0, 6);

  return (
    <AppShell>
      <section className="space-y-6 p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs text-accent">workspace.dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {account ? "Welcome back" : "Your workspace"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              {account
                ? `Signed in as ${account.email}. Create a project, connect a schema, and generate realistic seed data.`
                : "Loading your TestSeed workspace."}
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
          <DashboardSkeleton />
        ) : (
          <>
            {error ? (
              <Alert tone="danger" title="Could not load dashboard">
                {error}
              </Alert>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <Card key={metric.label}>
                  <CardContent className="p-5">
                    <p className="font-mono text-3xl font-semibold text-foreground">{metric.value}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{metric.label}</p>
                    <p className="mt-1 text-xs text-muted">{metric.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-accent">projects.recent</p>
                    <h2 className="mt-1 text-lg font-semibold">Your projects</h2>
                  </div>
                  <Button asChild variant="secondary" className="h-8 px-3 text-xs">
                    <Link href="/projects">View all</Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-1">
                  {projects.length === 0 ? (
                    <div className="rounded-md bg-background/50 px-6 py-10 text-center">
                      <FolderKanban className="mx-auto h-8 w-8 text-accent" />
                      <p className="mt-4 text-sm font-medium">No projects yet</p>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Start with a new project. TestSeed will guide you through context, schema, and generation.
                      </p>
                      <Button asChild className="mt-4">
                        <Link href="/generate">
                          <Plus className="h-4 w-4" />
                          Create your first project
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    recentProjects.map(({ project, history }) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="flex items-center justify-between gap-4 rounded-md px-3 py-3 transition-colors hover:bg-background/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{project.name}</p>
                          <p className="mt-1 truncate text-xs text-muted">
                            {project.description || "No description"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs text-accent">
                            {project.activeSchemaVersion > 0
                              ? `schema v${project.activeSchemaVersion}`
                              : "no schema"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {history?.events.length ?? 0} events · {formatDate(project.updatedAt)}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <p className="font-mono text-xs text-accent">workflow.start</p>
                    <h2 className="mt-1 text-lg font-semibold">How it works</h2>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <WorkflowStep
                      step={1}
                      title="Create a project"
                      text="Name your app and describe the domain context."
                    />
                    <WorkflowStep
                      step={2}
                      title="Add schema"
                      text="Paste code, upload files, or discover from MongoDB."
                    />
                    <WorkflowStep
                      step={3}
                      title="Generate seed data"
                      text="Review fields, set counts, and refine with AI."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <p className="font-mono text-xs text-accent">activity.recent</p>
                    <h2 className="mt-1 text-lg font-semibold">Latest activity</h2>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {projects.length === 0 ? (
                      <p className="text-sm text-muted">Activity appears after your first project run.</p>
                    ) : (
                      projects.slice(0, 4).map(({ project, history }) => {
                        const latestEvent = history?.events.at(-1);
                        return (
                          <div key={project.id} className="rounded-md px-3 py-2.5 hover:bg-background/60">
                            <div className="flex items-center justify-between gap-2">
                              <Link
                                href={`/projects/${project.id}`}
                                className="truncate text-sm font-medium hover:text-accent"
                              >
                                {project.name}
                              </Link>
                              <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted" />
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              {latestEvent
                                ? `${latestEvent.message} · ${formatDate(latestEvent.createdAt)}`
                                : "No activity yet"}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {projects.length > 0 ? (
              <Card className="bg-gradient-to-br from-accent/10 via-surface to-surface">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-xs text-accent">continue.work</p>
                    <h2 className="mt-1 text-lg font-semibold">Pick up where you left off</h2>
                    <p className="mt-2 text-sm text-muted">
                      Open a project to review schema, generate records, or view history.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary">
                      <Link href="/projects">
                        <Layers className="h-4 w-4" />
                        Browse projects
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href="/generate">
                        <Plus className="h-4 w-4" />
                        New project
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </section>
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

function WorkflowStep({
  step,
  title,
  text
}: {
  step: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-md bg-background/50 p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-xs font-semibold text-accent">
        {step}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
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
