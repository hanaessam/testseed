export type HealthStatus = "ok";

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

export interface AuthUser {
  id: string;
  email: string;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
