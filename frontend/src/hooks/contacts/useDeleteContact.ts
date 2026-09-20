import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["delete contact"],
    mutationFn: async (id: number) => {
      const response = await api.delete(`/contacts/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["deals"],
      });
    },
  });
};
