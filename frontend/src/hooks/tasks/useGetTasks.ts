import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";

export const useGetTasks = () =>
  useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const response = await api.get(`/tasks`);
      return response.data.data;
    },
  });
