import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

interface UpdateContactBody {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update contact"],

    mutationFn: async ({ id, ...body }: UpdateContactBody) => {
      const response = await api.put(`/contacts/${id}`, body);

      return response.data.data;
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
