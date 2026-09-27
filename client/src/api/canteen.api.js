import axiosClient from "./axiosClient";

export const fetchCanteens = () => axiosClient.get("/canteen");
export const submitCanteenVote = (canteenId, level) => axiosClient.post("/canteen/vote", { canteenId, level });
