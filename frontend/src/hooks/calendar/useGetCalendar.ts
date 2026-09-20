import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";

interface IResponse {
  message: string;
  data: IGoogleEvent[];
}

export interface IGoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export const useGetCalendar = () =>
  useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const res = await api.get<IResponse>("/auth/calendar");

      return res.data.data;
    },
  });
