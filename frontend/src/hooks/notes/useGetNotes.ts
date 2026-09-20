import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";

export const useGetNotes = () =>
  useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const response = await api.get(`/notes`);
      return response.data.data;
    },
  });
