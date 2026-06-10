import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  applyResolvedTheme,
  readStoredThemeMode,
  resolveTheme,
  writeStoredThemeMode,
  type ResolvedTheme,
  type ThemeMode
} from "./theme";

export interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  hydrated: boolean;
}

function createInitialThemeState(): ThemeState {
  return {
    mode: "dark",
    resolved: "dark",
    hydrated: false
  };
}

const initialState: ThemeState = createInitialThemeState();

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    hydrateTheme(state) {
      const mode = readStoredThemeMode() ?? state.mode;
      state.mode = mode;
      state.resolved = resolveTheme(mode);
      state.hydrated = true;
      applyResolvedTheme(state.resolved);
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
      state.resolved = resolveTheme(action.payload);
      state.hydrated = true;
      writeStoredThemeMode(action.payload);
      applyResolvedTheme(state.resolved);
    },
    syncSystemTheme(state) {
      if (state.mode !== "system") {
        return;
      }

      state.resolved = resolveTheme("system");
      applyResolvedTheme(state.resolved);
    }
  }
});

export const { hydrateTheme, setThemeMode, syncSystemTheme } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;
