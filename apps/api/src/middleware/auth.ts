import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface RequestAuthContext {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: RequestAuthContext;
}

const publicAuthPaths = new Set([
  "/auth/register/request-otp",
  "/auth/register/verify-otp",
  "/auth/login",
  "/auth/github",
  "/auth/github/callback"
]);

export function requireAuth(jwtSecret: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (publicAuthPaths.has(request.path) || isPublicRepositoryContextCallback(request.path)) {
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
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      if (typeof payload.sub !== "string" || !payload.sub) {
        response.status(401).json({ message: "Authentication required" });
        return;
      }

      (request as AuthenticatedRequest).auth = {
        userId: payload.sub
      };
      next();
    } catch {
      response.status(401).json({ message: "Authentication required" });
    }
  };
}

function isPublicRepositoryContextCallback(path: string): boolean {
  return /^\/projects\/[^/]+\/context\/github\/callback$/.test(path);
}
