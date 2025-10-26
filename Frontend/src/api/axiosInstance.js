import axios from "axios";
import { toast } from "sonner";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

// Helper to clear the queue after refresh token attempt
const processQueue = (error) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Handle Rate Limiting (Too Many Requests)
    if (error.response?.status === 429) {
      const message =
        error.response?.data?.message || "Too many requests. Please slow down.";
      toast.error(message);
      return Promise.reject(error);
    }

    // 2. Auth URLs that should never trigger automatic token refresh
    const skipRefreshUrls = [
      "/auth/login",
      "/auth/register",
      "/auth/logout",
      "/auth/refresh",
    ];
    const isSkipUrl = skipRefreshUrls.some((url) =>
      originalRequest.url?.endsWith(url),
    );

    // 3. Handle 401 Unauthorized (Expired Access Token)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isSkipUrl
    ) {
      // If a refresh request is already running, wait in line
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      // Mark request so it doesn't loop infinitely if retry fails
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request a new access token from backend (Updates HTTP-Only Cookie)
        await axiosInstance.post("/auth/refresh");

        // Execute all waiting requests in the queue
        processQueue(null);

        // Retry the original failed request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh token also expired, force logout the user
        processQueue(refreshError);
        localStorage.removeItem("user");
        toast.error("Session expired. Please sign in again.");

        setTimeout(() => {
          window.location.href = "/";
        }, 1000);

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
