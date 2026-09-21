import { useSyncExternalStore } from "react";

// токен лежит в localStorage — читаем его как внешнее хранилище (в том числе
// из других вкладок через событие storage), без setState внутри эффекта
const subscribeToken = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

export type AuthStatus = "unknown" | "in" | "out";

const getStatus = (): AuthStatus =>
  localStorage.getItem("accessToken") ? "in" : "out";

// На сервере и в первом (гидратационном) рендере localStorage недоступен, и
// "нет токена" ещё не значит "не авторизован". Поэтому отдельное состояние
// "unknown": редиректить на /login можно только когда статус известен ("out"),
// иначе обновление страницы (F5) у авторизованного выбрасывало бы его на /login.
const getServerStatus = (): AuthStatus => "unknown";

export const useAuthStatus = () =>
  useSyncExternalStore(subscribeToken, getStatus, getServerStatus);

export const useHasToken = () => useAuthStatus() === "in";
