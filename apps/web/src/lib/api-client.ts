import type {
  AuthRequest,
  AuthResponse,
  LogoutResponse,
  RegistrationOtpRequest,
  RegistrationOtpResponse,
  VerifyRegistrationOtpRequest,
  ParseSchemaRequest,
  ParseSchemaResponse
} from "@testseed/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
    user: {
      ...authResponse.user,
      createdAt: new Date(authResponse.user.createdAt)
    }
  };
}

async function postJson<RequestBody, ResponseBody>(
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
      method: "POST",
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
    const errorBody = body as { message?: string };
    throw new Error(errorBody.message ?? "Authentication failed");
  }

  return body as ResponseBody;
}
