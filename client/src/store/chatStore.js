import { create } from "zustand";

export const useChatStore = create((set) => ({
  activeGroupId: null,
  activeThreadType: "group",
  setActiveGroupId: (id, type = "group") => set({ activeGroupId: id, activeThreadType: type }),
}));