// Страницы, доступные без авторизации: главная (лендинг — её обязана видеть
// проверка Google OAuth), вход, регистрация, восстановление пароля, возврат
// из Google OAuth (там токен только сохраняется), политика и условия.
// Всё остальное — закрытая часть приложения (Dashboard и т. д.).
export const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/google-success",
  "/privacy",
  "/terms",
];

// куда попадает пользователь после успешного входа
export const HOME_AFTER_LOGIN = "/dashboard";

export const isPublicRoute = (pathname: string | null | undefined) =>
  !!pathname &&
  // "/" — только точное совпадение, иначе публичным стал бы весь сайт
  (pathname === "/" ||
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    ));
