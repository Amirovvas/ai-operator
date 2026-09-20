import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

interface IResponse {
  message: string;
  user: IUser;
}
interface IUser {
  user: {
    id: number;
    email: string;
    avatar: string;
    name: string;
  };
  accessToken: string;
}

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["login"],
    mutationFn: async (body: { password: string; email: string }) => {
      const response = await api.post<IResponse>("/auth/login", body);
      return response.data.user;
    },
    onSuccess: (res) => {
      localStorage.setItem("accessToken", res.accessToken);
      // сайдбар живёт в общем layout и до логина закэшировал пустой профиль —
      // без этого имя/email/фото появились бы только через staleTime
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};
