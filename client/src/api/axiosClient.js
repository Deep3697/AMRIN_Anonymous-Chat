import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,
});

// Track whether a token refresh is already in progress to avoid parallel refresh calls
let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401s on protected API calls (skip all /auth/* routes)
    const isAuthRoute = Boolean(
      originalRequest?.url &&
      (originalRequest.url.includes("/auth/") || originalRequest.url.startsWith("auth/"))
    );

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      if (isRefreshing) {
        // Another refresh is in flight — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call /auth/session — the server will use the refreshToken cookie
        // to issue a new accessToken cookie silently
        await axiosClient.get("/auth/session");
        processQueue(null);
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — session truly expired, redirect to login if on protected route
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path !== "/login" && path !== "/register" && path !== "/forgot-password" && path !== "/") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;