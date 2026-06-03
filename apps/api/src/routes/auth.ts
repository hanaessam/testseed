import {
  AuthError,
  createGitHubAuthorizationUrl,
  getCurrentAuthUser,
  loginUser,
  logoutUser,
  requestRegistrationOtp,
  resolveGitHubLogin,
  verifyRegistrationOtp,
  type RegistrationOtpEmailMessage
} from "@testseed/core";
import type { createRegistrationOtpCache, createUserRepository } from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { type AuthenticatedRequest } from "../middleware/auth";

type UserRepository = ReturnType<typeof createUserRepository>;
type RegistrationOtpCache = ReturnType<typeof createRegistrationOtpCache>;

const authRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const requestRegistrationOtpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  confirmPassword: z.string().min(1)
});

const verifyRegistrationOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/)
});

export interface AuthRouterConfig {
  jwtSecret: string;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  webAppUrl?: string;
}

interface GitHubAccessTokenResponse {
  access_token?: string;
}

interface GitHubEmailResponse {
  email?: string;
  primary?: boolean;
  verified?: boolean;
}

export function createAuthRouter(
  userRepository: UserRepository,
  registrationOtpCache: RegistrationOtpCache,
  sendRegistrationOtpEmail: (message: RegistrationOtpEmailMessage) => Promise<void>,
  config: AuthRouterConfig
): Router {
  const router = Router();

  router.get("/github", (_request: Request, response: Response, next: NextFunction) => {
    try {
      if (!config.githubClientId || !config.githubCallbackUrl) {
        throw new AuthError(
          "GITHUB_OAUTH_NOT_CONFIGURED",
          503,
          "GitHub login is not configured"
        );
      }

      response.redirect(
        createGitHubAuthorizationUrl({
          clientId: config.githubClientId,
          callbackUrl: config.githubCallbackUrl
        })
      );
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/github/callback",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const query = z.object({ code: z.string().min(1) }).parse(request.query);

        if (!config.githubClientId || !config.githubClientSecret || !config.githubCallbackUrl) {
          throw new AuthError(
            "GITHUB_OAUTH_NOT_CONFIGURED",
            503,
            "GitHub login is not configured"
          );
        }

        const accessToken = await exchangeGitHubCodeForToken(query.code, {
          clientId: config.githubClientId,
          clientSecret: config.githubClientSecret,
          callbackUrl: config.githubCallbackUrl
        });
        const email = await fetchGitHubEmail(accessToken);
        const authResponse = await resolveGitHubLogin(
          { email },
          {
            jwtSecret: config.jwtSecret,
            findUserByEmail: userRepository.findUserByEmail,
            createUser: userRepository.createUser
          }
        );

        const redirectUrl = new URL("/auth/github/callback", config.webAppUrl ?? "http://localhost:3000");
        redirectUrl.searchParams.set("token", authResponse.token);
        response.redirect(redirectUrl.toString());
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/register/request-otp",
    validateBody(requestRegistrationOtpSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const result = await requestRegistrationOtp(request.body, {
          findUserByEmail: userRepository.findUserByEmail,
          savePendingRegistration: registrationOtpCache.savePendingRegistration,
          sendRegistrationOtpEmail,
          otpTtlSeconds: config.otpTtlSeconds,
          otpMaxAttempts: config.otpMaxAttempts
        });
        response.status(202).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/register/verify-otp",
    validateBody(verifyRegistrationOtpSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const result = await verifyRegistrationOtp(request.body, {
          jwtSecret: config.jwtSecret,
          findUserByEmail: userRepository.findUserByEmail,
          findPendingRegistration: registrationOtpCache.findPendingRegistration,
          consumePendingRegistrationAttempt:
            registrationOtpCache.consumePendingRegistrationAttempt,
          deletePendingRegistration: registrationOtpCache.deletePendingRegistration,
          createUser: userRepository.createUser
        });
        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/login",
    validateBody(authRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const result = await loginUser(request.body, {
          jwtSecret: config.jwtSecret,
          findUserByEmail: userRepository.findUserByEmail
        });
        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/logout",
    (_request: Request, response: Response) => {
      response.status(200).json(logoutUser());
    }
  );

  router.get("/me", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      if (!authenticatedRequest.auth) {
        response.status(401).json({ message: "Authentication required" });
        return;
      }

      const result = await getCurrentAuthUser(
        { userId: authenticatedRequest.auth.userId },
        { findUserById: userRepository.findUserById }
      );

      if (!result.user) {
        response.status(404).json({ message: "User not found" });
        return;
      }

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function authErrorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction
): void {
  if (error instanceof AuthError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  next(error);
}

async function exchangeGitHubCodeForToken(
  code: string,
  config: { clientId: string; clientSecret: string; callbackUrl: string }
): Promise<string> {
  const githubResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl
    })
  });

  if (!githubResponse.ok) {
    throw new AuthError("GITHUB_TOKEN_EXCHANGE_FAILED", 502, "Could not complete GitHub login");
  }

  const tokenResponse = (await githubResponse.json()) as GitHubAccessTokenResponse;
  if (!tokenResponse.access_token) {
    throw new AuthError("GITHUB_TOKEN_EXCHANGE_FAILED", 502, "Could not complete GitHub login");
  }

  return tokenResponse.access_token;
}

async function fetchGitHubEmail(accessToken: string): Promise<string> {
  const githubResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json"
    }
  });

  if (!githubResponse.ok) {
    throw new AuthError("GITHUB_EMAIL_FETCH_FAILED", 502, "Could not read GitHub account email");
  }

  const emails = (await githubResponse.json()) as GitHubEmailResponse[];
  const email =
    emails.find((candidate) => candidate.primary && candidate.verified)?.email ??
    emails.find((candidate) => candidate.verified)?.email;

  if (!email) {
    throw new AuthError(
      "GITHUB_EMAIL_UNAVAILABLE",
      400,
      "GitHub did not provide a usable email address"
    );
  }

  return email;
}
