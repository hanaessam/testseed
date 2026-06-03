"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCurrentUser, listProjectHistory, listProjects } from "@/src/lib/api-client";
import {
  clearStoredSession,
  getStoredSession,
  updateStoredSessionUser
} from "@/src/lib/session";
import type { AuthUser, Project, ProjectHistoryResponse } from "@testseed/types";
import {
  ArrowRight,
  Database,
  FileJson,
  History,
  Loader2,
  ShieldCheck,
  type LucideIcon
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
    const session = getStoredSession();
    if (!session) {
      router.replace("/login");
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

        if (loadError instanceof Error && loadError.message.includes("Authentication")) {
          clearStoredSession();
          router.replace("/login");
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
      { label: "Projects", value: String(projects.length) },
      { label: "Schemas ready", value: String(schemasReady) },
      { label: "Seed batches", value: String(seedBatches) },
      { label: "Rollbacks", value: String(rollbacks) }
    ];
  }, [projects]);

  return (
    <AppShell>
      <section className="space-y-5 p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs text-accent">workspace.online</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Projects and history</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {account
                ? `Signed in as ${account.email}.`
                : "Loading your TestSeed account and saved generation activity."}
            </p>
          </div>
          <Button asChild>
            <Link href="/generate">
              New generation
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <Card key={metric.label}>
                  <CardContent className="p-4">
                    <p className="font-mono text-2xl text-foreground">{metric.value}</p>
                    <p className="mt-1 text-xs text-muted">{metric.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
              <Card className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-accent">projects.index</p>
                      <h2 className="mt-1 text-lg font-semibold">Projects</h2>
                    </div>
                    <History className="h-5 w-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 p-0">
                  {projects.length === 0 ? (
                    <div className="m-4 border border-border bg-background p-4">
                      <p className="text-sm font-medium">No projects yet</p>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Create a generation run and TestSeed will save the project, schema snapshot,
                        and history here.
                      </p>
                    </div>
                  ) : (
                    projects.map(({ project, history }) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3 transition-colors first:border-t-0 hover:bg-background"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 bg-accent" />
                            <h3 className="truncate text-sm font-semibold">{project.name}</h3>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted">
                            {project.description || "No description"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs text-accent">
                            v{project.activeSchemaVersion}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {history?.events.length ?? 0} events
                          </p>
                          <p className="mt-1 text-xs text-muted">{formatDate(project.updatedAt)}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <Card>
                  <CardHeader>
                    <p className="font-mono text-xs text-accent">activity.feed</p>
                    <h2 className="mt-1 text-lg font-semibold">Latest project activity</h2>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {projects.length === 0 ? (
                      <p className="text-sm text-muted">Project activity appears after parsing a schema.</p>
                    ) : (
                      projects.slice(0, 5).map(({ project, history }) => {
                        const latestEvent = history?.events.at(-1);

                        return (
                          <div key={project.id} className="border border-border bg-background p-3">
                            <div className="flex items-center justify-between gap-3">
                              <Link
                                href={`/projects/${project.id}`}
                                className="truncate text-sm font-medium hover:text-accent"
                              >
                                {project.name}
                              </Link>
                              <span className="font-mono text-xs text-muted">
                                {project.activeSchemaVersion > 0
                                  ? `schema v${project.activeSchemaVersion}`
                                  : "no schema"}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-muted">
                              {latestEvent
                                ? `${latestEvent.message} - ${formatDate(latestEvent.createdAt)}`
                                : "No activity events yet."}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <p className="font-mono text-xs text-accent">account.summary</p>
                    <h2 className="mt-1 text-lg font-semibold">Account</h2>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <SummaryRow label="Email" value={account?.email ?? "Loading"} />
                    <SummaryRow
                      label="Member since"
                      value={account ? formatDate(account.createdAt) : "Loading"}
                    />
                    <SummaryRow label="User ID" value={account?.id ?? "Loading"} />
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <p className="font-mono text-xs text-accent">quick.start</p>
                <h2 className="mt-1 text-lg font-semibold">Set up a generation run</h2>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <QuickStart icon={FileJson} title="Paste schema" text="Use a Mongoose schema." />
                <QuickStart icon={Database} title="Inspect MongoDB" text="Infer collections." />
                <QuickStart icon={ShieldCheck} title="Review first" text="Validate before insert." />
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border pb-2 last:border-0 last:pb-0">
      <p className="font-mono text-xs text-muted">{label}</p>
      <p className="mt-1 break-words text-foreground">{value}</p>
    </div>
  );
}

function QuickStart({
  icon: Icon,
  title,
  text
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="border border-border bg-background p-4">
      <Icon className="h-5 w-5 text-accent" />
      <h3 className="mt-3 text-sm font-medium">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
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
