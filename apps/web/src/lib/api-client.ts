import type {
  AuthRequest,
  AuthResponse,
  AccountMessageResponse,
  AccountProfileResponse,
  ChangePasswordRequest,
  DeleteAccountRequest,
  DeleteAccountResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LogoutResponse,
  RegistrationOtpRequest,
  RegistrationOtpResponse,
  ResetPasswordRequest,
  UpdateAccountProfileRequest,
  VerifyEmailChangeRequest,
  VerifyRegistrationOtpRequest,
  ParseSchemaRequest,
  ParseSchemaResponse,
  MongoConnectionTestResponse,
  MongoSchemaDiscoveryRequest,
  MongoSchemaDiscoveryResponse,
  CurrentUserResponse,
  ListProjectsResponse,
  ProjectHistoryResponse,
  ProjectDetailResponse,
  RemoveRepositoryContextResponse,
  StartRepositoryContextAuthorizationRequest,
  StartRepositoryContextAuthorizationResponse,
  UpdateProjectRequest,
  UpdateProjectContextRequest,
  UpdateProjectContextResponse,
  UpdateProjectResponse,
  DeleteProjectRequest,
  DeleteProjectResponse,
  RestoreProjectResponse,
  UpdateProjectSchemaRequest,
  UpdateProjectSchemaResponse,
  DeleteProjectSchemaRequest,
  DeleteProjectSchemaResponse,
  RestoreProjectSchemaResponse,
  GenerateSeedDataRequest,
  GenerateSeedDataResponse,
  RefineGeneratedDatasetRequest,
  RefineGeneratedDatasetResponse,
  Project
} from "@testseed/types";

import { AuthenticationError } from "@/src/lib/auth-session.shared";
import { notifySessionExpired } from "@/src/lib/auth-session";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export { AuthenticationError } from "@/src/lib/auth-session.shared";

export async function requestRegistrationOtp(
  request: RegistrationOtpRequest
): Promise<RegistrationOtpResponse> {
  return postJson<RegistrationOtpRequest, RegistrationOtpResponse>(
    "/auth/register/request-otp",
    request
  );
}

export async function verifyRegistrationOtp(
  request: VerifyRegistrationOtpRequest
): Promise<AuthResponse> {
  return postAuth("/auth/register/verify-otp", request);
}

export async function login(request: AuthRequest): Promise<AuthResponse> {
  return postAuth("/auth/login", request);
}

export async function logout(token: string): Promise<LogoutResponse> {
  return postJson<undefined, LogoutResponse>("/auth/logout", undefined, token);
}

export async function getCurrentUser(token: string): Promise<CurrentUserResponse> {
  const response = await getJson<CurrentUserResponse>("/auth/me", token);
  return {
    user: response.user ? toAuthUser(response.user) : null
  };
}

export async function updateProfile(
  request: UpdateAccountProfileRequest,
  token: string
): Promise<AccountProfileResponse> {
  const response = await patchJson<UpdateAccountProfileRequest, AccountProfileResponse>(
    "/auth/me",
    request,
    token
  );

  return {
    ...response,
    user: toAuthUser(response.user)
  };
}

export async function verifyEmailChange(
  request: VerifyEmailChangeRequest,
  token: string
): Promise<AccountProfileResponse> {
  const response = await postJson<VerifyEmailChangeRequest, AccountProfileResponse>(
    "/auth/me/email/verify",
    request,
    token
  );

  return {
    ...response,
    user: toAuthUser(response.user)
  };
}

export async function changePassword(
  request: ChangePasswordRequest,
  token: string
): Promise<AccountMessageResponse> {
  return postJson<ChangePasswordRequest, AccountMessageResponse>(
    "/auth/me/password",
    request,
    token
  );
}

export async function forgotPassword(
  request: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> {
  return postJson<ForgotPasswordRequest, ForgotPasswordResponse>(
    "/auth/password/forgot",
    request
  );
}

export async function resetPassword(
  request: ResetPasswordRequest
): Promise<AccountMessageResponse> {
  return postJson<ResetPasswordRequest, AccountMessageResponse>(
    "/auth/password/reset",
    request
  );
}

export async function deleteAccount(
  request: DeleteAccountRequest,
  token: string
): Promise<DeleteAccountResponse> {
  const response = await deleteJson<DeleteAccountRequest, DeleteAccountResponse>(
    "/auth/me",
    request,
    token
  );

  return {
    ...response,
    deactivatedAt: new Date(response.deactivatedAt),
    scheduledDeletionAt: new Date(response.scheduledDeletionAt)
  };
}

export async function createProject(
  request: { name: string; description?: string },
  token: string
): Promise<{ project: Project }> {
  return postJson<typeof request, { project: Project }>("/projects", request, token);
}

export async function listProjects(
  token: string,
  options: { includeArchived?: boolean } = {}
): Promise<ListProjectsResponse> {
  const query = options.includeArchived ? "?includeArchived=true" : "";
  const response = await getJson<ListProjectsResponse>(`/projects${query}`, token);
  return {
    projects: response.projects.map(toProject)
  };
}

export async function updateProject(
  projectId: string,
  request: UpdateProjectRequest,
  token: string
): Promise<UpdateProjectResponse> {
  const response = await patchJson<UpdateProjectRequest, UpdateProjectResponse>(
    `/projects/${encodeURIComponent(projectId)}`,
    request,
    token
  );

  return {
    project: toProject(response.project)
  };
}

export async function updateProjectContext(
  projectId: string,
  request: UpdateProjectContextRequest,
  token: string
): Promise<UpdateProjectContextResponse> {
  const response = await putJson<UpdateProjectContextRequest, UpdateProjectContextResponse>(
    `/projects/${encodeURIComponent(projectId)}/context`,
    request,
    token
  );

  return {
    project: toProject(response.project)
  };
}

export async function startRepositoryContextAuthorization(
  projectId: string,
  request: StartRepositoryContextAuthorizationRequest,
  token: string
): Promise<StartRepositoryContextAuthorizationResponse> {
  return postJson<
    StartRepositoryContextAuthorizationRequest,
    StartRepositoryContextAuthorizationResponse
  >(`/projects/${encodeURIComponent(projectId)}/context/github/authorize`, request, token);
}

export async function removeRepositoryContext(
  projectId: string,
  token: string
): Promise<RemoveRepositoryContextResponse> {
  const response = await deleteJson<undefined, RemoveRepositoryContextResponse>(
    `/projects/${encodeURIComponent(projectId)}/context/github`,
    undefined,
    token
  );

  return {
    context: {
      ...response.context,
      updatedAt: new Date(response.context.updatedAt),
      repository: response.context.repository
        ? {
            ...response.context.repository,
            connectedAt: new Date(response.context.repository.connectedAt)
          }
        : undefined
    }
  };
}

export async function deleteProject(
  projectId: string,
  request: DeleteProjectRequest,
  token: string
): Promise<DeleteProjectResponse> {
  const response = await deleteJson<DeleteProjectRequest, DeleteProjectResponse>(
    `/projects/${encodeURIComponent(projectId)}`,
    request,
    token
  );

  return {
    ...response,
    project: response.project ? toProject(response.project) : undefined
  };
}

export async function restoreProject(
  projectId: string,
  token: string
): Promise<RestoreProjectResponse> {
  const response = await patchJson<undefined, RestoreProjectResponse>(
    `/projects/${encodeURIComponent(projectId)}/restore`,
    undefined,
    token
  );

  return {
    project: toProject(response.project)
  };
}

export async function getProjectDetail(
  projectId: string,
  token: string
): Promise<ProjectDetailResponse> {
  const response = await getJson<ProjectDetailResponse>(
    `/projects/${encodeURIComponent(projectId)}`,
    token
  );

  return {
    project: response.project ? toProject(response.project) : null,
    activeSchemaSnapshot: response.activeSchemaSnapshot
      ? {
          ...response.activeSchemaSnapshot,
          createdAt: new Date(response.activeSchemaSnapshot.createdAt),
          archivedAt: response.activeSchemaSnapshot.archivedAt
            ? new Date(response.activeSchemaSnapshot.archivedAt)
            : undefined
        }
      : undefined
  };
}

export async function listProjectHistory(
  projectId: string,
  token: string
): Promise<ProjectHistoryResponse> {
  const response = await getJson<ProjectHistoryResponse>(
    `/projects/${encodeURIComponent(projectId)}/history`,
    token
  );

  return {
    project: response.project ? toProject(response.project) : null,
    events: response.events.map((event) => ({
      ...event,
      createdAt: new Date(event.createdAt)
    })),
    seedBatches: response.seedBatches.map((batch) => ({
      ...batch,
      createdAt: new Date(batch.createdAt),
      rolledBackAt: batch.rolledBackAt ? new Date(batch.rolledBackAt) : undefined
    }))
  };
}

export async function updateProjectSchema(
  projectId: string,
  request: UpdateProjectSchemaRequest,
  token: string
): Promise<UpdateProjectSchemaResponse> {
  const response = await putJson<UpdateProjectSchemaRequest, UpdateProjectSchemaResponse>(
    `/projects/${encodeURIComponent(projectId)}/schema`,
    request,
    token
  );

  return {
    project: toProject(response.project),
    snapshot: {
      ...response.snapshot,
      createdAt: new Date(response.snapshot.createdAt),
      archivedAt: response.snapshot.archivedAt
        ? new Date(response.snapshot.archivedAt)
        : undefined
    }
  };
}

export async function deleteProjectSchema(
  projectId: string,
  request: DeleteProjectSchemaRequest,
  token: string
): Promise<DeleteProjectSchemaResponse> {
  const response = await deleteJson<DeleteProjectSchemaRequest, DeleteProjectSchemaResponse>(
    `/projects/${encodeURIComponent(projectId)}/schema`,
    request,
    token
  );

  return {
    ...response,
    project: toProject(response.project)
  };
}

export async function restoreProjectSchema(
  projectId: string,
  token: string
): Promise<RestoreProjectSchemaResponse> {
  const response = await patchJson<undefined, RestoreProjectSchemaResponse>(
    `/projects/${encodeURIComponent(projectId)}/schema/restore`,
    undefined,
    token
  );

  return {
    project: toProject(response.project),
    snapshot: response.snapshot
      ? {
          ...response.snapshot,
          createdAt: new Date(response.snapshot.createdAt),
          archivedAt: response.snapshot.archivedAt
            ? new Date(response.snapshot.archivedAt)
            : undefined
        }
      : undefined
  };
}

export async function generateSeedData(
  projectId: string,
  request: GenerateSeedDataRequest,
  token: string
): Promise<GenerateSeedDataResponse> {
  return postJson<GenerateSeedDataRequest, GenerateSeedDataResponse>(
    `/projects/${encodeURIComponent(projectId)}/generations`,
    request,
    token
  );
}

export async function refineGeneratedDataset(
  projectId: string,
  request: RefineGeneratedDatasetRequest,
  token: string
): Promise<RefineGeneratedDatasetResponse> {
  return postJson<RefineGeneratedDatasetRequest, RefineGeneratedDatasetResponse>(
    `/projects/${encodeURIComponent(projectId)}/generations/refinements`,
    request,
    token
  );
}

export async function parseSchema(
  request: ParseSchemaRequest,
  token: string
): Promise<ParseSchemaResponse> {
  return postJson<ParseSchemaRequest, ParseSchemaResponse>(
    "/schemas/parse",
    request,
    token
  );
}

export async function testMongoConnection(
  request: MongoSchemaDiscoveryRequest,
  token: string
): Promise<MongoConnectionTestResponse> {
  return postJson<MongoSchemaDiscoveryRequest, MongoConnectionTestResponse>(
    "/schemas/mongodb/test-connection",
    request,
    token
  );
}

export async function discoverMongoSchema(
  request: MongoSchemaDiscoveryRequest,
  token: string
): Promise<MongoSchemaDiscoveryResponse> {
  return postJson<MongoSchemaDiscoveryRequest, MongoSchemaDiscoveryResponse>(
    "/schemas/mongodb/discover",
    request,
    token
  );
}

async function getJson<ResponseBody>(
  path: string,
  token?: string
): Promise<ResponseBody> {
  return requestJson<undefined, ResponseBody>("GET", path, undefined, token);
}

export function getGitHubAuthUrl(): string {
  return `${apiBaseUrl}/auth/github`;
}

async function postAuth(
  path: string,
  request: AuthRequest | VerifyRegistrationOtpRequest
): Promise<AuthResponse> {
  const authResponse = await postJson<AuthRequest | VerifyRegistrationOtpRequest, AuthResponse>(
    path,
    request
  );

  return {
    ...authResponse,
    user: toAuthUser(authResponse.user)
  };
}

async function postJson<RequestBody, ResponseBody>(
  path: string,
  request: RequestBody,
  token?: string
): Promise<ResponseBody> {
  return requestJson("POST", path, request, token);
}

async function putJson<RequestBody, ResponseBody>(
  path: string,
  request: RequestBody,
  token?: string
): Promise<ResponseBody> {
  return requestJson("PUT", path, request, token);
}

async function patchJson<RequestBody, ResponseBody>(
  path: string,
  request: RequestBody,
  token?: string
): Promise<ResponseBody> {
  return requestJson("PATCH", path, request, token);
}

async function deleteJson<RequestBody, ResponseBody>(
  path: string,
  request: RequestBody,
  token?: string
): Promise<ResponseBody> {
  return requestJson("DELETE", path, request, token);
}

async function requestJson<RequestBody, ResponseBody>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  request: RequestBody,
  token?: string
): Promise<ResponseBody> {
  let response: Response;
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: request === undefined ? undefined : JSON.stringify(request)
    });
  } catch {
    throw new Error(`Could not reach the API at ${apiBaseUrl}. Start @testseed/api and check its server logs.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${apiBaseUrl}${path}, but received ${contentType || "an unknown response type"}. Make sure the API server is running on ${apiBaseUrl}.`
    );
  }

  const body = (await response.json()) as ResponseBody | { message?: string };

  if (!response.ok) {
    const errorBody = body as {
      message?: string;
      validationResults?: Array<{ code?: string; message?: string }>;
    };
    const validationDetails =
      errorBody.validationResults
        ?.map((result) => `${result.code ?? "VALIDATION"}: ${result.message ?? ""}`.trim())
        .filter(Boolean)
        .join("\n") ?? "";

    if (response.status === 401 && token) {
      notifySessionExpired();
      throw new AuthenticationError(
        errorBody.message ?? "Your session has expired. Please sign in again."
      );
    }

    throw new Error(
      [errorBody.message ?? "Request failed", validationDetails].filter(Boolean).join("\n")
    );
  }

  return body as ResponseBody;
}

function toProject(project: Project): Project {
  return {
    ...project,
    context: project.context
      ? {
          ...project.context,
          updatedAt: new Date(project.context.updatedAt),
          repository: project.context.repository
            ? {
                ...project.context.repository,
                connectedAt: new Date(project.context.repository.connectedAt)
              }
            : undefined
        }
      : undefined,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    archivedAt: project.archivedAt ? new Date(project.archivedAt) : undefined
  };
}

function toAuthUser(user: AuthResponse["user"]): AuthResponse["user"] {
  return {
    ...user,
    createdAt: new Date(user.createdAt)
  };
}
