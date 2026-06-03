import jwt from "jsonwebtoken";
import { registerUser, loginUser } from "../index";
import type { User } from "@testseed/types";

const jwtSecret = "test-secret";

describe("loginUser", () => {
  it("validates credentials and returns a JWT", async () => {
    let storedUser: User | null = null;

    await registerUser(
      { email: "dev@testseed.local", password: "secret123" },
      {
        jwtSecret,
        findUserByEmail: async () => null,
        createUser: async (input) => {
          storedUser = {
            id: "user-1",
            email: input.email,
            passwordHash: input.passwordHash,
            createdAt: input.createdAt
          };
          return storedUser;
        }
      }
    );

    const response = await loginUser(
      { email: "dev@testseed.local", password: "secret123" },
      {
        jwtSecret,
        findUserByEmail: async () => storedUser
      }
    );

    expect(response.user.email).toBe("dev@testseed.local");
    expect(jwt.verify(response.token, jwtSecret)).toMatchObject({
      sub: "user-1",
      email: "dev@testseed.local"
    });
  });

  it("creates a session token that expires after seven days", async () => {
    let storedUser: User | null = null;

    await registerUser(
      { email: "dev@testseed.local", password: "secret123" },
      {
        jwtSecret,
        findUserByEmail: async () => null,
        createUser: async (input) => {
          storedUser = {
            id: "user-1",
            email: input.email,
            passwordHash: input.passwordHash,
            createdAt: input.createdAt
          };
          return storedUser;
        }
      }
    );

    const response = await loginUser(
      { email: "dev@testseed.local", password: "secret123" },
      {
        jwtSecret,
        findUserByEmail: async () => storedUser
      }
    );

    const payload = jwt.verify(response.token, jwtSecret) as jwt.JwtPayload;
    expect(payload.exp! - payload.iat!).toBe(7 * 24 * 60 * 60);
  });

  it("returns a generic 401 error when the email is unknown", async () => {
    await expect(
      loginUser(
        { email: "missing@testseed.local", password: "secret123" },
        {
          jwtSecret,
          findUserByEmail: async () => null
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      statusCode: 401,
      message: "Invalid email or password"
    });
  });

  it("returns a generic 401 error when the password is wrong", async () => {
    let storedUser: User | null = null;

    await registerUser(
      { email: "dev@testseed.local", password: "secret123" },
      {
        jwtSecret,
        findUserByEmail: async () => null,
        createUser: async (input) => {
          storedUser = {
            id: "user-1",
            email: input.email,
            passwordHash: input.passwordHash,
            createdAt: input.createdAt
          };
          return storedUser;
        }
      }
    );

    await expect(
      loginUser(
        { email: "dev@testseed.local", password: "wrong-password" },
        {
          jwtSecret,
          findUserByEmail: async () => storedUser
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      statusCode: 401,
      message: "Invalid email or password"
    });
  });
});
