import axiosClient from "./axiosClient";
export const fetchMyGroups = () => axiosClient.get("/groups/my-groups");