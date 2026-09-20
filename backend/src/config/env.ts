import "dotenv/config";

// без этих переменных приложение не должно стартовать: лучше упасть сразу с
// понятным сообщением, чем получить "invalid_client" или падение jwt.sign позже
const required = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "GEMINI_API_KEY",
  "SMTP_USER",
  "SMTP_PASS",
  "FRONTEND_URL",
];

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(
    `Missing environment variables: ${missing.join(", ")}. ` +
      `Copy backend/.env.example to backend/.env and fill them in.`,
  );
}
