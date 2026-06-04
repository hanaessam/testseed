import bcrypt from "bcrypt";
import type { User } from "@testseed/types";
import { changePassword } from "../index";

const now = new Date("2026-06-03T12:00:00.000Z");

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

describe("changePassword", () => {
  it("updates the password hash when current password and new password are valid", async () => {
    let savedHash = "";

    const result = await changePassword(
      {
        userId: "user-1",
        currentPassword: "Current!Pass123",
        newPassword: "Newer!Pass123",
        confirmPassword: "Newer!Pass123"
      },
      {
        findUserById: async () => makeUser(),
        updatePasswordHash: async (_userId, input) => {
          savedHash = input.passwordHash;
        },
        now: () => now
      }
    );

    expect(result).toEqual({ message: "Password updated" });
    expect(savedHash).not.toBe("Newer!Pass123");
    await expect(bcrypt.compare("Newer!Pass123", savedHash)).resolves.toBe(true);
  });

  it("rejects an incorrect current password", async () => {
    await expect(
      changePassword(
        {
          userId: "user-1",
          currentPassword: "wrong",
          newPassword: "Newer!Pass123",
          confirmPassword: "Newer!Pass123"
        },
        {
          findUserById: async () => makeUser(),
          updatePasswordHash: async () => undefined
        }
      )
    ).rejects.toMatchObject({ code: "INVALID_CURRENT_PASSWORD", statusCode: 401 });
  });

  it("rejects same, weak, or mismatched new passwords", async () => {
    const deps = {
      findUserById: async () => makeUser(),
      updatePasswordHash: async () => undefined
    };

    await expect(
      changePassword(
        {
          userId: "user-1",
          currentPassword: "Current!Pass123",
          newPassword: "Current!Pass123",
          confirmPassword: "Current!Pass123"
        },
        deps
      )
    ).rejects.toMatchObject({ code: "PASSWORD_REUSED", statusCode: 400 });

    await expect(
      changePassword(
        {
          userId: "user-1",
          currentPassword: "Current!Pass123",
          newPassword: "weak",
          confirmPassword: "different"
        },
        deps
      )
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD", statusCode: 400 });
  });
});
