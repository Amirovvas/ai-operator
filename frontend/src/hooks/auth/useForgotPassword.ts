import { useMutation } from "@tanstack/react-query";
import { api } from "../api/api";

export const useForgotPassword = () =>
  useMutation({
    mutationKey: ["forgot-password"],
    mutationFn: async (body: { email: string }) => {
      const response = await api.post("/auth/forgot-password", body);
      return response.data;
    },
  });
