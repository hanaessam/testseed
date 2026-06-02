import { GitHubCallback } from "@/components/auth/github-callback";

export default function GitHubCallbackPage({
  searchParams
}: {
  searchParams: { token?: string };
}) {
  return <GitHubCallback token={searchParams.token} />;
}
