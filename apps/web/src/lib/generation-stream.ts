"use client";

import type {
  ChatRefinementMessage,
  GeneratedDataset,
  GenerationPlanResponse,
  GenerationValidationResult
} from "@testseed/types";

export type GenerationStreamEvent =
  | {
      type: "plan";
      payload: Pick<GenerationPlanResponse, "orderedCollections" | "totalRecords">;
    }
  | {
      type: "collection_start";
      payload: { collectionName: string; index: number; total: number };
    }
  | {
      type: "collection_complete";
      payload: {
        collectionName: string;
        records: Array<Record<string, unknown>>;
        validationResults: GenerationValidationResult[];
      };
    }
  | {
      type: "collection_error";
      payload: { collectionName: string; message: string; code?: string };
    }
  | {
      type: "complete";
      payload: {
        dataset?: GeneratedDataset;
        savedDatasetId?: string;
        chatHistory?: ChatRefinementMessage[];
        guidance?: string;
        message?: string;
      };
    }
  | {
      type: "error";
      payload: { message: string; code?: string; validationResults?: GenerationValidationResult[] };
    }
  | {
      type: "cancelled";
      payload: Record<string, never>;
    }
  | {
      type: "token";
      payload: { content: string };
    };

export interface GenerationStreamOptions<RequestBody, BatchResponse> {
  url: string;
  token: string;
  body: RequestBody;
  signal?: AbortSignal;
  fallback: () => Promise<BatchResponse>;
  onEvent(event: GenerationStreamEvent): void;
  onFallback?(response: BatchResponse): void;
}

export async function streamWorkbenchRequest<RequestBody, BatchResponse>({
  url,
  token,
  body,
  signal,
  fallback,
  onEvent,
  onFallback
}: GenerationStreamOptions<RequestBody, BatchResponse>): Promise<BatchResponse | null> {
  const headers: HeadersInit = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal
    });
  } catch (error) {
    if (signal?.aborted) {
      onEvent({ type: "cancelled", payload: {} });
      return null;
    }

    const batchResponse = await fallback();
    onFallback?.(batchResponse);
    return batchResponse;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 501 || !response.ok || !contentType.includes("text/event-stream")) {
    const batchResponse = await fallback();
    onFallback?.(batchResponse);
    return batchResponse;
  }

  if (!response.body) {
    const batchResponse = await fallback();
    onFallback?.(batchResponse);
    return batchResponse;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const segments = buffer.split("\n\n");
    buffer = segments.pop() ?? "";

    for (const segment of segments) {
      const parsedEvent = parseSseEvent(segment);
      if (!parsedEvent) {
        continue;
      }

      onEvent(parsedEvent);
    }
  }

  const trailingEvent = parseSseEvent(buffer);
  if (trailingEvent) {
    onEvent(trailingEvent);
  }

  return null;
}

function parseSseEvent(chunk: string): GenerationStreamEvent | null {
  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  try {
    return {
      type: eventName as GenerationStreamEvent["type"],
      payload: JSON.parse(dataLines.join("\n")) as GenerationStreamEvent["payload"]
    } as GenerationStreamEvent;
  } catch {
    return null;
  }
}
