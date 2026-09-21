import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { isPublicRoute } from "@/lib/routes";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// access-токен живёт всего 15 минут (см. backend/src/utils/generateToken.ts),
// поэтому любой запрос, сделанный позже, будет получать 401 — здесь мы один раз
// молча обновляем токен через httpOnly refreshToken-cookie и повторяем запрос
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ token: string }>(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((res) => res.data.token)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const isAuthRoute = originalRequest?.url?.includes("/auth/");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();

      if (newToken) {
        localStorage.setItem("accessToken", newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      localStorage.removeItem("accessToken");

      // сессия закончилась и обновить её не удалось — возвращаем на вход
      if (typeof window !== "undefined" && !isPublicRoute(window.location.pathname)) {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);
