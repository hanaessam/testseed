import type { ProjectEvent } from "@testseed/types";

export interface AppendProjectEventRequest {
  projectId: string;
  actorId: string;
  kind: ProjectEvent["kind"];
  message: string;
  payload?: Record<string, unknown>;
}

export interface AppendProjectEventRecordInput {
  projectId: string;
  actorId: string;
  kind: ProjectEvent["kind"];
  message: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export interface AppendProjectEventDeps {
  now?(): Date;
  appendProjectEventRecord(input: AppendProjectEventRecordInput): Promise<ProjectEvent>;
}

export async function appendProjectEvent(
  request: AppendProjectEventRequest,
  deps: AppendProjectEventDeps
): Promise<ProjectEvent> {
  const now = deps.now?.() ?? new Date();
  return deps.appendProjectEventRecord({
    projectId: request.projectId,
    actorId: request.actorId,
    kind: request.kind,
    message: request.message,
    payload: request.payload,
    createdAt: now
  });
}
