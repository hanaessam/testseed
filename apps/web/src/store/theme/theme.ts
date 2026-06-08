export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "testseed:theme";

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function readStoredThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writeStoredThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var m=s==="light"||s==="dark"||s==="system"?s:"dark";var r=m==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;document.documentElement.classList.toggle("dark",r==="dark");document.documentElement.dataset.theme=r;document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.classList.add("dark");document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark";}})();`;
