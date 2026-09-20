import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";
import type { ICalendarEventBody } from "./useCreateCalendarEvent";

export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["update calendar event"],
    mutationFn: async ({
      id,
      ...body
    }: ICalendarEventBody & { id: string }) => {
      const response = await api.patch(`/auth/calendar/${id}`, body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};
