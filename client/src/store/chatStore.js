import { create } from "zustand";

const initialGroupId = localStorage.getItem("activeGroupId") || null;
const initialThreadType = localStorage.getItem("activeThreadType") || "group";
const initialThreadName = localStorage.getItem("activeThreadName") || "";

export const useChatStore = create((set) => ({
  activeGroupId: initialGroupId,
  activeThreadType: initialThreadType,
  activeThreadName: initialThreadName,
  setActiveGroupId: (id, type = "group", name = "") => {
    if (id) {
      localStorage.setItem("activeGroupId", id);
      localStorage.setItem("activeThreadType", type);
      localStorage.setItem("activeThreadName", name);
    } else {
      localStorage.removeItem("activeGroupId");
      localStorage.removeItem("activeThreadType");
      localStorage.removeItem("activeThreadName");
    }
    set({ activeGroupId: id, activeThreadType: type, activeThreadName: name });
  },
}));