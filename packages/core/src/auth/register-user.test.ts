import jwt from "jsonwebtoken";
import { registerUser } from "./index";
import type { User } from "@testseed/types";

const jwtSecret = "test-secret";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "dev@testseed.local",
    passwordHash: "$2b$10$existing",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides
  };
}

describe("registerUser", () => {
  it("creates a user with a hashed password and returns a JWT", async () => {
    let createdPasswordHash = "";
    const user = makeUser();

    const response = await registerUser(
      { email: "Dev@TestSeed.local", password: "secret123" },
      {
        jwtSecret,
        findUserByEmail: async () => null,
        createUser: async (input) => {
          createdPasswordHash = input.passwordHash;
          return user;
        }
      }
    );

    expect(createdPasswordHash).not.toBe("secret123");
    expect(createdPasswordHash).toMatch(/^\$2[aby]\$/);
    expect(response.user).toEqual({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    });
    expect(jwt.verify(response.token, jwtSecret)).toMatchObject({
      sub: user.id,
      email: user.email
    });
  });

  it("rejects duplicate email addresses", async () => {
    await expect(
      registerUser(
        { email: "dev@testseed.local", password: "secret123" },
        {
          jwtSecret,
          findUserByEmail: async () => makeUser(),
          createUser: async () => makeUser()
        }
      )
    ).rejects.toMatchObject({
      code: "DUPLICATE_EMAIL",
      statusCode: 400
    });
  });

  it("rejects missing required fields", async () => {
    await expect(
      registerUser(
        { email: "", password: "" },
        {
          jwtSecret,
          findUserByEmail: async () => null,
          createUser: async () => makeUser()
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_AUTH_REQUEST",
      statusCode: 400
    });
  });
});
