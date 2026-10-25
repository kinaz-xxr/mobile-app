import { authEventEmitter } from "@/utils/eventEmitter";
import { devError, devLog } from "@/utils/logger";
import {
  getAuthTokens,
  getUserType,
  removeAuthTokens,
  storeAuthTokens,
} from "@/utils/tokens/secureStorage";
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";

const baseURL = process.env.EXPO_PUBLIC_UOFT_STAGING;

const ENDPOINTS_WITHOUT_AUTH = [
  // Auth endpoints
  "/api/v13/admins/login",
  "/api/v13/admins/refresh",
  "/api/v13/hackers/login",
  "/api/v13/hackers/google-auth/token",
  "/api/v13/hackers/apple-auth/token",
  "/api/v13/hackers/refresh",
  "/api/v13/judges/sponsor-by-pin",
  "/api/v13/judges/login",
  "/api/v13/judges/session",
  "/api/v13/judges/refresh",
  "/api/v13/judges/logout",
] as const;

export const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
});

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
});

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Execute all queued requests with the new token
 * @param token New access token
 */
const onRefreshed = (token: string): void => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * Add request to the queue
 * @returns Promise that resolves when the token is refreshed
 */
const addSubscriber = (callback: (token: string) => void): void => {
  refreshSubscribers.push(callback);
};

/**
 * Check if an endpoint should skip token injection
 * @param url The request URL
 * @returns boolean indicating if auth should be skipped
 */
const shouldSkipAuth = (url: string): boolean => {
  return ENDPOINTS_WITHOUT_AUTH.some((endpoint) => url?.includes(endpoint));
};

const handleRefreshError = async (): Promise<void> => {
  await removeAuthTokens();

  devLog("Token refresh failed. Emitting onExpiredRefreshToken event.");
  authEventEmitter.emit("onExpiredRefreshToken");

  isRefreshing = false;

  refreshSubscribers.forEach((callback) => callback(""));
  refreshSubscribers = [];
};

axiosInstance.interceptors.request.use(
  async (config) => {
    const skipAuth = shouldSkipAuth(config.url!);
    devLog(`[REQUEST] ${config.url} - Skip auth: ${skipAuth}`);

    if (!skipAuth) {
      try {
        // If a refresh is in progress, wait for it to complete
        if (isRefreshing && refreshPromise) {
          const newToken = await refreshPromise;
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
            devLog(`[REQUEST] Using refreshed token for ${config.url}`);
            return config;
          }
        }

        const tokens = await getAuthTokens();
        const userType = await getUserType();
        if (tokens?.access_token) {
          config.headers.Authorization = `Bearer ${tokens.access_token}`;
          devLog(`[REQUEST] Sending ${userType} token to ${config.url}`);
        }
      } catch (error) {
        devError("Error retrieving access token:", error);
      }
    } else {
      devLog(`[REQUEST] No auth token sent to ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    devLog(`[RESPONSE] ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  async (error: AxiosError) => {
    devError(
      `[RESPONSE ERROR] ${error.config?.url} - Status: ${error.response?.status}`
    );
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthError =
      error.response?.status === 401 || error.response?.status === 403;
    const isTokenEndpoint =
      originalRequest.url?.includes("/api/v13/judges/refresh") ||
      originalRequest.url?.includes("/api/v13/judges/logout") ||
      originalRequest.url?.includes("/api/v13/admins/refresh") ||
      originalRequest.url?.includes("/api/v13/hackers/refresh");
    const isLoginEndpoint =
      originalRequest.url?.includes("/api/v13/admins/login") ||
      originalRequest.url?.includes("/api/v13/hackers/login") ||
      originalRequest.url?.includes("/api/v13/judges/session") ||
      originalRequest.url?.includes("/api/v13/judges/login") ||
      originalRequest.url?.includes("/api/v13/judges/sponsor-by-pin");

    if (
      isAuthError &&
      !originalRequest._retry &&
      !isTokenEndpoint &&
      !isLoginEndpoint
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        try {
          return new Promise((resolve, reject) => {
            addSubscriber((token: string) => {
              if (!token) {
                reject(error);
                return;
              }
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(axiosInstance(originalRequest));
            });
          });
        } catch (_) {
          return Promise.reject(error);
        }
      }

      isRefreshing = true;

      // Create a promise for the refresh operation
      refreshPromise = (async () => {
        try {
          // Get the refresh token and user type
          const tokens = await getAuthTokens();
          const userType = await getUserType();

          if (!tokens?.refresh_token) {
            throw new Error("No refresh token available");
          }

          // Use the correct refresh endpoint based on user type
          const refreshEndpoint =
            userType === "judge"
              ? "/api/v13/judges/refresh"
              : userType === "hacker"
                ? "/api/v13/hackers/refresh"
                : "/api/v13/admins/refresh";

          const refreshResponse = await axiosInstance.post(refreshEndpoint, {
            refresh_token: tokens.refresh_token,
          });

          if (!refreshResponse?.data?.access_token) {
            throw new Error("Failed to refresh token");
          }

          const { access_token, refresh_token } = refreshResponse.data;

          await storeAuthTokens(access_token, refresh_token);

          return access_token;
        } catch (error) {
          await handleRefreshError();
          throw error;
        }
      })();

      try {
        const access_token = await refreshPromise;

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        isRefreshing = false;
        refreshPromise = null;
        onRefreshed(access_token);

        return axiosInstance(originalRequest);
      } catch (_) {
        isRefreshing = false;
        refreshPromise = null;
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
