import { AuthError, loginUser, registerUser } from "@testseed/core";
import type { createUserRepository } from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";

type UserRepository = ReturnType<typeof createUserRepository>;

const authRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export function createAuthRouter(userRepository: UserRepository, jwtSecret: string): Router {
  const router = Router();

  router.post(
    "/register",
    validateBody(authRequestSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const result = await registerUser(request.body, {
          jwtSecret,
          findUserByEmail: userRepository.findUserByEmail,
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
          jwtSecret,
          findUserByEmail: userRepository.findUserByEmail
        });
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
