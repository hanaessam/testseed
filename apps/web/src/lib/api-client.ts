import type {
  AuthRequest,
  AuthResponse,
  RegistrationOtpRequest,
  RegistrationOtpResponse,
  VerifyRegistrationOtpRequest
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
  request: RequestBody
): Promise<ResponseBody> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });

  const body = (await response.json()) as ResponseBody | { message?: string };

  if (!response.ok) {
    const errorBody = body as { message?: string };
    throw new Error(errorBody.message ?? "Authentication failed");
  }

  return body as ResponseBody;
}
