import { google } from "googleapis";

// один OAuth2-клиент для Gmail/Calendar/Drive вместо копий с захардкоженными
// client id/secret в каждой функции
export const createGoogleOAuthClient = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_CALLBACK_URL!,
  );
