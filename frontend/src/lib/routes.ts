// страницы, доступные без авторизации: вход, регистрация, восстановление
// пароля и возврат из Google OAuth (там токен только сохраняется)
export const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/google-success",
  "/privacy",
];

export const isPublicRoute = (pathname: string | null | undefined) =>
  !!pathname &&
  PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
