import axiosClient from "./axiosClient";

export const sendHelpMessage = (text) => axiosClient.post("/help/send", { text });
export const fetchMyHelpThread = () => axiosClient.get("/help/my-thread");
export const fetchAllHelpThreads = () => axiosClient.get("/help/all");
export const replyToHelpThread = (threadId, text) => axiosClient.post(`/help/${threadId}/reply`, { text });
export const resolveHelpThread = (threadId) => axiosClient.post(`/help/${threadId}/resolve`);
