import { useMutation } from "@tanstack/react-query";
import { api } from "../api/api";

export const useResetPassword = () =>
  useMutation({
    mutationKey: ["reset-password"],
    mutationFn: async (body: {
      email: string;
      code: number;
      newPassword: string;
    }) => {
      const response = await api.post("/auth/reset-password", body);
      return response.data;
    },
  });
