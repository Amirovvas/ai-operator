import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add contact"],

    mutationFn: async (body: {
      name: string;
      email?: string;
      phone?: string;
      company?: string;
      notes?: string;
    }) => {
      const response = await api.post("/contacts", body);

      return response.data.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contacts"],
      });
    },
  });
};
