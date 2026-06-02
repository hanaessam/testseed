import {
  AuthError,
  loginUser,
  logoutUser,
  requestRegistrationOtp,
  verifyRegistrationOtp,
  type RegistrationOtpEmailMessage
} from "@testseed/core";
import type { createRegistrationOtpCache, createUserRepository } from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";

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
}

export function createAuthRouter(
  userRepository: UserRepository,
  registrationOtpCache: RegistrationOtpCache,
  sendRegistrationOtpEmail: (message: RegistrationOtpEmailMessage) => Promise<void>,
  config: AuthRouterConfig
): Router {
  const router = Router();

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
