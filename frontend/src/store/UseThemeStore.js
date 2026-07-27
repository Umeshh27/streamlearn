import { create } from 'zustand'

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("stremlearn-theme") || "coffee", // Default theme
  setTheme: (theme) => {
    localStorage.setItem("stremlearn-theme", theme);
    set({ theme });
  },
}))