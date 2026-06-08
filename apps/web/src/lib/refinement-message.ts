/**
 * OpenAI refinement responses are JSON. During SSE token streaming we receive
 * partial JSON, so extract the human-readable `message` field when possible.
 */
export function extractStreamingRefinementText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return parsed.message;
    }
  } catch {
    // Partial JSON while streaming.
  }

  const match = trimmed.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)(?:"|$)/);
  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

export function resolveRefinementAssistantContent(options: {
  streamedText?: string;
  guidance?: string;
  message?: string;
}): string {
  const streamed = options.streamedText?.trim() ?? "";

  return (
    options.guidance ||
    options.message ||
    extractStreamingRefinementText(streamed) ||
    streamed ||
    "Refinement completed."
  );
}
