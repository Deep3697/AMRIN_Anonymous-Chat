import axiosClient from "./axiosClient";

export const startConversation = (otherUserId) => axiosClient.post("/conversations/start", { otherUserId });
export const fetchMyConversations = () => axiosClient.get("/conversations/my-conversations");