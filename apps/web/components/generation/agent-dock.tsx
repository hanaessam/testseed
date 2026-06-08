"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";
import type { ChatRefinementMessage, GeneratedDataset } from "@testseed/types";
import { Bot, Loader2, SendHorizonal, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

export interface AgentDockMessage {
  id: string;
  role: ChatRefinementMessage["role"] | "system";
  content: string;
  status?: "complete" | "streaming" | "error";
  createdAt?: string;
}

interface AgentDockProps {
  dataset: GeneratedDataset | null;
  messages: AgentDockMessage[];
  isSubmitting?: boolean;
  placeholder?: string;
  quickPromptChips?: string[];
  onSubmit(message: string): void;
  className?: string;
}

function formatMessageTime(createdAt?: string) {
  if (!createdAt) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(createdAt));
  } catch {
    return null;
  }
}

function MessageBubble({ message }: { message: AgentDockMessage }) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isSystem = message.role === "system";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";
  const timestamp = formatMessageTime(message.createdAt);
  const showContent = message.content.length > 0 || !isStreaming;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[92%] rounded-full border border-info-border bg-info-subtle px-3 py-1.5 text-xs text-info-text">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
      aria-label={isUser ? "Your message" : "TestSeed assistant message"}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "border-accent/30 bg-accent/15 text-accent"
            : "border-border bg-surface text-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "flex max-w-[min(100%,28rem)] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <span className="text-foreground/80">{isUser ? "You" : "TestSeed"}</span>
          {timestamp ? <span className="font-normal normal-case">{timestamp}</span> : null}
          {isStreaming ? (
            <span className="inline-flex items-center gap-1 font-normal normal-case text-accent">
              <Loader2 className="h-3 w-3 animate-spin" />
              Responding
            </span>
          ) : null}
          {isError ? (
            <span className="font-normal normal-case text-danger-text">Failed</span>
          ) : null}
        </div>

        <div
          className={cn(
            "rounded-2xl border px-3.5 py-2.5 text-sm leading-6 shadow-sm",
            isUser
              ? "rounded-tr-md border-accent/25 bg-accent/15 text-foreground"
              : isError
                ? "rounded-tl-md border-danger-border bg-danger-subtle text-danger-text"
                : "rounded-tl-md border-border bg-surface text-foreground"
          )}
        >
          {showContent ? (
            <p className="whitespace-pre-wrap break-words">
              {message.content}
              {isStreaming && message.content.length > 0 ? (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent align-middle" />
              ) : null}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-muted">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
              </span>
              <span className="text-xs">Thinking…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AgentDock({
  dataset,
  messages,
  isSubmitting = false,
  placeholder = "Describe how the accepted dataset should change...",
  quickPromptChips,
  onSubmit,
  className
}: AgentDockProps) {
  const [draft, setDraft] = useState("");
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const disabled = !dataset || isSubmitting;

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSubmitting]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || disabled) {
      return;
    }

    onSubmit(trimmed);
    setDraft("");
  };

  return (
    <Card className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <CardHeader className="shrink-0 space-y-1 pb-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Agent dock</h2>
        </div>
        <p className="text-xs leading-5 text-muted">
          Submit feedback to iteratively regenerate from the last accepted dataset.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pb-4">
        {!dataset ? (
          <Alert tone="info" title="Dataset required" className="shrink-0">
            Generate a dataset before submitting regeneration feedback.
          </Alert>
        ) : null}

        {quickPromptChips && quickPromptChips.length > 0 ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {quickPromptChips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={disabled}
                onClick={() => setDraft(chip)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                {chip}
              </button>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain rounded-md border border-border bg-background/30 p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">
              No feedback messages yet. Ask for more realistic names, pricing variance, location
              updates, or consistency fixes once data has been generated.
            </p>
          ) : null}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          <div ref={scrollAnchorRef} />
        </div>

        <form className="shrink-0 space-y-3" onSubmit={handleSubmit}>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
          <Button type="submit" className="w-full" disabled={disabled || draft.trim().length === 0}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
            {isSubmitting ? "Sending..." : "Send feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
