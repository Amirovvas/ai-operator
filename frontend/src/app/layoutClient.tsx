"use client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/appSidebar/AppSidebar";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
interface IProps {
  children: React.ReactNode;
}

const layoutClient = ({ children }: IProps) => {
  // без staleTime каждый заход/возврат на страницу заново дёргает API, даже
  // если данные только что были получены — мутации (create/update/delete)
  // всё равно сами вызывают invalidateQueries, так что свежесть не страдает
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={qc}>
      <div className="layout">
        <SidebarProvider>
          <AppSidebar />
          <SidebarTrigger />

          <main className="flex-1">{children}</main>
        </SidebarProvider>
      </div>
    </QueryClientProvider>
  );
};

export default layoutClient;
