import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

// удаление = перенос переписки в корзину Gmail (её можно вернуть в течение 30 дней)
export const useDeleteGmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["delete gmail"],
    mutationFn: async (threadId: string) => {
      const response = await api.delete(`/auth/gmail/threads/${threadId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmails"] });
    },
  });
};
