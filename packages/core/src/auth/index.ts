import type {
  AccountMessageResponse,
  AccountProfileResponse,
  AuthRequest,
  AuthResponse,
  AuthUser,
  ChangePasswordRequest,
  DeleteAccountRequest,
  DeleteAccountResponse,
  EmailChangeVerification,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  PendingRegistration,
  PasswordResetRequest,
  PasswordValidationResult,
  RegistrationOtpRequest,
  RegistrationOtpResponse,
  ResetPasswordRequest,
  LogoutResponse,
  UpdateAccountProfileRequest,
  User,
  VerifyEmailChangeRequest,
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

export interface GetCurrentAuthUserRequest {
  userId: string;
}

export interface GetCurrentAuthUserDeps {
  findUserById(userId: string): Promise<User | null>;
}

export interface GetAccountProfileRequest {
  userId: string;
}

export interface GetAccountProfileDeps {
  findUserById(userId: string): Promise<User | null>;
}

export interface GitHubAuthorizationUrlRequest {
  clientId: string;
  callbackUrl: string;
}

export interface GitHubLoginRequest {
  email: string;
}

export interface GitHubLoginDeps {
  jwtSecret: string;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
  now?(): Date;
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

export interface EmailChangeVerificationEmailMessage {
  email: string;
  currentEmail: string;
  code: string;
  expiresAt: Date;
}

export interface PasswordResetEmailMessage {
  email: string;
  code: string;
  expiresAt: Date;
}

export interface RequestAccountProfileUpdateDeps {
  findUserById(userId: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  updateUserProfile(
    userId: string,
    input: { displayName?: string; pendingEmail?: string; updatedAt: Date }
  ): Promise<User>;
  saveEmailChangeVerification(input: EmailChangeVerification): Promise<void>;
  sendEmailChangeVerificationEmail(
    message: EmailChangeVerificationEmailMessage
  ): Promise<void>;
  generateOtp?(): string;
  now?(): Date;
  otpTtlSeconds?: number;
  otpMaxAttempts?: number;
}

export interface VerifyEmailChangeDeps {
  findUserById(userId: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  findEmailChangeVerification(userId: string): Promise<EmailChangeVerification | null>;
  consumeEmailChangeVerificationAttempt(userId: string): Promise<EmailChangeVerification | null>;
  activatePendingEmail(
    userId: string,
    input: { email: string; updatedAt: Date }
  ): Promise<User>;
  deleteEmailChangeVerification(userId: string): Promise<void>;
  now?(): Date;
}

export interface ChangePasswordDeps {
  findUserById(userId: string): Promise<User | null>;
  updatePasswordHash(
    userId: string,
    input: { passwordHash: string; updatedAt: Date }
  ): Promise<void>;
  now?(): Date;
}

export interface RequestPasswordResetDeps {
  findUserByEmail(email: string): Promise<User | null>;
  savePasswordResetRequest(input: PasswordResetRequest): Promise<void>;
  sendPasswordResetEmail(message: PasswordResetEmailMessage): Promise<void>;
  generateOtp?(): string;
  now?(): Date;
  otpTtlSeconds?: number;
  otpMaxAttempts?: number;
}

export interface CompletePasswordResetDeps {
  findUserByEmail(email: string): Promise<User | null>;
  findPasswordResetRequest(email: string): Promise<PasswordResetRequest | null>;
  consumePasswordResetAttempt(email: string): Promise<PasswordResetRequest | null>;
  updatePasswordHashByEmail(
    email: string,
    input: { passwordHash: string; updatedAt: Date }
  ): Promise<void>;
  deletePasswordResetRequest(email: string): Promise<void>;
  now?(): Date;
}

export interface DeleteAccountDeps {
  findUserById(userId: string): Promise<User | null>;
  deactivateUser(
    userId: string,
    input: { deactivatedAt: Date; scheduledDeletionAt: Date }
  ): Promise<void>;
  now?(): Date;
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
  if (!user || !isActiveUser(user)) {
    throw invalidCredentials();
  }

  const passwordMatches = await bcrypt.compare(request.password, user.passwordHash);
  if (!passwordMatches) {
    throw invalidCredentials();
  }

  return toAuthResponse(user, deps.jwtSecret);
}

export async function resolveGitHubLogin(
  request: GitHubLoginRequest,
  deps: GitHubLoginDeps
): Promise<AuthResponse> {
  const normalizedEmail = normalizeEmail(request.email);
  if (!normalizedEmail) {
    throw new AuthError(
      "INVALID_GITHUB_EMAIL",
      400,
      "GitHub did not provide a usable email address"
    );
  }

  const existingUser = await deps.findUserByEmail(normalizedEmail);
  if (existingUser) {
    if (!isActiveUser(existingUser)) {
      throw invalidCredentials();
    }
    return toAuthResponse(existingUser, deps.jwtSecret);
  }

  const createdAt = deps.now?.() ?? new Date();
  const passwordHash = await bcrypt.hash(
    `github-oauth:${normalizedEmail}:${createdAt.toISOString()}`,
    10
  );
  const user = await deps.createUser({
    email: normalizedEmail,
    passwordHash,
    createdAt
  });

  return toAuthResponse(user, deps.jwtSecret);
}

export function logoutUser(): LogoutResponse {
  return {
    message: "Logged out"
  };
}

export async function getCurrentAuthUser(
  request: GetCurrentAuthUserRequest,
  deps: GetCurrentAuthUserDeps
): Promise<{ user: AuthUser | null }> {
  const user = await deps.findUserById(request.userId);

  return {
    user: user && isActiveUser(user) ? toAuthUser(user) : null
  };
}

export async function getAccountProfile(
  request: GetAccountProfileRequest,
  deps: GetAccountProfileDeps
): Promise<AccountProfileResponse> {
  const user = await getActiveUser(request.userId, deps.findUserById);

  return {
    user: toAuthUser(user)
  };
}

export async function requestAccountProfileUpdate(
  request: UpdateAccountProfileRequest & { userId: string },
  deps: RequestAccountProfileUpdateDeps
): Promise<AccountProfileResponse> {
  const user = await getActiveUser(request.userId, deps.findUserById);
  const now = deps.now?.() ?? new Date();
  const displayName = request.displayName?.trim();
  const normalizedEmail = request.email ? normalizeEmail(request.email) : undefined;
  let updatedUser = user;

  if (normalizedEmail && normalizedEmail !== user.email) {
    const existingUser = await deps.findUserByEmail(normalizedEmail);
    if (existingUser && existingUser.id !== user.id) {
      throw new AuthError("DUPLICATE_EMAIL", 409, "Email is already registered");
    }

    const code = deps.generateOtp?.() ?? generateSixDigitOtp();
    const otpTtlSeconds = deps.otpTtlSeconds ?? 600;
    const attemptsRemaining = deps.otpMaxAttempts ?? 5;
    const expiresAt = new Date(now.getTime() + otpTtlSeconds * 1000);
    const verificationCodeHash = await bcrypt.hash(code, 10);

    updatedUser = await deps.updateUserProfile(user.id, {
      displayName,
      pendingEmail: normalizedEmail,
      updatedAt: now
    });

    await deps.saveEmailChangeVerification({
      userId: user.id,
      currentEmail: user.email,
      pendingEmail: normalizedEmail,
      verificationCodeHash,
      expiresAt,
      attemptsRemaining,
      createdAt: now
    });
    await deps.sendEmailChangeVerificationEmail({
      email: normalizedEmail,
      currentEmail: user.email,
      code,
      expiresAt
    });
  } else if (displayName !== undefined) {
    updatedUser = await deps.updateUserProfile(user.id, {
      displayName,
      updatedAt: now
    });
  }

  return {
    user: toAuthUser(updatedUser)
  };
}

export async function verifyEmailChange(
  request: VerifyEmailChangeRequest & { userId: string },
  deps: VerifyEmailChangeDeps
): Promise<AccountProfileResponse> {
  const user = await getActiveUser(request.userId, deps.findUserById);
  if (!/^\d{6}$/.test(request.code)) {
    throw invalidEmailVerificationCode();
  }

  const verification = await deps.findEmailChangeVerification(user.id);
  const now = deps.now?.() ?? new Date();
  if (!verification || verification.expiresAt.getTime() <= now.getTime()) {
    await deps.deleteEmailChangeVerification(user.id);
    throw new AuthError(
      "EMAIL_VERIFICATION_EXPIRED",
      400,
      "Email verification code is invalid or expired"
    );
  }

  if (verification.attemptsRemaining <= 0) {
    throw new AuthError("EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED", 429, "Too many verification attempts");
  }

  const attempted = await deps.consumeEmailChangeVerificationAttempt(user.id);
  if (!attempted) {
    throw invalidEmailVerificationCode();
  }

  const matches = await bcrypt.compare(request.code, attempted.verificationCodeHash);
  if (!matches) {
    if (attempted.attemptsRemaining <= 0) {
      throw new AuthError("EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED", 429, "Too many verification attempts");
    }
    throw invalidEmailVerificationCode();
  }

  const existingUser = await deps.findUserByEmail(attempted.pendingEmail);
  if (existingUser && existingUser.id !== user.id) {
    throw new AuthError("DUPLICATE_EMAIL", 409, "Email is already registered");
  }

  const updatedUser = await deps.activatePendingEmail(user.id, {
    email: attempted.pendingEmail,
    updatedAt: now
  });
  await deps.deleteEmailChangeVerification(user.id);

  return {
    user: toAuthUser(updatedUser)
  };
}

export async function changePassword(
  request: ChangePasswordRequest & { userId: string },
  deps: ChangePasswordDeps
): Promise<AccountMessageResponse> {
  const user = await getActiveUser(request.userId, deps.findUserById);
  const currentMatches = await bcrypt.compare(request.currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new AuthError("INVALID_CURRENT_PASSWORD", 401, "Current password is incorrect");
  }

  const newPasswordReusesCurrent = await bcrypt.compare(request.newPassword, user.passwordHash);
  if (newPasswordReusesCurrent) {
    throw new AuthError("PASSWORD_REUSED", 400, "New password must be different");
  }

  const passwordValidation = validatePassword(request.newPassword, request.confirmPassword);
  if (!passwordValidation.valid) {
    throw new AuthError("WEAK_PASSWORD", 400, "Password does not meet security requirements");
  }

  const passwordHash = await bcrypt.hash(request.newPassword, 10);
  await deps.updatePasswordHash(user.id, {
    passwordHash,
    updatedAt: deps.now?.() ?? new Date()
  });

  return {
    message: "Password updated"
  };
}

export async function requestPasswordReset(
  request: ForgotPasswordRequest,
  deps: RequestPasswordResetDeps
): Promise<ForgotPasswordResponse> {
  const normalizedEmail = normalizeEmail(request.email);
  const message = "If an account exists for that email, a reset code has been sent.";
  const otpTtlSeconds = deps.otpTtlSeconds ?? 600;

  if (!normalizedEmail) {
    return {
      message,
      expiresInSeconds: otpTtlSeconds
    };
  }

  const user = await deps.findUserByEmail(normalizedEmail);
  if (!user || !isActiveUser(user)) {
    return {
      message,
      expiresInSeconds: otpTtlSeconds
    };
  }

  const code = deps.generateOtp?.() ?? generateSixDigitOtp();
  const attemptsRemaining = deps.otpMaxAttempts ?? 5;
  const now = deps.now?.() ?? new Date();
  const expiresAt = new Date(now.getTime() + otpTtlSeconds * 1000);
  const resetCodeHash = await bcrypt.hash(code, 10);

  await deps.savePasswordResetRequest({
    email: normalizedEmail,
    resetCodeHash,
    expiresAt,
    attemptsRemaining,
    createdAt: now
  });
  await deps.sendPasswordResetEmail({
    email: normalizedEmail,
    code,
    expiresAt
  });

  return {
    message,
    expiresInSeconds: otpTtlSeconds
  };
}

export async function completePasswordReset(
  request: ResetPasswordRequest,
  deps: CompletePasswordResetDeps
): Promise<AccountMessageResponse> {
  const normalizedEmail = normalizeEmail(request.email);
  if (!normalizedEmail || !/^\d{6}$/.test(request.code)) {
    throw invalidResetCode();
  }

  const passwordValidation = validatePassword(request.newPassword, request.confirmPassword);
  if (!passwordValidation.valid) {
    throw new AuthError("WEAK_PASSWORD", 400, "Password does not meet security requirements");
  }

  const user = await deps.findUserByEmail(normalizedEmail);
  if (!user || !isActiveUser(user)) {
    throw resetCodeExpired();
  }

  const reset = await deps.findPasswordResetRequest(normalizedEmail);
  const now = deps.now?.() ?? new Date();
  if (!reset || reset.usedAt || reset.expiresAt.getTime() <= now.getTime()) {
    await deps.deletePasswordResetRequest(normalizedEmail);
    throw resetCodeExpired();
  }

  if (reset.attemptsRemaining <= 0) {
    throw new AuthError("RESET_ATTEMPTS_EXCEEDED", 429, "Too many reset attempts");
  }

  const attempted = await deps.consumePasswordResetAttempt(normalizedEmail);
  if (!attempted) {
    throw invalidResetCode();
  }

  const matches = await bcrypt.compare(request.code, attempted.resetCodeHash);
  if (!matches) {
    if (attempted.attemptsRemaining <= 0) {
      throw new AuthError("RESET_ATTEMPTS_EXCEEDED", 429, "Too many reset attempts");
    }
    throw invalidResetCode();
  }

  const passwordReusesCurrent = await bcrypt.compare(request.newPassword, user.passwordHash);
  if (passwordReusesCurrent) {
    throw new AuthError("PASSWORD_REUSED", 400, "New password must be different");
  }

  await deps.updatePasswordHashByEmail(normalizedEmail, {
    passwordHash: await bcrypt.hash(request.newPassword, 10),
    updatedAt: now
  });
  await deps.deletePasswordResetRequest(normalizedEmail);

  return {
    message: "Password reset complete"
  };
}

export async function deleteAccount(
  request: DeleteAccountRequest & { userId: string },
  deps: DeleteAccountDeps
): Promise<DeleteAccountResponse> {
  const user = await getActiveUser(request.userId, deps.findUserById);
  if (request.confirmationPhrase !== "DELETE") {
    throw new AuthError("INVALID_CONFIRMATION_PHRASE", 400, "Confirmation phrase must be DELETE");
  }

  const passwordMatches = await bcrypt.compare(request.currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw new AuthError("INVALID_CURRENT_PASSWORD", 401, "Current password is incorrect");
  }

  const deactivatedAt = deps.now?.() ?? new Date();
  const scheduledDeletionAt = new Date(deactivatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  await deps.deactivateUser(user.id, {
    deactivatedAt,
    scheduledDeletionAt
  });

  return {
    message: "Account deactivated and scheduled for permanent deletion.",
    deactivatedAt,
    scheduledDeletionAt
  };
}

export function createGitHubAuthorizationUrl(
  request: GitHubAuthorizationUrlRequest
): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", request.clientId);
  url.searchParams.set("redirect_uri", request.callbackUrl);
  url.searchParams.set("scope", "read:user user:email");

  return url.toString();
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

async function getActiveUser(
  userId: string,
  findUserById: (userId: string) => Promise<User | null>
): Promise<User> {
  const user = await findUserById(userId);
  if (!user || !isActiveUser(user)) {
    throw new AuthError("ACCOUNT_NOT_FOUND", 404, "Account not found");
  }

  return user;
}

function isActiveUser(user: User): boolean {
  return (user.status ?? "active") === "active";
}

function invalidEmailVerificationCode(): AuthError {
  return new AuthError(
    "INVALID_EMAIL_VERIFICATION_CODE",
    400,
    "Email verification code is invalid or expired"
  );
}

function invalidResetCode(): AuthError {
  return new AuthError("INVALID_RESET_CODE", 400, "Invalid or expired reset code");
}

function resetCodeExpired(): AuthError {
  return new AuthError("RESET_CODE_EXPIRED", 400, "Invalid or expired reset code");
}

function toAuthResponse(user: User, jwtSecret: string): AuthResponse {
  const token = jwt.sign(
    {
      email: user.email
    },
    jwtSecret,
    {
      subject: user.id,
      expiresIn: "7d"
    }
  );

  return {
    token,
    user: toAuthUser(user)
  };
}

function toAuthUser(user: User): AuthUser {
  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt
  };

  if (user.displayName !== undefined) {
    authUser.displayName = user.displayName;
  }

  if (user.pendingEmail !== undefined) {
    authUser.pendingEmail = user.pendingEmail;
  }

  if (user.status !== undefined) {
    authUser.status = user.status;
    authUser.emailVerificationPending = Boolean(user.pendingEmail);
  }

  return authUser;
}
