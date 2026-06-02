import { logoutUser } from "./index";

describe("logoutUser", () => {
  it("returns a logout acknowledgement", () => {
    expect(logoutUser()).toEqual({
      message: "Logged out"
    });
  });
});
