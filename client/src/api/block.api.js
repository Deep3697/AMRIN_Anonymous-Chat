import axiosClient from "./axiosClient";

export const blockUser = (blockedId) => axiosClient.post("/block", { blockedId });
export const unblockUser = (userId) => axiosClient.delete(`/block/${userId}`);
export const getBlockList = () => axiosClient.get("/block/list");
