import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";

export const useGetDeals = () =>
  useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const response = await api.get(`/deals`);
      return response.data.data;
    },
  });
