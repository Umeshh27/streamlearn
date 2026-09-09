import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("langbridge-theme") || localStorage.getItem("streamify-theme") || "forest",
  setTheme: (theme) => {
    localStorage.setItem("langbridge-theme", theme);
    set({ theme });
  },
}));
