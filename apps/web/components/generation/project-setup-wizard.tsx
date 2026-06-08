"use client";

import { SchemaReviewFieldsPanel } from "@/components/generation/schema-review-fields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import type { ContextWarning, ParsedSchema, RepositoryContextSource, SchemaField } from "@testseed/types";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  FileCode2,
  FileText,
  GitBranch,
  Loader2,
  Sparkles,
  Upload,
  X
} from "lucide-react";
import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { useMemo } from "react";

export type WizardStep =
  | "project"
  | "github"
  | "schema-choose"
  | "schema-paste"
  | "schema-upload"
  | "schema-mongodb"
  | "review";

type SchemaInputMethod = "paste" | "upload" | "mongodb";

interface SchemaFileDraft {
  name: string;
  content: string;
}

export interface ProjectSetupWizardProps {
  step: WizardStep;
  projectId: string | null;
  projectNameDraft: string;
  projectDescription: string;
  repositoryDraft: string;
  connectedRepository: RepositoryContextSource | null;
  contextWarnings: ContextWarning[];
  projectMessage: string | null;
  schemaText: string;
  schemaFiles: SchemaFileDraft[];
  parsedSchema: ParsedSchema | null;
  mongoConnectionString: string;
  mongoConnectionMessage: string | null;
  warnings: string[];
  schemaSaveMessage: string | null;
  schemaIsSaved: boolean;
  savedProjectId: string | null;
  activeCollectionIdx: number;
  error: string | null;
  isCreatingProject: boolean;
  isGithubBusy: boolean;
  isLoading: boolean;
  isTestingMongo: boolean;
  isDiscoveringMongo: boolean;
  isSavingSchema: boolean;
  isBusy: boolean;
  meaningfulRepositoryWarnings: ContextWarning[];
  onProjectNameChange(value: string): void;
  onProjectDescriptionChange(value: string): void;
  onRepositoryDraftChange(value: string): void;
  onSchemaTextChange(value: string): void;
  onMongoConnectionStringChange(value: string): void;
  onActiveCollectionIdxChange(index: number): void;
  onCreateProject(): void;
  onSaveExistingContext(): void;
  onGithubConnect(): void;
  onGithubSkip(): void;
  onGithubContinue(): void;
  onChooseSchemaMethod(method: SchemaInputMethod): void;
  onDemoSchema(): void;
  onReviewSchema(): void;
  onSchemaFiles(event: ChangeEvent<HTMLInputElement>): void;
  onRemoveSchemaFile(index: number): void;
  onTestMongoConnection(): void;
  onDiscoverMongoSchema(): void;
  onSaveParsedSchema(): void;
  onFieldChange(
    collectionIndex: number,
    fieldIndex: number,
    updateField: (field: SchemaField) => SchemaField
  ): void;
  onBack(): void;
  onContinueToWorkbench(): void;
}

export function ProjectSetupWizard({
  step,
  projectId,
  projectNameDraft,
  projectDescription,
  repositoryDraft,
  connectedRepository,
  contextWarnings,
  projectMessage,
  schemaText,
  schemaFiles,
  parsedSchema,
  mongoConnectionString,
  mongoConnectionMessage,
  warnings,
  schemaSaveMessage,
  schemaIsSaved,
  savedProjectId,
  activeCollectionIdx,
  error,
  isCreatingProject,
  isGithubBusy,
  isLoading,
  isTestingMongo,
  isDiscoveringMongo,
  isSavingSchema,
  isBusy,
  meaningfulRepositoryWarnings,
  onProjectNameChange,
  onProjectDescriptionChange,
  onRepositoryDraftChange,
  onSchemaTextChange,
  onMongoConnectionStringChange,
  onActiveCollectionIdxChange,
  onCreateProject,
  onSaveExistingContext,
  onGithubConnect,
  onGithubSkip,
  onGithubContinue,
  onChooseSchemaMethod,
  onDemoSchema,
  onReviewSchema,
  onSchemaFiles,
  onRemoveSchemaFile,
  onTestMongoConnection,
  onDiscoverMongoSchema,
  onSaveParsedSchema,
  onFieldChange,
  onBack,
  onContinueToWorkbench
}: ProjectSetupWizardProps) {
  const steps = useMemo(
    () => [
      { id: "project", title: "Basics", description: "Name + domain context" },
      { id: "github", title: "GitHub", description: "Optional repository" },
      { id: "schema", title: "Schema", description: "Choose input method" },
      { id: "review", title: "Review", description: "Edit + save snapshot" }
    ],
    []
  );

  const stepperActiveId = getStepperActiveId(step);
  const currentCollection = parsedSchema?.collections[activeCollectionIdx] ?? null;
  const canContinueFromReview = schemaIsSaved && Boolean(parsedSchema) && !isBusy;

  return (
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
            <Button type="button" variant="secondary" disabled={step === "project"} onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
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
          <WizardCard
            label="step.project"
            title="Project basics"
            description="Give your project a name and describe the domain so generated data feels realistic."
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-project-name">Project name</Label>
                <Input
                  id="wizard-project-name"
                  value={projectNameDraft}
                  onChange={(event) => onProjectNameChange(event.target.value)}
                  placeholder="e.g., E-commerce API"
                  disabled={Boolean(projectId)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-project-context">Project context</Label>
                <Textarea
                  id="wizard-project-context"
                  value={projectDescription}
                  onChange={(event) => onProjectDescriptionChange(event.target.value)}
                  placeholder="Describe users, products, orders, geography, tone, and relationships…"
                  className="min-h-28"
                />
              </div>
            </div>

            {contextWarnings.length > 0 ? (
              <Alert tone="warning" title="Context warnings" className="mt-4">
                <ul className="list-disc space-y-1 pl-4">
                  {contextWarnings.map((warning) => (
                    <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}

            {projectMessage ? (
              <Alert
                tone={
                  projectMessage.toLowerCase().includes("saved") ||
                  projectMessage.toLowerCase().includes("created")
                    ? "success"
                    : "info"
                }
                className="mt-4"
              >
                {projectMessage}
              </Alert>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {!projectId ? (
                <Button
                  type="button"
                  onClick={onCreateProject}
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
                    onClick={onSaveExistingContext}
                    disabled={isCreatingProject}
                  >
                    Save context
                  </Button>
                  <Button type="button" onClick={onGithubContinue}>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </WizardCard>
        ) : null}

        {step === "github" ? (
          <WizardCard
            label="step.github"
            title="GitHub context (optional)"
            description="Connect a repository so TestSeed can read schemas, models, and docs for better generation context."
          >
            {!connectedRepository ? (
              <div className="space-y-2">
                <Label htmlFor="wizard-project-repo">Repository</Label>
                <Input
                  id="wizard-project-repo"
                  value={repositoryDraft}
                  onChange={(event) => onRepositoryDraftChange(event.target.value)}
                  placeholder="owner/repo or GitHub URL"
                />
              </div>
            ) : null}

            {connectedRepository ? (
              <RepositorySummary
                repository={connectedRepository}
                warnings={meaningfulRepositoryWarnings}
              />
            ) : null}

            {projectMessage ? (
              <Alert tone={connectedRepository ? "success" : "info"} className="mt-4">
                {projectMessage}
              </Alert>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-5">
              {!connectedRepository ? (
                <>
                  <Button
                    type="button"
                    onClick={onGithubConnect}
                    disabled={isGithubBusy || !repositoryDraft.trim() || !projectId}
                  >
                    {isGithubBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="h-4 w-4" />
                    )}
                    Connect GitHub
                  </Button>
                  <Button type="button" variant="secondary" onClick={onGithubSkip}>
                    Skip for now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={onGithubContinue} disabled={!projectId}>
                  Continue to schema
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </WizardCard>
        ) : null}

        {step === "schema-choose" ? (
          <WizardCard
            label="step.schema.choose"
            title="How do you want to add your schema?"
            description="Pick one method. Each option opens its own step."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <ChooseMethodCard
                icon={FileText}
                title="Paste schema code"
                description="Paste Mongoose model definitions directly."
                onClick={() => onChooseSchemaMethod("paste")}
              />
              <ChooseMethodCard
                icon={Upload}
                title="Upload schema files"
                description="Upload one or more Mongoose model files."
                onClick={() => onChooseSchemaMethod("upload")}
              />
              <ChooseMethodCard
                icon={Database}
                title="MongoDB discovery"
                description="Infer schema from a live database connection."
                onClick={() => onChooseSchemaMethod("mongodb")}
              />
            </div>
          </WizardCard>
        ) : null}

        {step === "schema-paste" ? (
          <Card className="bg-surface">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-accent">step.schema.paste</p>
                <h2 className="mt-1 text-lg font-semibold">Paste Mongoose schema</h2>
              </div>
              <Button type="button" variant="secondary" onClick={onDemoSchema}>
                Load demo
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-[24rem] font-mono text-xs leading-relaxed"
                spellCheck={false}
                value={schemaText}
                onChange={(event) => onSchemaTextChange(event.target.value)}
                placeholder={`// Paste Mongoose schema(s) here`}
              />
              <Button
                type="button"
                onClick={onReviewSchema}
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
          <WizardCard label="step.schema.upload" title="Upload Mongoose schema files">
            <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-accent" />
              <p className="mt-3 text-sm font-medium">Add model files</p>
              <Button asChild className="mt-4" variant="secondary">
                <label htmlFor="wizard-schema-files-upload" className="cursor-pointer">
                  Choose files
                </label>
              </Button>
              <input
                id="wizard-schema-files-upload"
                type="file"
                multiple
                accept=".js,.jsx,.ts,.tsx,.mjs,.cjs,.txt"
                className="sr-only"
                onChange={onSchemaFiles}
              />
            </div>
            {schemaFiles.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {schemaFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex min-h-10 items-center gap-3 rounded border border-border bg-background px-3 text-xs"
                  >
                    <FileCode2 className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-foreground">{file.name}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted hover:border-error hover:text-error"
                      onClick={() => onRemoveSchemaFile(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Alert tone="info" title="Next action" className="mt-4">
                Upload at least one schema file to continue.
              </Alert>
            )}
            <Button
              type="button"
              className="mt-4"
              onClick={onReviewSchema}
              disabled={isLoading || schemaFiles.length === 0 || !projectId}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyze uploaded files
              <ArrowRight className="h-4 w-4" />
            </Button>
          </WizardCard>
        ) : null}

        {step === "schema-mongodb" ? (
          <WizardCard
            label="step.schema.mongodb"
            title="Discover schema from MongoDB"
            description="The connection string is used only for this operation and is not stored."
          >
            <div className="space-y-2">
              <Label htmlFor="wizard-mongodb-connection">Connection string</Label>
              <Input
                id="wizard-mongodb-connection"
                type="password"
                value={mongoConnectionString}
                onChange={(event) => onMongoConnectionStringChange(event.target.value)}
                placeholder="mongodb+srv://..."
                autoComplete="off"
                className="font-mono text-xs"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onTestMongoConnection}
                disabled={isTestingMongo || !mongoConnectionString.trim()}
              >
                {isTestingMongo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Test connection
              </Button>
              <Button
                type="button"
                onClick={onDiscoverMongoSchema}
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
              <Alert
                tone={mongoConnectionMessage.toLowerCase().includes("successful") ? "success" : "info"}
                className="mt-4"
              >
                {mongoConnectionMessage}
              </Alert>
            ) : null}
          </WizardCard>
        ) : null}

        {step === "review" ? (
          <WizardCard label="step.review" title="Review and save schema">
            {warnings.length > 0 ? (
              <Alert tone="warning" title="Schema warnings">
                <ul className="list-disc space-y-1 pl-4">
                  {warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
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
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted">
                    Collections
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {parsedSchema.collections.map((collection, index) => (
                      <button
                        key={collection.name}
                        type="button"
                        onClick={() => onActiveCollectionIdxChange(index)}
                        className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-mono transition-colors ${
                          index === activeCollectionIdx
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-background text-muted hover:text-foreground"
                        }`}
                      >
                        <Database className="h-3 w-3" />
                        {collection.name}
                      </button>
                    ))}
                  </div>
                </div>

                {currentCollection ? (
                  <SchemaReviewFieldsPanel
                    collectionName={currentCollection.name}
                    sampleCount={currentCollection.sampleCount}
                    collectionWarnings={currentCollection.warnings}
                    fields={currentCollection.fields}
                    activeCollectionIdx={activeCollectionIdx}
                    onFieldChange={onFieldChange}
                  />
                ) : null}

                <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    {schemaSaveMessage ? (
                      <Alert tone="success">{schemaSaveMessage}</Alert>
                    ) : (
                      <p className="text-xs text-muted">
                        Save your schema snapshot, then open the generation workbench.
                      </p>
                    )}
                    {savedProjectId ? (
                      <Button asChild variant="secondary" className="h-8">
                        <Link href={`/projects/${savedProjectId}`}>View project details</Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onSaveParsedSchema}
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
                      onClick={onContinueToWorkbench}
                      disabled={!canContinueFromReview}
                    >
                      Open generation workbench
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </WizardCard>
        ) : null}
      </div>
    </section>
  );
}

function WizardCard({
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
    <Card className="bg-surface">
      <CardHeader>
        <p className="font-mono text-xs text-accent">{label}</p>
        <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ChooseMethodCard({
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
      className="group flex h-full flex-col rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-accent hover:bg-accent/5"
    >
      <Icon className="h-6 w-6 text-accent" />
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{description}</p>
    </button>
  );
}

function RepositorySummary({
  repository,
  warnings
}: {
  repository: RepositoryContextSource;
  warnings: ContextWarning[];
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4">
      <Alert tone="success" title="Connected repository">
        <a
          href={repository.repositoryUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-accent underline-offset-2 hover:underline"
        >
          {repository.repositoryFullName}
        </a>
      </Alert>
      {repository.summary ? (
        <p className="text-sm leading-relaxed text-foreground">{repository.summary}</p>
      ) : null}
      {warnings.length > 0 ? (
        <Alert tone="warning" title="Repository warnings">
          <ul className="list-disc space-y-1 pl-4">
            {warnings.map((warning) => (
              <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}

export function getStepperActiveId(step: WizardStep): string {
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

export function isWizardStep(value: string): value is WizardStep {
  return [
    "project",
    "github",
    "schema-choose",
    "schema-paste",
    "schema-upload",
    "schema-mongodb",
    "review"
  ].includes(value);
}
