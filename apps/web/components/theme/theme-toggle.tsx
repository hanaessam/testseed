"use client";

import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { setThemeMode } from "@/src/store/theme/themeSlice";
import type { ThemeMode } from "@/src/store/theme/theme";
import { Monitor, Moon, Sun } from "lucide-react";

const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "system", label: "System", icon: Monitor }
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.theme.mode);
  const resolved = useAppSelector((state) => state.theme.resolved);

  return (
    <div
      className={`rounded-lg border border-border bg-background/50 p-1 ${compact ? "" : "w-full"}`}
      role="group"
      aria-label="Theme"
    >
      {!compact ? (
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Appearance · {resolved}
        </p>
      ) : null}
      <div className="flex gap-1">
        {options.map(({ mode: optionMode, label, icon: Icon }) => {
          const active = mode === optionMode;

          return (
            <button
              key={optionMode}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={active}
              onClick={() => dispatch(setThemeMode(optionMode))}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {!compact ? <span>{label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
