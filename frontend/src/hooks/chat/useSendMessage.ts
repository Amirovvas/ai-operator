import { useMutation } from "@tanstack/react-query";
import { api } from "../api/api";

interface IChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatBlockType =
  | "gmail"
  | "calendar"
  | "drive"
  | "notes"
  | "tasks"
  | "contacts"
  | "deals";

export interface IChatBlock {
  type: ChatBlockType;
  items: any[];
}

interface ISendMessageRes {
  message: string;
  data: { reply: string; blocks: IChatBlock[] };
}

export const useSendMessage = () =>
  useMutation({
    mutationKey: ["send-chat-message"],
    mutationFn: async (body: { message: string; history: IChatMessage[] }) => {
      const response = await api.post<ISendMessageRes>("/chat", body);
      return response.data.data;
    },
  });
