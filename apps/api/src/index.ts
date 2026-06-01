import { createConnection, createUserRepository } from "@testseed/db";
import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "./middleware/auth";
import { authErrorHandler, createAuthRouter } from "./routes/auth";

dotenv.config();

const port = Number(process.env.PORT ?? 3001);
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

const connection = createConnection(mongoUri);
const userRepository = createUserRepository(connection);

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requireAuth(jwtSecret));
app.use("/auth", createAuthRouter(userRepository, jwtSecret));
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
