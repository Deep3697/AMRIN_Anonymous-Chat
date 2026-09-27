import axiosClient from "./axiosClient";

export const submitBanAppeal = (reason) =>
  axiosClient.post("/ban-appeals/submit", { reason });
export const getMyAppealStatus = () =>
  axiosClient.get("/ban-appeals/my-status");
export const fetchPendingAppeals = () =>
  axiosClient.get("/ban-appeals/list");
export const reviewBanAppeal = (appealId, decision, reviewNote) =>
  axiosClient.post(`/ban-appeals/review/${appealId}`, { decision, reviewNote });
