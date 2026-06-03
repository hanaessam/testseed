import bcrypt from "bcrypt";
import type { PasswordResetRequest, User } from "@testseed/types";
import { completePasswordReset, requestPasswordReset } from "../index";

const now = new Date("2026-06-03T12:00:00.000Z");
const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

async function makeUser(overrides: Partial<User> = {}): Promise<User> {
  return {
    id: "user-1",
    email: "dev@testseed.local",
    passwordHash: await bcrypt.hash("Old!Pass12345", 10),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    status: "active",
    ...overrides
  };
}

describe("password reset", () => {
  it("returns the same response for unknown emails without sending a code", async () => {
    let sent = false;
    let saved = false;

    const response = await requestPasswordReset(
      { email: "missing@testseed.local" },
      {
        findUserByEmail: async () => null,
        savePasswordResetRequest: async () => {
          saved = true;
        },
        sendPasswordResetEmail: async () => {
          sent = true;
        },
        now: () => now
      }
    );

    expect(response).toEqual({
      message: "If an account exists for that email, a reset code has been sent.",
      expiresInSeconds: 600
    });
    expect(sent).toBe(false);
    expect(saved).toBe(false);
  });

  it("hashes and stores a one-time code for existing accounts", async () => {
    let savedReset: PasswordResetRequest | undefined;
    let sentCode = "";

    const response = await requestPasswordReset(
      { email: "Dev@TestSeed.local" },
      {
        findUserByEmail: async () => makeUser(),
        savePasswordResetRequest: async (request) => {
          savedReset = request;
        },
        sendPasswordResetEmail: async (message) => {
          sentCode = message.code;
        },
        generateOtp: () => "123456",
        now: () => now
      }
    );

    expect(response.expiresInSeconds).toBe(600);
    expect(sentCode).toBe("123456");
    expect(savedReset).toMatchObject({
      email: "dev@testseed.local",
      expiresAt,
      attemptsRemaining: 5
    });
    expect(savedReset?.resetCodeHash).not.toBe("123456");
  });

  it("resets the password and consumes the code", async () => {
    let reset: PasswordResetRequest | undefined;
    let deleted = false;
    let newHash = "";

    await requestPasswordReset(
      { email: "dev@testseed.local" },
      {
        findUserByEmail: async () => makeUser(),
        savePasswordResetRequest: async (request) => {
          reset = request;
        },
        sendPasswordResetEmail: async () => undefined,
        generateOtp: () => "123456",
        now: () => now
      }
    );

    const result = await completePasswordReset(
      {
        email: "dev@testseed.local",
        code: "123456",
        newPassword: "New!Pass12345",
        confirmPassword: "New!Pass12345"
      },
      {
        findUserByEmail: async () => makeUser(),
        findPasswordResetRequest: async () => reset ?? null,
        consumePasswordResetAttempt: async () => reset ?? null,
        updatePasswordHashByEmail: async (_email, input) => {
          newHash = input.passwordHash;
        },
        deletePasswordResetRequest: async () => {
          deleted = true;
        },
        now: () => now
      }
    );

    expect(result).toEqual({ message: "Password reset complete" });
    expect(deleted).toBe(true);
    await expect(bcrypt.compare("New!Pass12345", newHash)).resolves.toBe(true);
  });

  it("rejects expired or invalid reset codes", async () => {
    const expired: PasswordResetRequest = {
      email: "dev@testseed.local",
      resetCodeHash: "hash",
      expiresAt: new Date(now.getTime() - 1000),
      attemptsRemaining: 5,
      createdAt: now
    };

    await expect(
      completePasswordReset(
        {
          email: "dev@testseed.local",
          code: "123456",
          newPassword: "New!Pass12345",
          confirmPassword: "New!Pass12345"
        },
        {
          findUserByEmail: async () => makeUser(),
          findPasswordResetRequest: async () => expired,
          consumePasswordResetAttempt: async () => expired,
          updatePasswordHashByEmail: async () => undefined,
          deletePasswordResetRequest: async () => undefined,
          now: () => now
        }
      )
    ).rejects.toMatchObject({ code: "RESET_CODE_EXPIRED", statusCode: 400 });
  });
});
