import {
  AuthError,
  changePassword,
  createGitHubAuthorizationUrl,
  deleteAccount,
  getAccountProfile,
  getCurrentAuthUser,
  loginUser,
  logoutUser,
  requestAccountProfileUpdate,
  requestPasswordReset,
  requestRegistrationOtp,
  resolveGitHubLogin,
  completePasswordReset,
  verifyEmailChange,
  verifyRegistrationOtp,
  type EmailChangeVerificationEmailMessage,
  type PasswordResetEmailMessage,
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

const updateAccountProfileSchema = z.object({
  displayName: z.string().max(120).optional(),
  email: z.string().email().optional()
});

const verifyEmailChangeSchema = z.object({
  code: z.string().regex(/^\d{6}$/)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1)
});

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1),
  confirmationPhrase: z.literal("DELETE")
});

export interface AuthRouterConfig {
  jwtSecret: string;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  webAppUrl?: string;
  completeRepositoryContextCallback?(request: {
    code: string;
    state: string;
  }): Promise<string>;
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
  sendPasswordResetEmail: (message: PasswordResetEmailMessage) => Promise<void>,
  sendEmailChangeVerificationEmail: (
    message: EmailChangeVerificationEmailMessage
  ) => Promise<void>,
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
        const query = z.object({
          code: z.string().min(1),
          state: z.string().min(1).optional()
        }).parse(request.query);

        if (!config.githubClientId || !config.githubClientSecret || !config.githubCallbackUrl) {
          throw new AuthError(
            "GITHUB_OAUTH_NOT_CONFIGURED",
            503,
            "GitHub login is not configured"
          );
        }

        if (query.state && config.completeRepositoryContextCallback) {
          const redirectUrl = await config.completeRepositoryContextCallback({
            code: query.code,
            state: query.state
          });
          response.redirect(redirectUrl);
          return;
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
    "/password/forgot",
    validateBody(forgotPasswordSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const result = await requestPasswordReset(request.body, {
          findUserByEmail: userRepository.findUserByEmail,
          savePasswordResetRequest: userRepository.savePasswordResetRequest,
          sendPasswordResetEmail,
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
    "/password/reset",
    validateBody(resetPasswordSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const result = await completePasswordReset(request.body, {
          findUserByEmail: userRepository.findUserByEmail,
          findPasswordResetRequest: userRepository.findPasswordResetRequest,
          consumePasswordResetAttempt: userRepository.consumePasswordResetAttempt,
          updatePasswordHashByEmail: userRepository.updatePasswordHashByEmail,
          deletePasswordResetRequest: userRepository.deletePasswordResetRequest
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
      const userId = requireAuthenticatedUserId(request, response);
      if (!userId) return;

      const result = await getCurrentAuthUser(
        { userId },
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

  router.patch(
    "/me",
    validateBody(updateAccountProfileSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const userId = requireAuthenticatedUserId(request, response);
        if (!userId) return;

        const result = await requestAccountProfileUpdate(
          { ...request.body, userId },
          {
            findUserById: userRepository.findUserById,
            findUserByEmail: userRepository.findUserByEmail,
            updateUserProfile: userRepository.updateUserProfile,
            saveEmailChangeVerification: userRepository.saveEmailChangeVerification,
            sendEmailChangeVerificationEmail,
            otpTtlSeconds: config.otpTtlSeconds,
            otpMaxAttempts: config.otpMaxAttempts
          }
        );
        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/me/email/verify",
    validateBody(verifyEmailChangeSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const userId = requireAuthenticatedUserId(request, response);
        if (!userId) return;

        const result = await verifyEmailChange(
          { ...request.body, userId },
          {
            findUserById: userRepository.findUserById,
            findUserByEmail: userRepository.findUserByEmail,
            findEmailChangeVerification: userRepository.findEmailChangeVerification,
            consumeEmailChangeVerificationAttempt:
              userRepository.consumeEmailChangeVerificationAttempt,
            activatePendingEmail: userRepository.activatePendingEmail,
            deleteEmailChangeVerification: userRepository.deleteEmailChangeVerification
          }
        );
        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/me/password",
    validateBody(changePasswordSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const userId = requireAuthenticatedUserId(request, response);
        if (!userId) return;

        const result = await changePassword(
          { ...request.body, userId },
          {
            findUserById: userRepository.findUserById,
            updatePasswordHash: userRepository.updatePasswordHash
          }
        );
        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    "/me",
    validateBody(deleteAccountSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const userId = requireAuthenticatedUserId(request, response);
        if (!userId) return;

        const result = await deleteAccount(
          { ...request.body, userId },
          {
            findUserById: userRepository.findUserById,
            deactivateUser: userRepository.deactivateUser
          }
        );
        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

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

function requireAuthenticatedUserId(request: Request, response: Response): string | null {
  const authenticatedRequest = request as AuthenticatedRequest;
  if (!authenticatedRequest.auth) {
    response.status(401).json({ message: "Authentication required" });
    return null;
  }

  return authenticatedRequest.auth.userId;
}
