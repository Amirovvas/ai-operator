import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

export const useCreateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add deal"],

    mutationFn: async (body: {
      title: string;
      contact_id: number;
      amount?: number | null;
      stage?: "new" | "in_progress" | "won" | "lost";
      notes?: string;
    }) => {
      const response = await api.post("/deals", body);

      return response.data.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deals"],
      });
    },
  });
};
