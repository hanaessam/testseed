import jwt from "jsonwebtoken";
import { resolveGitHubLogin, type CreateUserInput } from "../index";
import type { User } from "@testseed/types";

const jwtSecret = "test-secret";
const now = new Date("2026-06-02T12:00:00.000Z");

describe("resolveGitHubLogin", () => {
  it("returns a JWT for an existing user with the GitHub email", async () => {
    const user: User = {
      id: "user-1",
      email: "dev@testseed.local",
      passwordHash: "stored-password-hash",
      createdAt: now
    };

    const response = await resolveGitHubLogin(
      { email: " Dev@TestSeed.Local " },
      {
        jwtSecret,
        findUserByEmail: async () => user,
        createUser: async () => {
          throw new Error("createUser should not be called");
        },
        now: () => now
      }
    );

    expect(response.user.email).toBe("dev@testseed.local");
    expect(jwt.verify(response.token, jwtSecret)).toMatchObject({
      sub: "user-1",
      email: "dev@testseed.local"
    });
  });

  it("creates a user when the GitHub email is new", async () => {
    const createdInputs: CreateUserInput[] = [];

    const response = await resolveGitHubLogin(
      { email: "new@testseed.local" },
      {
        jwtSecret,
        findUserByEmail: async () => null,
        createUser: async (input: CreateUserInput) => {
          createdInputs.push(input);
          return {
            id: "user-2",
            email: input.email,
            passwordHash: input.passwordHash,
            createdAt: input.createdAt
          };
        },
        now: () => now
      }
    );

    expect(createdInputs[0]).toMatchObject({
      email: "new@testseed.local",
      createdAt: now
    });
    expect(createdInputs[0]?.passwordHash).toBeTruthy();
    expect(response.user.email).toBe("new@testseed.local");
  });

  it("rejects an empty GitHub email", async () => {
    await expect(
      resolveGitHubLogin(
        { email: "" },
        {
          jwtSecret,
          findUserByEmail: async () => null,
          createUser: async () => {
            throw new Error("createUser should not be called");
          }
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_GITHUB_EMAIL",
      statusCode: 400,
      message: "GitHub did not provide a usable email address"
    });
  });
});
