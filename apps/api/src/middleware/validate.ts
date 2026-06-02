import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({
        message: "Invalid request body",
        issues: result.error.flatten().fieldErrors
      });
      return;
    }

    request.body = result.data;
    next();
  };
}
