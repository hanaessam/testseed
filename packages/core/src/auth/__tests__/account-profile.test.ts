import type { EmailChangeVerification, User } from "@testseed/types";
import {
  getAccountProfile,
  requestAccountProfileUpdate,
  verifyEmailChange
} from "../index";

const now = new Date("2026-06-03T12:00:00.000Z");
const later = new Date(now.getTime() + 10 * 60 * 1000);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "dev@testseed.local",
    passwordHash: "hash",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    status: "active",
    ...overrides
  };
}

describe("account profile", () => {
  it("returns account-safe profile details including pending email", async () => {
    const result = await getAccountProfile(
      { userId: "user-1" },
      {
        findUserById: async () => makeUser({ displayName: "Mazen", pendingEmail: "new@testseed.local" })
      }
    );

    expect(result.user).toEqual({
      id: "user-1",
      email: "dev@testseed.local",
      displayName: "Mazen",
      pendingEmail: "new@testseed.local",
      emailVerificationPending: true,
      status: "active",
      createdAt: new Date("2026-06-01T00:00:00.000Z")
    });
  });

  it("updates display name and stores pending email while keeping current email active", async () => {
    let sentCode = "";
    let savedVerification: EmailChangeVerification | undefined;
    let updatedProfile: { displayName?: string; pendingEmail?: string; updatedAt: Date } | undefined;

    const result = await requestAccountProfileUpdate(
      { userId: "user-1", displayName: "Mazen", email: "New@TestSeed.local" },
      {
        findUserById: async () => makeUser(),
        findUserByEmail: async () => null,
        updateUserProfile: async (_userId, input) => {
          updatedProfile = input;
          return makeUser({
            displayName: input.displayName,
            pendingEmail: input.pendingEmail,
            updatedAt: input.updatedAt
          });
        },
        saveEmailChangeVerification: async (verification) => {
          savedVerification = verification;
        },
        sendEmailChangeVerificationEmail: async (message) => {
          sentCode = message.code;
        },
        generateOtp: () => "123456",
        now: () => now
      }
    );

    expect(updatedProfile).toMatchObject({
      displayName: "Mazen",
      pendingEmail: "new@testseed.local",
      updatedAt: now
    });
    expect(result.user.email).toBe("dev@testseed.local");
    expect(result.user.pendingEmail).toBe("new@testseed.local");
    expect(result.user.emailVerificationPending).toBe(true);
    expect(sentCode).toBe("123456");
    expect(savedVerification).toMatchObject({
      userId: "user-1",
      currentEmail: "dev@testseed.local",
      pendingEmail: "new@testseed.local",
      expiresAt: later,
      attemptsRemaining: 5
    });
    expect(savedVerification?.verificationCodeHash).not.toBe("123456");
  });

  it("rejects duplicate pending email requests", async () => {
    await expect(
      requestAccountProfileUpdate(
        { userId: "user-1", email: "used@testseed.local" },
        {
          findUserById: async () => makeUser(),
          findUserByEmail: async () => makeUser({ id: "other", email: "used@testseed.local" }),
          updateUserProfile: async () => makeUser(),
          saveEmailChangeVerification: async () => undefined,
          sendEmailChangeVerificationEmail: async () => undefined
        }
      )
    ).rejects.toMatchObject({ code: "DUPLICATE_EMAIL", statusCode: 409 });
  });

  it("verifies pending email and makes it active", async () => {
    let deletedVerification = false;
    let activatedEmail: { email: string; updatedAt: Date } | undefined;
    let verification: EmailChangeVerification | undefined;

    await requestAccountProfileUpdate(
      { userId: "user-1", email: "new@testseed.local" },
      {
        findUserById: async () => makeUser(),
        findUserByEmail: async () => null,
        updateUserProfile: async (_userId, input) => makeUser({ pendingEmail: input.pendingEmail }),
        saveEmailChangeVerification: async (input) => {
          verification = input;
        },
        sendEmailChangeVerificationEmail: async () => undefined,
        generateOtp: () => "123456",
        now: () => now
      }
    );

    const result = await verifyEmailChange(
      { userId: "user-1", code: "123456" },
      {
        findUserById: async () => makeUser({ pendingEmail: "new@testseed.local" }),
        findUserByEmail: async () => null,
        findEmailChangeVerification: async () => verification ?? null,
        consumeEmailChangeVerificationAttempt: async () => verification ?? null,
        activatePendingEmail: async (_userId, input) => {
          activatedEmail = input;
          return makeUser({ email: input.email, pendingEmail: undefined, updatedAt: input.updatedAt });
        },
        deleteEmailChangeVerification: async () => {
          deletedVerification = true;
        },
        now: () => now
      }
    );

    expect(activatedEmail).toEqual({ email: "new@testseed.local", updatedAt: now });
    expect(deletedVerification).toBe(true);
    expect(result.user.email).toBe("new@testseed.local");
    expect(result.user.emailVerificationPending).toBe(false);
  });
});
