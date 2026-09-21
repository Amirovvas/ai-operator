"use client";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/appSidebar/AppSidebar";
import { LogoMark } from "@/components/layout/Logo";
import { isPublicRoute } from "@/lib/routes";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
interface IProps {
  children: React.ReactNode;
}

// токен лежит в localStorage — читаем его как внешнее хранилище (в том числе
// из других вкладок через событие storage), без setState внутри эффекта
const subscribeToken = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const getHasToken = () => !!localStorage.getItem("accessToken");
const getServerHasToken = () => false;

// Защита маршрутов: без accessToken любая страница, кроме входа/регистрации,
// сразу отправляет на /login. Пока проверка не завершилась, закрытые страницы
// не рендерятся вовсе — иначе их содержимое мигнуло бы перед редиректом.
const AuthGate = ({ children }: IProps) => {
  const pathname = usePathname();
  const { replace } = useRouter();
  const isPublic = isPublicRoute(pathname);
  // снимок перечитывается при каждом рендере (смена маршрута после логина)
  // и при выходе в другой вкладке — тогда закрытая страница сразу уходит на /login
  const isAuthorized = useSyncExternalStore(
    subscribeToken,
    getHasToken,
    getServerHasToken,
  );

  useEffect(() => {
    if (!isAuthorized && !isPublic) {
      replace("/login");
    }
  }, [isAuthorized, isPublic, replace]);

  // страницы входа/регистрации — без сайдбара, на всю ширину
  if (isPublic) return <>{children}</>;

  if (!isAuthorized) return null;

  return (
    <div className="layout">
      <SidebarProvider>
        <AppSidebar />
        {/* на десктопе кнопка сворачивания сайдбара как раньше, на телефоне —
            в верхней панели ниже */}
        <SidebarTrigger className="hidden lg:inline-flex" />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mobile-topbar">
            <SidebarTrigger />
            <LogoMark size={20} />
            <span>AI Operator</span>
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </SidebarProvider>
    </div>
  );
};

const LayoutClient = ({ children }: IProps) => {
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
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
};

export default LayoutClient;
