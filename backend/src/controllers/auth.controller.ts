import { NextFunction, Request, Response } from "express";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  forgotPasswordService,
  getCalendarEvents,
  getDriveFiles,
  loginService,
  logoutService,
  profileService,
  refreshService,
  registerService,
  resetPasswordService,
  updateCalendarEvent,
  verifyPasswordService,
} from "../services/auth.service";
import {
  getGmailMessages,
  getGmailThread,
  replyToGmailThread,
  trashGmailThread,
} from "../services/gmail.service";
import { pool } from "../plugins/pg";
import { apiErrors } from "../utils/apiErrors";

export const registerController = async (
  req: Request<
    {},
    {},
    {
      name: string;
      email: string;
      password: string;
      avatar: any;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    let body = req.body;

    const avatar = req.file ? `uploads/${req.file.filename}` : "";
    const user = await registerService({ ...body, avatar });
    res.status(201).json({
      message: "registered successfully",
      user,
    });
  } catch (error: any) {
    next(error);
  }
};
export const loginController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      password: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    let body = req.body;
    const { user, tokens } = await loginService(body);
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
    });
    res.status(200).json({
      message: "loginned",
      user: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (error: any) {
    next(error);
  }
};
export const refreshController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      password: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token = req.cookies.refreshToken;

    const result = await refreshService(token);
    // refreshService ротирует refresh-токен в БД — новый нужно вернуть клиенту
    // тем же cookie, иначе следующий /refresh получит уже неактуальный токен
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
    });
    res.status(200).json({
      message: "refresh",
      token: result.accessToken,
    });
  } catch (error: any) {
    next(error);
  }
};
export const profileController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      password: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    let userId = (req as any).user.id;

    const result = await profileService(userId);
    res.status(200).json({
      message: "Profile",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};
export const logoutController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      password: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token = req.cookies.refreshToken;

    const result = await logoutService(token);
    res.status(200).json({
      message: "logoutted",
    });
  } catch (error: any) {
    next(error);
  }
};

export const forgotPasswordController = async (
  req: Request<
    {},
    {},
    {
      email: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    let body = req.body;
    await forgotPasswordService(body.email);
    res.status(200).json({
      message: "forgot sended",
    });
  } catch (error: any) {
    next(error);
  }
};
export const verifyPasswordController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      code: number;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    let body = req.body;
    await verifyPasswordService(body.email, body.code);
    res.status(200).json({
      message: "verified",
    });
  } catch (error: any) {
    next(error);
  }
};
export const resetPasswordController = async (
  req: Request<
    {},
    {},
    {
      email: string;
      code: number;
      newPassword: string;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    let body = req.body;
    await resetPasswordService(body.email, body.code, body.newPassword);
    res.status(200).json({
      message: "created new password",
    });
  } catch (error: any) {
    next(error);
  }
};

export const getGmailController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as { id?: string | number } | undefined)?.id;

    // токены для доступа в gmail храним в бд

    const result = await pool.query(
      `
      select google_refresh, google_access
      from users
      where id = $1
      `,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.google_access) {
      return res.status(400).json({
        message: "Google account is not connected",
      });
    }

    const messages = await getGmailMessages(
      user.google_access,
      user.google_refresh,
    );

    return res.status(200).json({
      message: "Gmail messages",
      data: messages,
    });
  } catch (error: any) {
    console.log("GMAIL ERROR:");
    console.log(error.response?.data);
    console.log(error.message);
    next(error);
  }
};

//  calendar

export const getCalendarController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as { id?: number } | undefined)?.id;

    const result = await pool.query(
      `select google_refresh, google_access from users where id = $1`,
      [userId],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.google_access) {
      return res
        .status(400)
        .json({ message: "Google account is not connected" });
    }

    const events = await getCalendarEvents(
      user.google_access,
      user.google_refresh,
    );

    return res.status(200).json({ message: "Calendar events", data: events });
  } catch (error) {
    next(error);
  }
};

// create / update / delete событий из Calendar.tsx (то же, что делает AI Chat)

const getGoogleTokensOrThrow = async (req: Request) => {
  const userId = (req.user as { id?: number } | undefined)?.id;

  const result = await pool.query(
    `select google_refresh, google_access from users where id = $1`,
    [userId],
  );

  const user = result.rows[0];
  if (!user) throw apiErrors.notFound("User not found");
  if (!user.google_access) {
    throw apiErrors.badRequest("Google account is not connected");
  }

  return user as { google_access: string; google_refresh: string };
};

// ошибки Google (googleapis) -> понятные HTTP-ошибки нашего API
const toGoogleApiError = (
  error: any,
  service = "Google Calendar",
  notFoundMessage = "Event not found",
) => {
  const status = Number(error?.response?.status ?? error?.code) || 0;
  const message: string =
    error?.response?.data?.error?.message || error?.message || "";

  if (status === 403) {
    return apiErrors.forbidden(
      `${service} write access is missing. Reconnect your Google account (Sign in with Google) and try again.`,
    );
  }
  if (status === 404 || status === 410 || /was not found/i.test(message)) {
    return apiErrors.notFound(notFoundMessage);
  }
  if (
    status === 400 ||
    /^(Invalid|End time|Several events|Event id|Message)/.test(message)
  ) {
    return apiErrors.badRequest(message || "Invalid event data");
  }
  return error;
};

export const createCalendarEventController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getGoogleTokensOrThrow(req);
    const event = await createCalendarEvent(
      user.google_access,
      user.google_refresh,
      req.body,
    );

    return res.status(201).json({ message: "Event created", data: event });
  } catch (error) {
    next(toGoogleApiError(error));
  }
};

export const updateCalendarEventController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getGoogleTokensOrThrow(req);
    const event = await updateCalendarEvent(
      user.google_access,
      user.google_refresh,
      req.params.id,
      req.body,
    );

    return res.status(200).json({ message: "Event updated", data: event });
  } catch (error) {
    next(toGoogleApiError(error));
  }
};

export const deleteCalendarEventController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getGoogleTokensOrThrow(req);
    // только по id: поиск по названию (title) нужен AI Chat, а из UI id известен
    const result = await deleteCalendarEvent(
      user.google_access,
      user.google_refresh,
      req.params.id,
    );

    return res.status(200).json({ message: "Event deleted", data: result });
  } catch (error) {
    next(toGoogleApiError(error));
  }
};

// открыть переписку, ответить, удалить (Gmail.tsx)

export const getGmailThreadController = async (
  req: Request<{ threadId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getGoogleTokensOrThrow(req);
    const thread = await getGmailThread(
      user.google_access,
      user.google_refresh,
      req.params.threadId,
    );

    return res.status(200).json({ message: "Gmail thread", data: thread });
  } catch (error) {
    next(toGoogleApiError(error, "Gmail", "Conversation not found"));
  }
};

export const replyGmailThreadController = async (
  req: Request<{ threadId: string }, {}, { body: string; messageId?: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getGoogleTokensOrThrow(req);
    const result = await replyToGmailThread(
      user.google_access,
      user.google_refresh,
      req.params.threadId,
      req.body.body,
      req.body.messageId,
    );

    return res.status(201).json({ message: "Reply sent", data: result });
  } catch (error) {
    next(toGoogleApiError(error, "Gmail", "Conversation not found"));
  }
};

export const deleteGmailThreadController = async (
  req: Request<{ threadId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getGoogleTokensOrThrow(req);
    const result = await trashGmailThread(
      user.google_access,
      user.google_refresh,
      req.params.threadId,
    );

    return res.status(200).json({ message: "Moved to trash", data: result });
  } catch (error) {
    next(toGoogleApiError(error, "Gmail", "Conversation not found"));
  }
};

// drive

// drive
export const getDriveController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as { id?: number } | undefined)?.id;

    const result = await pool.query(
      `select google_refresh, google_access from users where id = $1`,
      [userId],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.google_access) {
      return res
        .status(400)
        .json({ message: "Google account is not connected" });
    }

    const files = await getDriveFiles(user.google_access, user.google_refresh);

    return res.status(200).json({ message: "Drive files", data: files });
  } catch (error: any) {
    next(error);
  }
};
// drive
