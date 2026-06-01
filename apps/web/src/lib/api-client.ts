import type { AuthRequest, AuthResponse } from "@testseed/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function register(request: AuthRequest): Promise<AuthResponse> {
  return postAuth("/auth/register", request);
}

export async function login(request: AuthRequest): Promise<AuthResponse> {
  return postAuth("/auth/login", request);
}

export function getGitHubAuthUrl(): string {
  return `${apiBaseUrl}/auth/github`;
}

async function postAuth(path: string, request: AuthRequest): Promise<AuthResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });

  const body = (await response.json()) as AuthResponse | { message?: string };

  if (!response.ok) {
    throw new Error("message" in body && body.message ? body.message : "Authentication failed");
  }

  const authResponse = body as AuthResponse;
  return {
    ...authResponse,
    user: {
      ...authResponse.user,
      createdAt: new Date(authResponse.user.createdAt)
    }
  };
}
