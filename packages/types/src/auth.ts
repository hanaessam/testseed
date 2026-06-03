export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  pendingEmail?: string;
  status?: AccountStatus;
  deactivatedAt?: Date;
  scheduledDeletionAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export type AccountStatus = "active" | "deactivated" | "deleted";

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegistrationOtpRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyRegistrationOtpRequest {
  email: string;
  otp: string;
}

export interface RegistrationOtpResponse {
  email: string;
  expiresInSeconds: number;
  message: string;
}

export interface PendingRegistration {
  email: string;
  passwordHash: string;
  otpHash: string;
  expiresAt: Date;
  attemptsRemaining: number;
}

export type PasswordRuleId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special"
  | "match";

export interface PasswordRuleResult {
  id: PasswordRuleId;
  label: string;
  passed: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  rules: PasswordRuleResult[];
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  pendingEmail?: string;
  emailVerificationPending?: boolean;
  status?: AccountStatus;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface CurrentUserResponse {
  user: AuthUser | null;
}

export type LogoutResponse = {
  message: string;
};

export interface UpdateAccountProfileRequest {
  userId?: string;
  displayName?: string;
  email?: string;
}

export interface AccountProfileResponse {
  user: AuthUser;
  message?: string;
}

export interface VerifyEmailChangeRequest {
  userId?: string;
  code: string;
}

export interface ChangePasswordRequest {
  userId?: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AccountMessageResponse {
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  expiresInSeconds: number;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DeleteAccountRequest {
  userId?: string;
  currentPassword: string;
  confirmationPhrase: string;
}

export interface DeleteAccountResponse {
  message: string;
  deactivatedAt: Date;
  scheduledDeletionAt: Date;
}

export interface EmailChangeVerification {
  userId: string;
  currentEmail: string;
  pendingEmail: string;
  verificationCodeHash: string;
  expiresAt: Date;
  attemptsRemaining: number;
  createdAt: Date;
}

export interface PasswordResetRequest {
  email: string;
  resetCodeHash: string;
  expiresAt: Date;
  attemptsRemaining: number;
  createdAt: Date;
  usedAt?: Date;
}
