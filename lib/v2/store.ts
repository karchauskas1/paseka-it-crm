"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface V2State {
  theme: "light" | "dark";
  setTheme: (v: "light" | "dark") => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useV2Store = create<V2State>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (v) => {
        set({ theme: v });
        // Sync with document class for CSS variables
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", v === "dark");
        }
      },
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    { name: "paseka-v2-store" }
  )
);
