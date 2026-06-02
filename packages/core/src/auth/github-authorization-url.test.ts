import { createGitHubAuthorizationUrl } from "./index";

describe("createGitHubAuthorizationUrl", () => {
  it("builds the GitHub OAuth authorization URL for login", () => {
    const url = new URL(
      createGitHubAuthorizationUrl({
        clientId: "github-client-id",
        callbackUrl: "http://localhost:3001/auth/github/callback"
      })
    );

    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("github-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3001/auth/github/callback"
    );
    expect(url.searchParams.get("scope")).toBe("read:user user:email");
  });
});
