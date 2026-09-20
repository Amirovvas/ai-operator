import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

interface UpdateDealBody {
  id: number;
  title?: string;
  contact_id?: number;
  amount?: number | null;
  stage?: "new" | "in_progress" | "won" | "lost";
  notes?: string;
}

export const useUpdateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update deal"],

    mutationFn: async ({ id, ...body }: UpdateDealBody) => {
      const response = await api.put(`/deals/${id}`, body);

      return response.data.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deals"],
      });
    },
  });
};
