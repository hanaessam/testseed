export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

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
