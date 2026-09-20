import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

// start/end — ISO date-time, либо YYYY-MM-DD для события на весь день
export interface ICalendarEventBody {
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
}

export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["create calendar event"],
    mutationFn: async (body: ICalendarEventBody) => {
      const response = await api.post("/auth/calendar", body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};
