import { useQuery } from "@tanstack/react-query";
import { api } from "../api/api";
interface IResponse {
  message: string;
  data: IData;
}
interface IData {
  id: number;
  name: string;
  email: string;
  avatar: string;
  google_id: number;
  created_at: number;
}
export const useProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await api.get<IResponse>(`/auth/profile`);
      // без cookie бэкенд отвечает data: undefined, а react-query не принимает
      // undefined из queryFn — возвращаем null
      return res.data.data ?? null;
    },
  });
