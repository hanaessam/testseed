import type { AuthRequest, AuthResponse, User } from "@testseed/types";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface RegisterUserDeps {
  jwtSecret: string;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
}

export interface LoginUserDeps {
  jwtSecret: string;
  findUserByEmail(email: string): Promise<User | null>;
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function registerUser(
  request: AuthRequest,
  deps: RegisterUserDeps
): Promise<AuthResponse> {
  const normalizedEmail = normalizeEmail(request.email);
  assertValidAuthRequest(normalizedEmail, request.password);

  const existingUser = await deps.findUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new AuthError("DUPLICATE_EMAIL", 400, "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(request.password, 10);
  const user = await deps.createUser({
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date()
  });

  return toAuthResponse(user, deps.jwtSecret);
}

export async function loginUser(
  request: AuthRequest,
  deps: LoginUserDeps
): Promise<AuthResponse> {
  const normalizedEmail = normalizeEmail(request.email);
  assertValidAuthRequest(normalizedEmail, request.password);

  const user = await deps.findUserByEmail(normalizedEmail);
  if (!user) {
    throw invalidCredentials();
  }

  const passwordMatches = await bcrypt.compare(request.password, user.passwordHash);
  if (!passwordMatches) {
    throw invalidCredentials();
  }

  return toAuthResponse(user, deps.jwtSecret);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertValidAuthRequest(email: string, password: string): void {
  if (!email || !password) {
    throw new AuthError("INVALID_AUTH_REQUEST", 400, "Email and password are required");
  }
}

function invalidCredentials(): AuthError {
  return new AuthError("INVALID_CREDENTIALS", 401, "Invalid email or password");
}

function toAuthResponse(user: User, jwtSecret: string): AuthResponse {
  const token = jwt.sign(
    {
      email: user.email
    },
    jwtSecret,
    {
      subject: user.id,
      expiresIn: "1h"
    }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    }
  };
}
