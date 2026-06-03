import jwt from "jsonwebtoken";
import {
  requestRegistrationOtp,
  validatePassword,
  verifyRegistrationOtp
} from "../index";
import type { PendingRegistration, User } from "@testseed/types";

const jwtSecret = "test-secret";
const now = new Date("2026-06-01T12:00:00.000Z");
const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "dev@testseed.local",
    passwordHash: "$2b$10$existing",
    createdAt: now,
    ...overrides
  };
}

describe("validatePassword", () => {
  it("requires length, uppercase, lowercase, number, special character, and match", () => {
    const result = validatePassword("weak", "different");

    expect(result.valid).toBe(false);
    expect(result.rules).toEqual([
      expect.objectContaining({ id: "minLength", passed: false }),
      expect.objectContaining({ id: "uppercase", passed: false }),
      expect.objectContaining({ id: "lowercase", passed: true }),
      expect.objectContaining({ id: "number", passed: false }),
      expect.objectContaining({ id: "special", passed: false }),
      expect.objectContaining({ id: "match", passed: false })
    ]);
  });

  it("accepts a strong matching password", () => {
    expect(validatePassword("Str0ng!Passw0rd", "Str0ng!Passw0rd").valid).toBe(true);
  });
});

describe("requestRegistrationOtp", () => {
  it("hashes the OTP and pending password, stores pending registration, and sends email", async () => {
    let pendingRegistration: PendingRegistration | undefined;
    let sentOtp = "";

    const response = await requestRegistrationOtp(
      {
        email: "Dev@TestSeed.local",
        password: "Str0ng!Passw0rd",
        confirmPassword: "Str0ng!Passw0rd"
      },
      {
        findUserByEmail: async () => null,
        savePendingRegistration: async (pending) => {
          pendingRegistration = pending;
        },
        sendRegistrationOtpEmail: async (message) => {
          sentOtp = message.otp;
        },
        generateOtp: () => "123456",
        now: () => now,
        otpTtlSeconds: 600,
        otpMaxAttempts: 5
      }
    );

    expect(response).toEqual({
      email: "dev@testseed.local",
      expiresInSeconds: 600,
      message: "Verification code sent"
    });
    expect(sentOtp).toBe("123456");
    if (!pendingRegistration) {
      throw new Error("Expected pending registration to be saved");
    }
    const savedPending = pendingRegistration;
    expect(savedPending).toMatchObject({
      email: "dev@testseed.local",
      expiresAt,
      attemptsRemaining: 5
    });
    expect(savedPending.otpHash).not.toBe("123456");
    expect(savedPending.passwordHash).not.toBe("Str0ng!Passw0rd");
  });

  it("rejects duplicate emails before sending an OTP", async () => {
    await expect(
      requestRegistrationOtp(
        {
          email: "dev@testseed.local",
          password: "Str0ng!Passw0rd",
          confirmPassword: "Str0ng!Passw0rd"
        },
        {
          findUserByEmail: async () => makeUser(),
          savePendingRegistration: async () => undefined,
          sendRegistrationOtpEmail: async () => undefined
        }
      )
    ).rejects.toMatchObject({ code: "DUPLICATE_EMAIL", statusCode: 400 });
  });

  it("rejects weak passwords", async () => {
    await expect(
      requestRegistrationOtp(
        { email: "dev@testseed.local", password: "weak", confirmPassword: "weak" },
        {
          findUserByEmail: async () => null,
          savePendingRegistration: async () => undefined,
          sendRegistrationOtpEmail: async () => undefined
        }
      )
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD", statusCode: 400 });
  });
});

describe("verifyRegistrationOtp", () => {
  it("creates a user, deletes the pending OTP, and returns a JWT when OTP is valid", async () => {
    let pendingDeleted = false;
    let createdUserInput: { email: string; passwordHash: string } | null = null;
    let pendingRegistration: PendingRegistration | undefined;

    await requestRegistrationOtp(
      {
        email: "dev@testseed.local",
        password: "Str0ng!Passw0rd",
        confirmPassword: "Str0ng!Passw0rd"
      },
      {
        findUserByEmail: async () => null,
        savePendingRegistration: async (pending) => {
          pendingRegistration = pending;
        },
        sendRegistrationOtpEmail: async () => undefined,
        generateOtp: () => "123456",
        now: () => now
      }
    );

    const response = await verifyRegistrationOtp(
      { email: "dev@testseed.local", otp: "123456" },
      {
        jwtSecret,
        findUserByEmail: async () => null,
        findPendingRegistration: async () => pendingRegistration ?? null,
        consumePendingRegistrationAttempt: async () => pendingRegistration ?? null,
        deletePendingRegistration: async () => {
          pendingDeleted = true;
        },
        createUser: async (input) => {
          createdUserInput = input;
          return makeUser({ email: input.email, passwordHash: input.passwordHash });
        },
        now: () => now
      }
    );

    expect(createdUserInput).toMatchObject({
      email: "dev@testseed.local"
    });
    expect(pendingDeleted).toBe(true);
    expect(jwt.verify(response.token, jwtSecret)).toMatchObject({
      sub: "user-1",
      email: "dev@testseed.local"
    });
  });

  it("rejects expired OTPs and deletes the pending registration", async () => {
    let pendingDeleted = false;
    const pendingRegistration: PendingRegistration = {
      email: "dev@testseed.local",
      passwordHash: "hash",
      otpHash: "hash",
      expiresAt: new Date(now.getTime() - 1000),
      attemptsRemaining: 5
    };

    await expect(
      verifyRegistrationOtp(
        { email: "dev@testseed.local", otp: "123456" },
        {
          jwtSecret,
          findUserByEmail: async () => null,
          findPendingRegistration: async () => pendingRegistration,
          consumePendingRegistrationAttempt: async () => pendingRegistration,
          deletePendingRegistration: async () => {
            pendingDeleted = true;
          },
          createUser: async () => makeUser(),
          now: () => now
        }
      )
    ).rejects.toMatchObject({ code: "OTP_EXPIRED", statusCode: 400 });

    expect(pendingDeleted).toBe(true);
  });

  it("rejects invalid OTPs with a generic error", async () => {
    let pendingRegistration: PendingRegistration | undefined;

    await requestRegistrationOtp(
      {
        email: "dev@testseed.local",
        password: "Str0ng!Passw0rd",
        confirmPassword: "Str0ng!Passw0rd"
      },
      {
        findUserByEmail: async () => null,
        savePendingRegistration: async (pending) => {
          pendingRegistration = pending;
        },
        sendRegistrationOtpEmail: async () => undefined,
        generateOtp: () => "123456",
        now: () => now
      }
    );

    await expect(
      verifyRegistrationOtp(
        { email: "dev@testseed.local", otp: "000000" },
        {
          jwtSecret,
          findUserByEmail: async () => null,
          findPendingRegistration: async () => pendingRegistration ?? null,
          consumePendingRegistrationAttempt: async () =>
            pendingRegistration
              ? { ...pendingRegistration, attemptsRemaining: 4 }
              : null,
          deletePendingRegistration: async () => undefined,
          createUser: async () => makeUser(),
          now: () => now
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_OTP",
      statusCode: 400,
      message: "Invalid or expired verification code"
    });
  });

  it("blocks OTP verification after the maximum number of attempts", async () => {
    const pendingRegistration: PendingRegistration = {
      email: "dev@testseed.local",
      passwordHash: "hash",
      otpHash: "hash",
      expiresAt,
      attemptsRemaining: 0
    };

    await expect(
      verifyRegistrationOtp(
        { email: "dev@testseed.local", otp: "123456" },
        {
          jwtSecret,
          findUserByEmail: async () => null,
          findPendingRegistration: async () => pendingRegistration,
          consumePendingRegistrationAttempt: async () => pendingRegistration,
          deletePendingRegistration: async () => undefined,
          createUser: async () => makeUser(),
          now: () => now
        }
      )
    ).rejects.toMatchObject({ code: "OTP_ATTEMPTS_EXCEEDED", statusCode: 429 });
  });

  it("blocks OTP reuse after successful verification", async () => {
    await expect(
      verifyRegistrationOtp(
        { email: "dev@testseed.local", otp: "123456" },
        {
          jwtSecret,
          findUserByEmail: async () => null,
          findPendingRegistration: async () => null,
          consumePendingRegistrationAttempt: async () => null,
          deletePendingRegistration: async () => undefined,
          createUser: async () => makeUser(),
          now: () => now
        }
      )
    ).rejects.toMatchObject({ code: "OTP_EXPIRED", statusCode: 400 });
  });
});
