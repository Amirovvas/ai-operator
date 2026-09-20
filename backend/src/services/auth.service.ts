import jwt, { decode } from "jsonwebtoken";
import { createGoogleOAuthClient } from "../config/googleOAuth";

import { pool } from "../plugins/pg";
import bcrypt from "bcryptjs";
import { apiErrors } from "../utils/apiErrors";
import { generateTokens, refresh_secret } from "../utils/generateToken";
import { templateService } from "./gmail.service";

interface IBody {
  name: string;
  email: string;
  password: string;
  avatar: string;
}
interface ILoginBody {
  email: string;
  password: string;
}

export const registerService = async (body: IBody) => {
  // hashed password
  // send
  const hashedPassword = await bcrypt.hash(body.password, 9);
  const result = await pool.query(
    `
       insert into users (name, email, password, avatar)
        values ($1, $2, $3, $4)
           returning email, id, avatar, name
        
        `,
    [body.name, body.email, hashedPassword, body.avatar],
  );
  return result.rows[0];
};

export const loginService = async (body: ILoginBody) => {
  // pull data(user)
  // compare password
  // create tokens

  const result = await pool.query(
    `
    select * from users where email =$1

    `,
    [body.email],
  );

  if (!result.rows[0]) {
    throw apiErrors.notFound("Email is not registered yet");
  }
  const isMatchedPassword = await bcrypt.compare(
    body.password,
    result.rows[0].password,
  );
  if (!isMatchedPassword) throw apiErrors.badRequest("Wrong password");

  let tokens = generateTokens({
    id: result.rows[0].id,
    email: result.rows[0].email,
    name: result.rows[0].name,
  });

  await pool.query(
    `update users
    set refresh_token = $1
    where email = $2

    `,
    [tokens.refreshToken, body.email],
  );

  return {
    user: {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      avatar: result.rows[0].avatar,
    },
    tokens,
  };
};

export const refreshService = async (refreshToken: string) => {
  // verify
  // check it exist?
  // create tokens
  // save refresh_token
  if (!refreshToken) throw apiErrors.unauthorized("unauthorized");

  let decoded: any;
  decoded = jwt.verify(refreshToken, refresh_secret);
  const result = await pool.query(
    `
    select * from users where email = $1

        `,
    [decoded.email],
  );

  if (!result.rows[0] || result.rows[0].refresh_token !== refreshToken)
    throw apiErrors.unauthorized("unauthorized");
  // rotate
  let tokens = generateTokens({
    id: result.rows[0].id,
    email: result.rows[0].email,
    name: result.rows[0].name,
  });
  await pool.query(
    `
    update users
    set refresh_token = $1
    where email = $2

    `,
    [tokens.refreshToken, decoded.email],
  );
  return tokens;
};

export const profileService = async (refreshToken: string) => {
  const result = await pool.query(
    `
     select id, name, email, avatar, google_id, created_at from users
     where refresh_token = $1

        `,
    [refreshToken],
  );
  return result.rows[0];
};
export const logoutService = async (refreshToken: string) => {
  const result = await pool.query(
    `
   update users 
   set refresh_token = null
   where refresh_token = $1
   returning *
        `,
    [refreshToken],
  );
  return result.rows[0];
};

const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 минут

export const forgotPasswordService = async (email: string) => {
  const res = await pool.query(`select * from users where email = $1`, [email]);
  // намеренно не бросаем ошибку, если email не зарегистрирован — иначе этот
  // эндпоинт позволяет перебором узнавать, какие email существуют в системе
  if (!res.rows[0]) return;

  const reset_code = Math.floor(100000 + Math.random() * 900000);
  const reset_code_expires_at = new Date(Date.now() + RESET_CODE_TTL_MS);

  await pool.query(
    `update users set reset_code = $1, reset_code_expires_at = $2 where email = $3`,
    [reset_code, reset_code_expires_at, email],
  );

  await templateService(email, reset_code);
};

const findUserByValidCode = async (email: string, code: number) => {
  const res = await pool.query(
    `select * from users where email = $1 and reset_code = $2`,
    [email, code],
  );
  const user = res.rows[0];

  if (
    !user ||
    !user.reset_code_expires_at ||
    new Date(user.reset_code_expires_at) < new Date()
  ) {
    throw apiErrors.badRequest("Invalid or expired reset code");
  }

  return user;
};

export const verifyPasswordService = async (email: string, code: number) => {
  await findUserByValidCode(email, code);
};

export const resetPasswordService = async (
  email: string,
  code: number,
  newPassword: string,
) => {
  await findUserByValidCode(email, code);

  const hashedPassword = await bcrypt.hash(newPassword, 8);

  // код одноразовый — после успешного сброса сразу гасим его,
  // иначе им можно было бы воспользоваться повторно
  await pool.query(
    `update users
     set password = $1, reset_code = null, reset_code_expires_at = null
     where email = $2`,
    [hashedPassword, email],
  );
};

// calendar
import { google } from "googleapis";

export const getCalendarEvents = async (
  accessToken: any,
  refreshToken?: any,
) => {
  const auth = createGoogleOAuthClient();

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth });

  const result = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date(new Date().setDate(1)).toISOString(), // с начала месяца
    maxResults: 100,
    singleEvents: true,
    orderBy: "startTime",
  });

  return result.data.items || [];
};

const isDateOnly = (value?: string): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

// YYYY-MM-DD + N дней (в UTC, чтобы часовой пояс сервера не сдвигал день)
const addDaysToDate = (value: string, days: number) => {
  const d = new Date(`${value}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const createCalendarEvent = async (
  accessToken: any,
  refreshToken: any,
  event: { summary: string; description?: string; start: string; end?: string },
) => {
  const auth = createGoogleOAuthClient();

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth });

  // событие на весь день: start приходит как YYYY-MM-DD, Google принимает такие
  // только через date (не dateTime), а end у него эксклюзивный — +1 день
  if (isDateOnly(event.start)) {
    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.summary,
        description: event.description ?? null,
        start: { date: event.start },
        end: {
          date: isDateOnly(event.end) ? event.end : addDaysToDate(event.start, 1),
        },
      },
    });

    return result.data;
  }

  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Invalid start date: ${event.start}`);
  }
  const end = event.end
    ? new Date(event.end)
    : new Date(start.getTime() + 60 * 60 * 1000);
  if (Number.isNaN(end.getTime())) {
    throw new Error(`Invalid end date: ${event.end}`);
  }

  const result = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description ?? null,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  return result.data;
};

// общий клиент Calendar и поиск события — для update/delete
const createCalendarClient = (accessToken: any, refreshToken: any) => {
  const auth = createGoogleOAuthClient();

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.calendar({ version: "v3", auth });
};

const getHttpStatus = (error: any) =>
  Number(error?.response?.status ?? error?.code) || 0;

// после "да" на подтверждение удаления модель уже не помнит id из прошлого хода
// и подставляет вместо него название — Google отвечает 404/400 и событие не
// удаляется. Поэтому сначала пробуем id, а если он не подошёл — ищем событие
// по названию (в окне от года назад, а не только в текущем месяце)
const resolveCalendarEvent = async (
  calendar: ReturnType<typeof createCalendarClient>,
  eventId?: string,
  title?: string,
) => {
  if (eventId) {
    try {
      const { data } = await calendar.events.get({ calendarId: "primary", eventId });
      if (data.status !== "cancelled") return data;
    } catch (error: any) {
      if (![400, 404, 410].includes(getHttpStatus(error))) throw error;
    }
  }

  const query = (title || eventId || "").trim();
  if (!query) throw new Error("Event id or title is required");

  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const { data } = await calendar.events.list({
    calendarId: "primary",
    q: query,
    timeMin: yearAgo.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const found = (data.items || []).filter((e) => e.status !== "cancelled");
  const exact = found.filter(
    (e) => (e.summary || "").trim().toLowerCase() === query.toLowerCase(),
  );
  const matches = exact.length ? exact : found;

  if (matches.length === 0) {
    throw new Error(`Calendar event "${query}" was not found`);
  }
  if (matches.length > 1) {
    const list = matches
      .slice(0, 5)
      .map(
        (e) =>
          `"${e.summary || "(no title)"}" ${e.start?.dateTime || e.start?.date} (id: ${e.id})`,
      )
      .join("; ");
    throw new Error(
      `Several events match "${query}": ${list}. Ask the user which one they mean.`,
    );
  }

  return matches[0]!;
};

export const updateCalendarEvent = async (
  accessToken: any,
  refreshToken: any,
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    start?: string;
    end?: string;
    title?: string;
  },
) => {
  const calendar = createCalendarClient(accessToken, refreshToken);

  // title — текущее название события, нужно только если id не подошёл
  const current = await resolveCalendarEvent(calendar, eventId, event.title);
  eventId = current.id!;

  // patch — частичное обновление: меняем только переданные поля, как и в
  // update-сервисах у notes/tasks/contacts/deals
  const requestBody: Record<string, any> = {};
  if (event.summary !== undefined) requestBody.summary = event.summary;
  if (event.description !== undefined) requestBody.description = event.description;

  if (event.start || event.end) {
    // текущее событие нужно, чтобы при смене только start (например, "перенеси
    // на 5 вечера") сохранить длительность — иначе старый end оказывается
    // раньше нового start, и Google отвечает "The specified time range is empty"
    const isAllDay = !current.start?.dateTime;

    const parse = (value: string, label: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${label} date: ${value}`);
      return date;
    };
    const HOUR = 60 * 60 * 1000;

    if (isAllDay) {
      // all-day событие: Google принимает только date (YYYY-MM-DD), dateTime даст ошибку
      // берём YYYY-MM-DD прямо из строки, чтобы часовой пояс сервера не сдвинул день
      const toDate = (value: string, label: string) =>
        /^\d{4}-\d{2}-\d{2}/.test(value)
          ? value.slice(0, 10)
          : parse(value, label).toLocaleDateString("en-CA");

      const oldStart = current.start?.date || "";
      const oldEnd = current.end?.date || "";
      const days = Math.max(
        1,
        Math.round((Date.parse(oldEnd) - Date.parse(oldStart)) / (24 * HOUR)) || 1,
      );

      const start = event.start ? toDate(event.start, "start") : oldStart;
      // end у all-day эксклюзивный — по умолчанию сохраняем прежнюю длительность
      const end = event.end
        ? toDate(event.end, "end")
        : event.start
          ? addDaysToDate(start, days)
          : oldEnd;

      requestBody.start = { date: start };
      requestBody.end = { date: end };
    } else {
      const oldStart = parse(current.start!.dateTime!, "start");
      const oldEnd = parse(current.end?.dateTime || current.start!.dateTime!, "end");
      const duration = oldEnd.getTime() - oldStart.getTime() || HOUR;

      const start = event.start ? parse(event.start, "start") : oldStart;
      // передали только start — двигаем end так, чтобы длительность не менялась;
      // передали только end — start остаётся прежним
      const end = event.end ? parse(event.end, "end") : new Date(start.getTime() + duration);

      if (end.getTime() <= start.getTime()) {
        throw new Error("End time must be after start time");
      }

      // start и end отправляем всегда вместе, иначе Google проверит новый
      // start против старого end (или наоборот)
      requestBody.start = { dateTime: start.toISOString() };
      requestBody.end = { dateTime: end.toISOString() };
    }
  }

  const result = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody,
  });

  // отдаём модели компактный результат, а не весь объект события Google
  return {
    id: result.data.id,
    title: result.data.summary || "(no title)",
    start: result.data.start?.dateTime || result.data.start?.date || null,
    end: result.data.end?.dateTime || result.data.end?.date || null,
    updated: true,
  };
};

export const deleteCalendarEvent = async (
  accessToken: any,
  refreshToken: any,
  eventId?: string,
  title?: string,
) => {
  const calendar = createCalendarClient(accessToken, refreshToken);

  const event = await resolveCalendarEvent(calendar, eventId, title);

  try {
    await calendar.events.delete({ calendarId: "primary", eventId: event.id! });
  } catch (error: any) {
    // 410 — событие уже удалено, для пользователя результат тот же
    if (getHttpStatus(error) !== 410) throw error;
  }

  return { id: event.id, title: event.summary || "(no title)", deleted: true };
};

//

// drive
export const getDriveFiles = async (accessToken: any, refreshToken?: any) => {
  const auth = createGoogleOAuthClient();

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const drive = google.drive({ version: "v3", auth });

  const result = await drive.files.list({
    pageSize: 50,
    orderBy: "modifiedTime desc",
    fields:
      "files(id, name, mimeType, iconLink, webViewLink, modifiedTime, size, starred, owners(displayName))",
  });

  return result.data.files || [];
};
// drive
