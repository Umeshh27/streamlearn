import { create } from "zustand";

export const useSidebarStore = create((set) => ({
  isOpen:
    typeof window !== "undefined" && window.innerWidth < 768
      ? false
      : localStorage.getItem("streamlearn-sidebar-open") !== "false",
  toggleSidebar: () =>
    set((state) => {
      const next = !state.isOpen;
      queueMicrotask(() => {
        try {
          localStorage.setItem("streamlearn-sidebar-open", String(next));
        } catch {
          // Ignore localStorage quota or private-mode write errors
        }
      });
      return { isOpen: next };
    }),
  closeSidebar: () => {
    queueMicrotask(() => {
      try {
        localStorage.setItem("streamlearn-sidebar-open", "false");
      } catch {
        // Ignore localStorage quota or private-mode write errors
      }
    });
    set({ isOpen: false });
  },
  openSidebar: () => {
    queueMicrotask(() => {
      try {
        localStorage.setItem("streamlearn-sidebar-open", "true");
      } catch {
        // Ignore localStorage quota or private-mode write errors
      }
    });
    set({ isOpen: true });
  },
}));
