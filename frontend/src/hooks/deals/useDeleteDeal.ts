import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

export const useDeleteDeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["delete deal"],
    mutationFn: async (id: number) => {
      const response = await api.delete(`/deals/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deals"],
      });
    },
  });
};
