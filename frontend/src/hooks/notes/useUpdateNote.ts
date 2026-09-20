import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

interface UpdateNoteBody {
  id: number;
  title: string;
  content: string;
}

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update note"],

    mutationFn: async ({ id, title, content }: UpdateNoteBody) => {
      const response = await api.put(`/notes/${id}`, {
        title,
        content,
      });

      return response.data.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notes"],
      });
    },
  });
};
