import axiosClient from "./axiosClient";

export const fetchSession = () => axiosClient.get("/auth/session");
export const registerEmail = (email) => axiosClient.post("/auth/register", { email });
export const verifyOtp = (email, code) => axiosClient.post("/auth/verify-otp", { email, code });
export const completeProfile = (data) => axiosClient.post("/auth/complete-profile", data);
export const loginUser = (identifier, password) =>
  axiosClient.post("/auth/login", { identifier, password });
export const logoutUser = () => axiosClient.post("/auth/logout");