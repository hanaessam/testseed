import {
  createConnection,
  createRedisClient,
  createRegistrationOtpCache,
  createUserRepository,
  createProjectRepository,
  createProjectHistoryRepository
} from "@testseed/db";
import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { createEmailChangeVerificationEmailSender } from "./email/email-change-verification-email";
import { createPasswordResetEmailSender } from "./email/password-reset-email";
import { createRegistrationOtpEmailSender } from "./email/registration-otp-email";
import { requireAuth } from "./middleware/auth";
import { authErrorHandler, createAuthRouter } from "./routes/auth";
import { createHistoryRouter } from "./routes/history";
import { completeRepositoryContextCallback, createProjectsRouter } from "./routes/projects";
import { createRollbackRouter } from "./routes/rollback";
import { createSchemaRouter } from "./routes/schema";

import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

dotenv.config({
  path: findRootEnvPath()
});

function findRootEnvPath(): string {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

const port = Number(process.env.PORT ?? 3001);
const mongoUri = process.env.MONGODB_URI;
const redisUrl = process.env.REDIS_URL;
const redisToken = process.env.REDIS_TOKEN;
const jwtSecret = process.env.JWT_SECRET;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const githubCallbackUrl = process.env.GITHUB_CALLBACK_URL;
const webAppUrl = process.env.WEB_APP_URL;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

if (!redisUrl || !redisToken) {
  throw new Error("REDIS_URL and REDIS_TOKEN are required");
}

if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
  throw new Error("SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM are required");
}

const connection = createConnection(mongoUri);
const userRepository = createUserRepository(connection);
const projectRepository = createProjectRepository(connection);
const projectHistoryRepository = createProjectHistoryRepository(connection);
const redis = createRedisClient({
  url: redisUrl,
  token: redisToken
});
const registrationOtpCache = createRegistrationOtpCache(redis);
const sendRegistrationOtpEmail = createRegistrationOtpEmailSender({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  user: smtpUser,
  pass: smtpPass,
  from: smtpFrom
});
const sendPasswordResetEmail = createPasswordResetEmailSender({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  user: smtpUser,
  pass: smtpPass,
  from: smtpFrom
});
const sendEmailChangeVerificationEmail = createEmailChangeVerificationEmailSender({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  user: smtpUser,
  pass: smtpPass,
  from: smtpFrom
});
const authRouterConfig = {
  jwtSecret,
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 600),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  githubClientId,
  githubClientSecret,
  githubCallbackUrl,
  webAppUrl,
  completeRepositoryContextCallback: (request: { code: string; state: string }) =>
    completeRepositoryContextCallback(request, {
      projectRepository,
      projectHistoryRepository,
      githubClientId,
      githubClientSecret,
      githubCallbackUrl,
      webAppUrl,
      jwtSecret,
      openaiApiKey
    })
};

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requireAuth(jwtSecret));
app.use(
  "/auth",
  createAuthRouter(
    userRepository,
    registrationOtpCache,
    sendRegistrationOtpEmail,
    sendPasswordResetEmail,
    sendEmailChangeVerificationEmail,
    authRouterConfig
  )
);
app.use(
  "/schemas",
  createSchemaRouter({
    projectRepository,
    projectHistoryRepository
  })
);
app.use(
  "/projects",
  createProjectsRouter({
    projectRepository,
    projectHistoryRepository,
    githubClientId,
    githubClientSecret,
    githubCallbackUrl,
    webAppUrl,
    jwtSecret,
    openaiApiKey
  })
);
app.use(
  "/projects",
  createHistoryRouter({
    projectRepository,
    projectHistoryRepository
  })
);
app.use(
  "/projects",
  createRollbackRouter({
    projectHistoryRepository
  })
);
app.use(authErrorHandler);
app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction
  ) => {
    if (isJsonSyntaxError(error)) {
      response.status(400).json({ message: "Invalid JSON request body" });
      return;
    }

    if (isSmtpAuthError(error)) {
      response.status(502).json({
        message: "Email provider authentication failed. Check SMTP_USER and SMTP_PASS."
      });
      return;
    }

    console.error("Unhandled API error", error);
    response.status(500).json({ message: "Internal server error" });
  }
);

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error: unknown) => {
    console.error("Failed to start TestSeed API", error);
    process.exit(1);
  });
}

function isJsonSyntaxError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 400
  );
}

function isSmtpAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EAUTH"
  );
}

async function startServer(): Promise<void> {
  await connection.asPromise();

  app.listen(port, () => {
    console.log(`TestSeed API listening on port ${port}`);
  });
}
