import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";
interface IResponse {
  message: string;
  data: IData[];
}
interface IData {
  threadId: string;
  snippet: string;
  historyId: string;
  id: string;
  internalDate: string;
  labelIds: string[];
  payload: Payload;
  sizeEstimate: number;
}
interface Payload {
  mimeType: string;
  headers: Headers[];
}
interface Headers {
  name: string;
  value: string;
}
export const useGetGmail = () =>
  useQuery({
    queryKey: ["gmails"],
    queryFn: async () => {
      const res = await api.get<IResponse>("/auth/gmail");

      return res.data.data;
    },
  });
