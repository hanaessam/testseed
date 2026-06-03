import type { User } from "@testseed/types";
import { getCurrentAuthUser } from "../index";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "dev@testseed.local",
    passwordHash: "hash",
    createdAt: new Date("2026-06-02T00:00:00.000Z"),
    ...overrides
  };
}

describe("getCurrentAuthUser", () => {
  it("returns account-safe user details for the authenticated user", async () => {
    const result = await getCurrentAuthUser(
      { userId: "user-1" },
      {
        findUserById: async () => makeUser()
      }
    );

    expect(result.user).toEqual({
      id: "user-1",
      email: "dev@testseed.local",
      createdAt: new Date("2026-06-02T00:00:00.000Z")
    });
  });

  it("returns null when the authenticated user no longer exists", async () => {
    const result = await getCurrentAuthUser(
      { userId: "missing-user" },
      {
        findUserById: async () => null
      }
    );

    expect(result.user).toBeNull();
  });
});
