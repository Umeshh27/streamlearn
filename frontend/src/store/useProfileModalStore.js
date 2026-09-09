import { create } from "zustand";

export const useProfileModalStore = create((set) => ({
  selectedUserId: null,
  isEditMode: false,
  openProfile: (userId, isEdit = false) => set({ selectedUserId: userId, isEditMode: isEdit }),
  closeProfile: () => set({ selectedUserId: null, isEditMode: false }),
  setEditMode: (isEdit) => set({ isEditMode: isEdit }),
}));
