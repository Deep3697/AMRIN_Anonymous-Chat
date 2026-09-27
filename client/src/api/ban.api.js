import axiosClient from "./axiosClient";

export const banUser = (userId, reason, duration) =>
  axiosClient.post("/bans", { userId, reason, duration });
export const revokeBan = (banId) =>
  axiosClient.post(`/bans/revoke/${banId}`);
export const fetchBannedUsers = () =>
  axiosClient.get("/bans/list");
export const searchUsersForBan = (q) =>
  axiosClient.get(`/bans/search-users?q=${encodeURIComponent(q)}`);
