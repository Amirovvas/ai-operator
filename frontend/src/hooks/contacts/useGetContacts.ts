import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";

export const useGetContacts = () =>
  useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const response = await api.get(`/contacts`);
      return response.data.data;
    },
  });
