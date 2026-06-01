import {
  createConnection,
  createRedisClient,
  createRegistrationOtpCache,
  createUserRepository
} from "@testseed/db";
import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import { createRegistrationOtpEmailSender } from "./email/registration-otp-email";
import { requireAuth } from "./middleware/auth";
import { authErrorHandler, createAuthRouter } from "./routes/auth";

dotenv.config();

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
const authRouterConfig = {
  jwtSecret,
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 600),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5)
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
    authRouterConfig
  )
);
app.use(authErrorHandler);
app.use(
  (
    _error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction
  ) => {
    response.status(500).json({ message: "Internal server error" });
  }
);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`TestSeed API listening on port ${port}`);
  });
}
