import axiosClient from "./axiosClient";

export const fetchMutedUsers = () => axiosClient.get("/mutes/list");
export const unmuteUser = (userId) => axiosClient.post(`/mutes/unmute/${userId}`);
