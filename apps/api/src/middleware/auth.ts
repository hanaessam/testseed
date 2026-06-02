import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const publicAuthPaths = new Set([
  "/auth/register/request-otp",
  "/auth/register/verify-otp",
  "/auth/login",
  "/auth/github",
  "/auth/github/callback"
]);

export function requireAuth(jwtSecret: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (publicAuthPaths.has(request.path)) {
      next();
      return;
    }

    const authorization = request.header("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!token) {
      response.status(401).json({ message: "Authentication required" });
      return;
    }

    try {
      jwt.verify(token, jwtSecret);
      next();
    } catch {
      response.status(401).json({ message: "Authentication required" });
    }
  };
}
