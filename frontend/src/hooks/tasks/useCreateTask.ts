import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add task"],

    mutationFn: async (body: {
      title?: string;
      description?: string;
      status?: "todo" | "in_progress" | "done";
      due_date?: string | null;
    }) => {
      const response = await api.post("/tasks", body);

      return response.data.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });
};
