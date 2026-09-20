import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

interface UpdateTaskBody {
  id: number;
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "done";
  due_date?: string | null;
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update task"],

    mutationFn: async ({ id, ...body }: UpdateTaskBody) => {
      const response = await api.put(`/tasks/${id}`, body);

      return response.data.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });
};
