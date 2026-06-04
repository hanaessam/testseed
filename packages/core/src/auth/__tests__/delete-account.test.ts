import bcrypt from "bcrypt";
import type { User } from "@testseed/types";
import { deleteAccount } from "../index";

const now = new Date("2026-06-03T12:00:00.000Z");
const scheduledDeletionAt = new Date("2026-07-03T12:00:00.000Z");

async function makeUser(overrides: Partial<User> = {}): Promise<User> {
  return {
    id: "user-1",
    email: "dev@testseed.local",
    passwordHash: await bcrypt.hash("Current!Pass123", 10),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    status: "active",
    ...overrides
  };
}

describe("deleteAccount", () => {
  it("deactivates the account and schedules permanent deletion after 30 days", async () => {
    let deactivation: { deactivatedAt: Date; scheduledDeletionAt: Date } | undefined;

    const response = await deleteAccount(
      {
        userId: "user-1",
        currentPassword: "Current!Pass123",
        confirmationPhrase: "DELETE"
      },
      {
        findUserById: async () => makeUser(),
        deactivateUser: async (_userId, input) => {
          deactivation = input;
        },
        now: () => now
      }
    );

    expect(deactivation).toEqual({ deactivatedAt: now, scheduledDeletionAt });
    expect(response).toEqual({
      message: "Account deactivated and scheduled for permanent deletion.",
      deactivatedAt: now,
      scheduledDeletionAt
    });
  });

  it("rejects wrong current password or confirmation phrase", async () => {
    const deps = {
      findUserById: async () => makeUser(),
      deactivateUser: async () => undefined
    };

    await expect(
      deleteAccount(
        {
          userId: "user-1",
          currentPassword: "wrong",
          confirmationPhrase: "DELETE"
        },
        deps
      )
    ).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD", statusCode: 401 });

    await expect(
      deleteAccount(
        {
          userId: "user-1",
          currentPassword: "Current!Pass123",
          confirmationPhrase: "delete"
        },
        deps
      )
    ).rejects.toMatchObject({ code: "INVALID_CONFIRMATION_PHRASE", statusCode: 400 });
  });
});
