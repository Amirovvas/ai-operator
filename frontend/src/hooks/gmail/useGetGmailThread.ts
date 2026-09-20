import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";

export interface IGmailThreadMessage {
  id: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string | null;
  body: string;
  isMine: boolean;
}

export interface IGmailThread {
  id: string;
  subject: string;
  me: string;
  messages: IGmailThreadMessage[];
}

interface IResponse {
  message: string;
  data: IGmailThread;
}

// переписка целиком (все письма ветки) — грузим только когда её открыли
export const useGetGmailThread = (threadId: string | null) =>
  useQuery({
    queryKey: ["gmail-thread", threadId],
    enabled: !!threadId,
    retry: false,
    queryFn: async () => {
      const res = await api.get<IResponse>(`/auth/gmail/threads/${threadId}`);
      return res.data.data;
    },
  });
