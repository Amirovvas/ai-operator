import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add notes"],

    mutationFn: async (body: { title?: string; content?: string }) => {
      const response = await api.post("/notes", body);
      console.log(response);

      return response.data.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notes"],
      });
    },
  }); 
};
