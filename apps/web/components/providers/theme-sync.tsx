"use client";

import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { hydrateTheme, syncSystemTheme } from "@/src/store/theme/themeSlice";
import { useEffect } from "react";

export function ThemeSync() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.theme.mode);
  useEffect(() => {
    dispatch(hydrateTheme());
  }, [dispatch]);

  useEffect(() => {
    if (mode !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange() {
      dispatch(syncSystemTheme());
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [dispatch, mode]);

  return null;
}
