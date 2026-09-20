import { useMutation } from "@tanstack/react-query";
import { api } from "../api/api";

export const useLogout = () =>
  useMutation({
    mutationKey: ["logout"],
    mutationFn: async () => {
      const response = await api.post("/auth/logout");
      return response.data;
    },
    onSuccess: () => {
      localStorage.removeItem("accessToken");
      window.location.href = "http://localhost:3000/login";
    },
  });
