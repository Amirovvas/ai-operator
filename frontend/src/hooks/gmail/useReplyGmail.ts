import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

export const useReplyGmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["reply gmail"],
    mutationFn: async ({
      threadId,
      ...body
    }: {
      threadId: string;
      body: string;
      messageId?: string;
    }) => {
      const response = await api.post(
        `/auth/gmail/threads/${threadId}/reply`,
        body,
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["gmail-thread", variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["gmails"] });
    },
  });
};
