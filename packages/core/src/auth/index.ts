import type {
  AuthRequest,
  AuthResponse,
  PendingRegistration,
  PasswordValidationResult,
  RegistrationOtpRequest,
  RegistrationOtpResponse,
  LogoutResponse,
  User,
  VerifyRegistrationOtpRequest
} from "@testseed/types";
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

export interface SavePendingRegistrationInput extends PendingRegistration {}

export interface RegistrationOtpEmailMessage {
  email: string;
  otp: string;
  expiresAt: Date;
}

export interface RequestRegistrationOtpDeps {
  findUserByEmail(email: string): Promise<User | null>;
  savePendingRegistration(input: SavePendingRegistrationInput): Promise<void>;
  sendRegistrationOtpEmail(message: RegistrationOtpEmailMessage): Promise<void>;
  generateOtp?(): string;
  now?(): Date;
  otpTtlSeconds?: number;
  otpMaxAttempts?: number;
}

export interface VerifyRegistrationOtpDeps {
  jwtSecret: string;
  findUserByEmail(email: string): Promise<User | null>;
  findPendingRegistration(email: string): Promise<PendingRegistration | null>;
  consumePendingRegistrationAttempt(email: string): Promise<PendingRegistration | null>;
  deletePendingRegistration(email: string): Promise<void>;
  createUser(input: CreateUserInput): Promise<User>;
  now?(): Date;
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

export function validatePassword(
  password: string,
  confirmPassword = password
): PasswordValidationResult {
  const rules = [
    {
      id: "minLength" as const,
      label: "At least 12 characters",
      passed: password.length >= 12
    },
    {
      id: "uppercase" as const,
      label: "One uppercase letter",
      passed: /[A-Z]/.test(password)
    },
    {
      id: "lowercase" as const,
      label: "One lowercase letter",
      passed: /[a-z]/.test(password)
    },
    {
      id: "number" as const,
      label: "One number",
      passed: /\d/.test(password)
    },
    {
      id: "special" as const,
      label: "One special character",
      passed: /[^A-Za-z0-9]/.test(password)
    },
    {
      id: "match" as const,
      label: "Passwords match",
      passed: password.length > 0 && password === confirmPassword
    }
  ];

  return {
    valid: rules.every((rule) => rule.passed),
    rules
  };
}

export async function requestRegistrationOtp(
  request: RegistrationOtpRequest,
  deps: RequestRegistrationOtpDeps
): Promise<RegistrationOtpResponse> {
  const normalizedEmail = normalizeEmail(request.email);
  assertValidAuthRequest(normalizedEmail, request.password);

  const passwordValidation = validatePassword(request.password, request.confirmPassword);
  if (!passwordValidation.valid) {
    throw new AuthError("WEAK_PASSWORD", 400, "Password does not meet security requirements");
  }

  const existingUser = await deps.findUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new AuthError("DUPLICATE_EMAIL", 400, "Email is already registered");
  }

  const otp = deps.generateOtp?.() ?? generateSixDigitOtp();
  const otpTtlSeconds = deps.otpTtlSeconds ?? 600;
  const attemptsRemaining = deps.otpMaxAttempts ?? 5;
  const now = deps.now?.() ?? new Date();
  const expiresAt = new Date(now.getTime() + otpTtlSeconds * 1000);
  const [passwordHash, otpHash] = await Promise.all([
    bcrypt.hash(request.password, 10),
    bcrypt.hash(otp, 10)
  ]);

  await deps.savePendingRegistration({
    email: normalizedEmail,
    passwordHash,
    otpHash,
    expiresAt,
    attemptsRemaining
  });

  await deps.sendRegistrationOtpEmail({
    email: normalizedEmail,
    otp,
    expiresAt
  });

  return {
    email: normalizedEmail,
    expiresInSeconds: otpTtlSeconds,
    message: "Verification code sent"
  };
}

export async function verifyRegistrationOtp(
  request: VerifyRegistrationOtpRequest,
  deps: VerifyRegistrationOtpDeps
): Promise<AuthResponse> {
  const normalizedEmail = normalizeEmail(request.email);
  if (!normalizedEmail || !/^\d{6}$/.test(request.otp)) {
    throw invalidOtp();
  }

  const existingUser = await deps.findUserByEmail(normalizedEmail);
  if (existingUser) {
    await deps.deletePendingRegistration(normalizedEmail);
    throw new AuthError("DUPLICATE_EMAIL", 400, "Email is already registered");
  }

  const pending = await deps.findPendingRegistration(normalizedEmail);
  if (!pending) {
    throw expiredOtp();
  }

  const now = deps.now?.() ?? new Date();
  if (pending.expiresAt.getTime() <= now.getTime()) {
    await deps.deletePendingRegistration(normalizedEmail);
    throw expiredOtp();
  }

  if (pending.attemptsRemaining <= 0) {
    throw new AuthError("OTP_ATTEMPTS_EXCEEDED", 429, "Too many verification attempts");
  }

  const attempted = await deps.consumePendingRegistrationAttempt(normalizedEmail);
  if (!attempted) {
    throw expiredOtp();
  }

  const otpMatches = await bcrypt.compare(request.otp, attempted.otpHash);
  if (!otpMatches) {
    if (attempted.attemptsRemaining <= 0) {
      throw new AuthError("OTP_ATTEMPTS_EXCEEDED", 429, "Too many verification attempts");
    }
    throw invalidOtp();
  }

  const user = await deps.createUser({
    email: attempted.email,
    passwordHash: attempted.passwordHash,
    createdAt: now
  });
  await deps.deletePendingRegistration(normalizedEmail);

  return toAuthResponse(user, deps.jwtSecret);
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

export function logoutUser(): LogoutResponse {
  return {
    message: "Logged out"
  };
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

function invalidOtp(): AuthError {
  return new AuthError("INVALID_OTP", 400, "Invalid or expired verification code");
}

function expiredOtp(): AuthError {
  return new AuthError("OTP_EXPIRED", 400, "Invalid or expired verification code");
}

function generateSixDigitOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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
