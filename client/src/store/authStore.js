import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  isChecked: false, // becomes true once we've asked the server "am I logged in?"
  setUser: (user) => set({ user, isChecked: true }),
  clearUser: () => set({ user: null, isChecked: true }),
}));