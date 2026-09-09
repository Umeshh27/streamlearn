import { create } from "zustand";

const initialTheme =
  (typeof window !== "undefined" &&
    (localStorage.getItem("langbridge-theme") ||
      localStorage.getItem("streamify-theme"))) ||
  "forest";

if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", initialTheme);
}

export const useThemeStore = create((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    localStorage.setItem("langbridge-theme", theme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    set({ theme });
  },
}));
