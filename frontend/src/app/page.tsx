import type { Metadata } from "next";
import Landing from "@/components/pages/landing/Landing";

// Публичная главная: её видят без входа (в том числе проверка Google OAuth).
// Закрытый Dashboard теперь живёт на /dashboard.
export const metadata: Metadata = {
  title: "AI Operator — AI assistant for Gmail, Calendar and Drive",
  description:
    "AI Operator connects Gmail, Google Calendar and Google Drive with your tasks, notes and contacts. Ask in plain language and it gets things done.",
};

const page = () => {
  return <Landing />;
};

export default page;
