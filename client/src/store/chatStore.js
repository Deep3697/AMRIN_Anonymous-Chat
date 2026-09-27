import { create } from "zustand";

export const useChatStore = create((set) => ({
  activeGroupId: null,
  activeThreadType: "group",
  activeThreadName: "",
  setActiveGroupId: (id, type = "group", name = "") => set({ activeGroupId: id, activeThreadType: type, activeThreadName: name }),
}));