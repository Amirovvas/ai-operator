import { useMutation } from "@tanstack/react-query";
import { api } from "../api/api";

export const useRegister = () =>
  useMutation({
    mutationKey: ["register"],

    mutationFn: async (body: FormData) => {
      const response = await api.post("/auth/register", body);

      return response.data;
    },
  });
