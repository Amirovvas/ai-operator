import { pool } from "../plugins/pg";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  getDriveFiles,
  updateCalendarEvent,
} from "./auth.service";
import { ai } from "../config/chat";
import { apiErrors } from "../utils/apiErrors";
import {
  createNoteService,
  deleteNoteService,
  getNotesService,
  updateNoteService,
} from "./note.service";
import {
  createTaskService,
  deleteTaskService,
  getTasksService,
  updateTaskService,
} from "./task.service";
import {
  createContactService,
  deleteContactService,
  getContactsService,
  updateContactService,
} from "./contact.service";
import {
  createDealService,
  deleteDealService,
  getDealsService,
  updateDealService,
} from "./deal.service";
import {
  getGmailMessages,
  getGmailThread,
  replyToGmailThread,
} from "./gmail.service";

interface IChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface IChatBlock {
  type:
    | "gmail"
    | "calendar"
    | "drive"
    | "notes"
    | "tasks"
    | "contacts"
    | "deals";
  items: any[];
}

// =========================================================
// helpers: search / sort / limit — применяются в runTool поверх
// уже существующих сервисов, сами сервисы не трогаем
// =========================================================

const matchesSearch = (text: string, search?: string) =>
  !search || text.toLowerCase().includes(search.toLowerCase());

const applyListParams = (
  items: any[],
  opts: { limit?: number; order?: "latest" | "oldest" },
) => {
  let result = [...items];
  if (opts.order === "oldest") result.reverse();
  if (opts.limit && opts.limit > 0) result = result.slice(0, opts.limit);
  return result;
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
// локальные компоненты даты, а не toISOString — иначе "date"-колонка из
// Postgres (парсится pg как полночь по локальному времени сервера) съезжает
// на день назад/вперёд при UTC-конвертации в часовых поясах с ненулевым смещением
const dateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const filterCalendarByRange = (events: any[], range?: string) => {
  if (!range || range === "month") return events;
  const now = new Date();

  const inRange = (ev: any, start: Date, end: Date) => {
    const dt = ev.start?.dateTime || ev.start?.date;
    if (!dt) return false;
    const d = new Date(dt);
    return d >= start && d <= end;
  };

  if (range === "today")
    return events.filter((ev) => inRange(ev, startOfDay(now), endOfDay(now)));

  if (range === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return events.filter((ev) =>
      inRange(ev, startOfDay(tomorrow), endOfDay(tomorrow)),
    );
  }

  if (range === "upcoming") {
    return events.filter((ev) => {
      const dt = ev.start?.dateTime || ev.start?.date;
      return dt && new Date(dt) >= now;
    });
  }

  return events;
};

const filterTasksByDue = (tasks: any[], due?: string) => {
  if (!due || due === "all") return tasks;
  const now = new Date();
  const today = dateStr(now);

  if (due === "today")
    return tasks.filter(
      (t) => t.due_date && dateStr(new Date(t.due_date)) === today,
    );

  if (due === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = dateStr(tomorrow);
    return tasks.filter(
      (t) => t.due_date && dateStr(new Date(t.due_date)) === tomorrowStr,
    );
  }

  if (due === "overdue")
    return tasks.filter(
      (t) =>
        t.due_date &&
        dateStr(new Date(t.due_date)) < today &&
        t.status !== "done",
    );

  return tasks;
};

const getHeader = (message: any, name: string) =>
  message?.payload?.headers?.find((h: any) => h.name === name)?.value || "";

// "Иван <ivan@mail.com>" -> "ivan@mail.com"
const emailOf = (value: string) =>
  (value.match(/<([^>]+)>/)?.[1] || value).trim().toLowerCase();

const normalizeGmail = (messages: any[]) =>
  messages.map((m) => ({
    id: m.id,
    threadId: m.threadId,
    from: getHeader(m, "From"),
    fromEmail: emailOf(getHeader(m, "From")),
    subject: getHeader(m, "Subject"),
    snippet: m.snippet || "",
    date: m.internalDate
      ? new Date(Number(m.internalDate)).toISOString()
      : null,
  }));

const normalizeCalendar = (events: any[]) =>
  events.map((e) => ({
    id: e.id,
    title: e.summary || "(no title)",
    start: e.start?.dateTime || e.start?.date || null,
    end: e.end?.dateTime || e.end?.date || null,
    location: e.location || "",
  }));

const normalizeDrive = (files: any[]) =>
  files.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink,
    modifiedTime: f.modifiedTime,
    size: f.size,
  }));

// =========================================================
// validation + resolving: параметры от модели ненадёжны (id строкой, id
// неизвестен после "да" в следующем сообщении, "tomorrow" вместо даты, stage
// вне списка). Проверяем и нормализуем здесь, а не отдаём БД сырой текст.
// Ошибки — обычные Error: runTool вернёт их модели как { error }.
// =========================================================

const TASK_STATUSES = ["todo", "in_progress", "done"];
const DEAL_STAGES = ["new", "in_progress", "won", "lost"];

const toId = (value: any): number | null => {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  return Number.isInteger(n) && n > 0 ? n : null;
};

const assertOneOf = (value: any, allowed: string[], label: string) => {
  if (value === undefined || value === null) return;
  if (!allowed.includes(value)) {
    throw new Error(
      `Invalid ${label} "${value}": allowed values are ${allowed.join(", ")}`,
    );
  }
};

// undefined — не менять, null/"" — очистить, иначе только YYYY-MM-DD
const normalizeDueDate = (value: any) => {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;
  const day = String(value).trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!day || Number.isNaN(Date.parse(day))) {
    throw new Error(
      `Invalid due_date "${value}": use an absolute date in YYYY-MM-DD format`,
    );
  }
  return day;
};

const normalizeAmount = (value: any) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid amount "${value}": must be a non-negative number`);
  }
  return n;
};

// exactOptionalPropertyTypes: сервисам нельзя передавать ключи со значением
// undefined — выбрасываем их ("не менять" остаётся отсутствием ключа)
const definedOnly = (obj: Record<string, any>): any =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const norm = (value: any) => String(value ?? "").trim().toLowerCase();

// Находит запись по id, а если id нет/не подошёл — по названию (match_title).
// После "удали задачу X" модель не всегда знает id: раньше это заканчивалось
// ошибкой или удалением не того. Неоднозначность не угадываем — возвращаем
// кандидатов, чтобы модель спросила пользователя.
const resolveEntity = async (
  label: "note" | "task" | "contact" | "deal",
  input: any,
  loadAll: () => Promise<any[]>,
  nameOf: (item: any) => string,
  query?: string,
) => {
  const all = await loadAll();
  const id = toId(input.id);

  if (id) {
    const byId = all.find((item) => item.id === id);
    if (byId) return byId;
  }

  const q = norm(query);
  if (!q) {
    throw new Error(
      id
        ? `No ${label} with id ${id} exists. Call get_${label}s to find the right one, or pass match_title.`
        : `Missing ${label} id. Pass id (from get_${label}s) or match_title with the exact title/name.`,
    );
  }

  const exact = all.filter((item) => norm(nameOf(item)) === q);
  const found = exact.length
    ? exact
    : all.filter((item) => norm(nameOf(item)).includes(q));

  if (found.length === 0) {
    throw new Error(`No ${label} matching "${query}" was found.`);
  }
  if (found.length > 1) {
    const list = found
      .slice(0, 5)
      .map((item) => `#${item.id} "${nameOf(item)}"`)
      .join("; ");
    throw new Error(
      `Several ${label}s match "${query}": ${list}. Ask the user which one they mean (or pass the id).`,
    );
  }
  return found[0];
};

// =========================================================
// tool declarations — Gemini's functionDeclarations
// =========================================================

const functionDeclarations: any[] = [
  {
    name: "get_gmail_messages",
    description:
      "Get the user's recent Gmail messages (each has id, threadId, from, fromEmail, subject, snippet, date). Use limit for 'last N emails' (default 5 if user just says 'the last email'), search to filter by sender/subject/keyword, order 'oldest' for 'the first email'.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limit: { type: "NUMBER" as const },
        search: { type: "STRING" as const },
        order: { type: "STRING" as const, enum: ["latest", "oldest"] },
      },
      required: [] as string[],
    },
  },
  {
    name: "read_email",
    description:
      "Read the full text of an email conversation (all messages of the thread). Use it before replying when the user did not dictate the reply text, or when asked what an email says. Pass thread_id (from get_gmail_messages) or search (sender name/email or subject) to find the latest matching conversation.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        thread_id: { type: "STRING" as const },
        search: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "reply_to_email",
    description:
      "REALLY send a reply to an email conversation from the user's Gmail (the reply goes to the sender of the latest message and stays in the same thread). body is the exact plain text to send. Pass thread_id (from get_gmail_messages) or search (sender name/email or subject) to pick the conversation. Call it immediately when the user asks to reply/answer/send text to a person — no confirmation is needed.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        thread_id: { type: "STRING" as const },
        search: { type: "STRING" as const },
        body: { type: "STRING" as const },
      },
      required: ["body"] as string[],
    },
  },
  {
    name: "get_calendar_events",
    description:
      "Get the user's Google Calendar events. range='today' for today's events, 'tomorrow' for tomorrow, 'upcoming' for the next events from now on, 'month' (default) for the whole current month.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        range: {
          type: "STRING" as const,
          enum: ["today", "tomorrow", "upcoming", "month"],
        },
        search: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Create a new Google Calendar event. start must be a full ISO date-time computed from today's date given in the system prompt.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        summary: { type: "STRING" as const },
        description: { type: "STRING" as const },
        start: { type: "STRING" as const },
        end: { type: "STRING" as const },
      },
      required: ["summary", "start"] as string[],
    },
  },
  {
    name: "update_calendar_event",
    description:
      "Update an EXISTING Google Calendar event. Use this tool when the user wants to rename, edit, reschedule, move, or change an existing event. NEVER use create_calendar_event for these requests. If the event ID is unknown, call get_calendar_events first, find the matching event, then call this tool with that event ID. For renaming, use summary. For changing the description, use description. For rescheduling, use start and/or end as full ISO date-times (e.g. 2026-09-20T17:00:00) computed from today's date in the system prompt; if only start is given the event keeps its duration. Only provide fields that the user wants to change. title is ONLY the event's CURRENT title, used as a fallback when the id is unavailable — the NEW title always goes in summary.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "STRING" as const },
        title: { type: "STRING" as const },
        summary: { type: "STRING" as const },
        description: { type: "STRING" as const },
        start: { type: "STRING" as const },
        end: { type: "STRING" as const },
      },
      required: ["id"] as string[],
    },
  },
  {
    name: "delete_calendar_event",
    description:
      "Delete a Google Calendar event. Call this immediately when the user asks to delete/remove/cancel an event — no confirmation is needed. Pass id if you know it from get_calendar_events; otherwise pass the event title in title (the server finds the event by title) — never put a title into id.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "STRING" as const },
        title: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_drive_files",
    description: "Get the user's recent Google Drive files.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limit: { type: "NUMBER" as const },
        search: { type: "STRING" as const },
        order: { type: "STRING" as const, enum: ["latest", "oldest"] },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_notes",
    description: "Get the user's saved notes.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limit: { type: "NUMBER" as const },
        search: { type: "STRING" as const },
        order: { type: "STRING" as const, enum: ["latest", "oldest"] },
      },
      required: [] as string[],
    },
  },
  {
    name: "create_note",
    description: "Create a new note for the user.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        title: { type: "STRING" as const },
        content: { type: "STRING" as const },
      },
      required: ["title", "content"] as string[],
    },
  },
  {
    name: "update_note",
    description:
      "Update an existing note's title and/or content. Pass id from get_notes; if the id is unknown pass match_title (the CURRENT note title). New values go in title/content.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        match_title: { type: "STRING" as const },
        title: { type: "STRING" as const },
        content: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "delete_note",
    description:
      "Delete a note. Call it immediately when the user asks to delete/remove it — no confirmation is needed. Pass id from get_notes; if the id is unknown pass match_title (the note title) and the server finds it.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        match_title: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_tasks",
    description:
      "Get the user's tasks. due='today'/'tomorrow'/'overdue' filters by due date, status filters by todo/in_progress/done.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limit: { type: "NUMBER" as const },
        search: { type: "STRING" as const },
        status: {
          type: "STRING" as const,
          enum: ["todo", "in_progress", "done"],
        },
        due: {
          type: "STRING" as const,
          enum: ["today", "tomorrow", "overdue", "all"],
        },
        order: { type: "STRING" as const, enum: ["latest", "oldest"] },
      },
      required: [] as string[],
    },
  },
  {
    name: "create_task",
    description:
      "Create a new task. due_date (if given) must be an absolute ISO date (YYYY-MM-DD) computed from today's date given in the system prompt.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        title: { type: "STRING" as const },
        description: { type: "STRING" as const },
        status: {
          type: "STRING" as const,
          enum: ["todo", "in_progress", "done"],
        },
        due_date: { type: "STRING" as const },
      },
      required: ["title"] as string[],
    },
  },
  {
    name: "update_task",
    description:
      "Update an existing task: title, description, status, and/or due_date (ISO YYYY-MM-DD). Pass id from get_tasks; if the id is unknown pass match_title (the CURRENT task title). New values go in title/description/status/due_date.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        match_title: { type: "STRING" as const },
        title: { type: "STRING" as const },
        description: { type: "STRING" as const },
        status: {
          type: "STRING" as const,
          enum: ["todo", "in_progress", "done"],
        },
        due_date: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "delete_task",
    description:
      "Delete a task. Call it immediately when the user asks to delete/remove it — no confirmation is needed. Pass id from get_tasks; if the id is unknown pass match_title (the task title) and the server finds it.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        match_title: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_contacts",
    description:
      "Get the user's CRM contacts. search matches name/company/email.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limit: { type: "NUMBER" as const },
        search: { type: "STRING" as const },
        order: { type: "STRING" as const, enum: ["latest", "oldest"] },
      },
      required: [] as string[],
    },
  },
  {
    name: "create_contact",
    description: "Create a new CRM contact.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        name: { type: "STRING" as const },
        email: { type: "STRING" as const },
        phone: { type: "STRING" as const },
        company: { type: "STRING" as const },
        notes: { type: "STRING" as const },
      },
      required: ["name"] as string[],
    },
  },
  {
    name: "update_contact",
    description:
      "Update an existing CRM contact's fields. Pass id from get_contacts; if the id is unknown pass match_title (the CURRENT contact name). New values go in name/email/phone/company/notes.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        match_title: { type: "STRING" as const },
        name: { type: "STRING" as const },
        email: { type: "STRING" as const },
        phone: { type: "STRING" as const },
        company: { type: "STRING" as const },
        notes: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "delete_contact",
    description:
      "Delete a CRM contact. Call it immediately when the user asks to delete/remove it — no confirmation is needed. Pass id from get_contacts; if the id is unknown pass match_title (the contact name) and the server finds it.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        match_title: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_deals",
    description:
      "Get the user's CRM deals (sales pipeline). search matches title/contact name. stage filters by pipeline stage.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        limit: { type: "NUMBER" as const },
        search: { type: "STRING" as const },
        stage: {
          type: "STRING" as const,
          enum: ["new", "in_progress", "won", "lost"],
        },
        order: { type: "STRING" as const, enum: ["latest", "oldest"] },
      },
      required: [] as string[],
    },
  },
  {
    name: "create_deal",
    description:
      "Create a new deal linked to an existing contact. Pass contact_id (from get_contacts) or, if the id is unknown, contact_name and the server finds the contact.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        title: { type: "STRING" as const },
        contact_id: { type: "NUMBER" as const },
        contact_name: { type: "STRING" as const },
        amount: { type: "NUMBER" as const },
        stage: {
          type: "STRING" as const,
          enum: ["new", "in_progress", "won", "lost"],
        },
        notes: { type: "STRING" as const },
      },
      required: ["title"] as string[],
    },
  },
  {
    name: "update_deal",
    description:
      "Update an existing deal's fields, including moving it to another stage. Pass id from get_deals; if the id is unknown pass match_title (the CURRENT deal title). New values go in the other fields.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        match_title: { type: "STRING" as const },
        title: { type: "STRING" as const },
        contact_id: { type: "NUMBER" as const },
        contact_name: { type: "STRING" as const },
        amount: { type: "NUMBER" as const },
        stage: {
          type: "STRING" as const,
          enum: ["new", "in_progress", "won", "lost"],
        },
        notes: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
  {
    name: "delete_deal",
    description:
      "Delete a deal. Call it immediately when the user asks to delete/remove it — no confirmation is needed. Pass id from get_deals; if the id is unknown pass match_title (the deal title) and the server finds it.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        match_title: { type: "STRING" as const },
      },
      required: [] as string[],
    },
  },
];

// tool name -> block type, только для GET-инструментов, которые возвращают список
const LIST_BLOCK_TYPE: Record<string, IChatBlock["type"]> = {
  get_gmail_messages: "gmail",
  get_calendar_events: "calendar",
  get_drive_files: "drive",
  get_notes: "notes",
  get_tasks: "tasks",
  get_contacts: "contacts",
  get_deals: "deals",
};

// Gemini API иногда не отвечает вообще (не ошибка, а зависший запрос) —
// без таймаута такой вызов держит HTTP-соединение открытым бесконечно, и
// пользователь вечно видит "Thinking...". Превращаем зависание в понятную
// 503-ошибку, которую уже умеет обрабатывать catch ниже.
// Gemini на бесплатном тарифе отвечает 15-25 секунд даже на простой запрос, а
// ход с инструментами — это 2-3 запроса подряд, поэтому запас нужен побольше
const GEMINI_TIMEOUT_MS = 45000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          Object.assign(new Error("AI request timed out"), { status: 503 }),
        );
      }, ms);
    }),
  ]);
};

// вытаскиваем понятный текст из ошибки googleapis (GaxiosError), а не отдаём
// вызывающему коду сырой объект с вложенными response/data/error
const getGoogleErrorMessage = (error: any) => {
  const message = error?.response?.data?.error?.message || error?.message || "";
  // токен, выданный до расширения scope, умеет только читать —
  // запись (Gmail/Calendar) вернёт 403 insufficient scopes
  if (
    error?.response?.status === 403 &&
    /insufficient|scope/i.test(message)
  ) {
    const reconnect = process.env.GOOGLE_CALLBACK_URL
      ? `${new URL(process.env.GOOGLE_CALLBACK_URL).origin}/auth/google`
      : "the Sign in with Google page";
    return `Google write access (Gmail/Calendar) is missing. The user must reconnect their Google account (open ${reconnect} and grant all requested permissions) and try again.`;
  }
  return (
    error?.response?.data?.error?.message ||
    error?.errors?.[0]?.message ||
    error?.message ||
    "Unknown Google API error"
  );
};

type GoogleTokensGetter = () => Promise<{
  google_access?: string;
  google_refresh?: string;
}>;

// один запрос к БД на весь /chat-запрос, а не на каждый вызов инструмента —
// сценарии вроде daily briefing зовут несколько google-инструментов подряд
// (calendar + gmail), и без мемоизации каждый из них заново тянул бы те же
// google_access/google_refresh из users
const createGoogleTokensGetter = (userId: number): GoogleTokensGetter => {
  let cached: Promise<{
    google_access?: string;
    google_refresh?: string;
  }> | null = null;

  return () => {
    if (!cached) {
      cached = pool
        .query(
          `select google_refresh, google_access from users where id = $1`,
          [userId],
        )
        .then((res) => res.rows[0]);
    }
    return cached;
  };
};

export const runTool = async (
  userId: number,
  name: string,
  input: any,
  getGoogleTokens: GoogleTokensGetter,
) => {
  try {
    return await runToolUnsafe(name, input, userId, getGoogleTokens);
  } catch (error: any) {
    // не даём одной сломанной интеграции (например, недостающий scope у
    // Google Drive) обрушить весь ответ чата — возвращаем причину как данные,
    // модель сама сформулирует это пользователю обычным текстом
    return { error: getGoogleErrorMessage(error) };
  }
};

// Определяем переписку для read_email/reply_to_email: по thread_id, а если его
// нет ("ответь этому человеку" в следующем сообщении) — по поиску среди
// последних писем. Разные отправители под один запрос не угадываем.
const findGmailThreadId = async (
  user: { google_access?: string; google_refresh?: string },
  input: any,
) => {
  if (input.thread_id) return String(input.thread_id).trim();

  const query = String(input.search ?? "").trim();
  if (!query) {
    throw new Error(
      "Missing email reference: pass thread_id (from get_gmail_messages) or search (sender name/email or subject). If the user did not say whom to reply to, ask them.",
    );
  }

  const messages = normalizeGmail(
    await getGmailMessages(user.google_access, user.google_refresh),
  );
  const matches = messages.filter((m) =>
    matchesSearch(`${m.from} ${m.subject} ${m.snippet}`, query),
  );

  if (matches.length === 0) {
    throw new Error(`No email matching "${query}" was found among the recent messages.`);
  }

  const senders = [...new Set(matches.map((m) => m.fromEmail))];
  if (senders.length > 1) {
    const list = senders
      .slice(0, 5)
      .map((email) => {
        const m = matches.find((x) => x.fromEmail === email)!;
        return `${m.from} — "${m.subject}" (thread_id ${m.threadId})`;
      })
      .join("; ");
    throw new Error(
      `Several senders match "${query}": ${list}. Ask the user whom they mean, or pass thread_id.`,
    );
  }

  // письма приходят от новых к старым — берём самое свежее
  return matches[0]!.threadId as string;
};

const runToolUnsafe = async (
  name: string,
  input: any,
  userId: number,
  getGoogleTokens: GoogleTokensGetter,
) => {
  switch (name) {
    case "get_gmail_messages": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      const messages = normalizeGmail(
        await getGmailMessages(user.google_access, user.google_refresh),
      );
      const filtered = input.search
        ? messages.filter((m) =>
            matchesSearch(`${m.from} ${m.subject} ${m.snippet}`, input.search),
          )
        : messages;
      return applyListParams(filtered, {
        limit: input.limit || 5,
        order: input.order,
      });
    }

    case "read_email": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      const threadId = await findGmailThreadId(user, input);
      const thread = await getGmailThread(
        user.google_access,
        user.google_refresh as string,
        threadId,
      );
      // модели достаточно последних писем переписки и обрезанных текстов
      return {
        thread_id: thread.id,
        subject: thread.subject,
        messages: thread.messages.slice(-4).map((m) => ({
          from: m.from,
          to: m.to,
          date: m.date,
          is_mine: m.isMine,
          body: m.body.slice(0, 3000),
        })),
      };
    }

    case "reply_to_email": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      const body = typeof input.body === "string" ? input.body.trim() : "";
      if (!body)
        return {
          error: "Reply text is empty: pass the exact text to send in body",
        };
      if (body.length > 20000)
        return { error: "Reply text is too long (max 20000 characters)" };
      const threadId = await findGmailThreadId(user, input);
      const sent = await replyToGmailThread(
        user.google_access,
        user.google_refresh as string,
        threadId,
        body,
      );
      // body возвращаем как есть, чтобы модель показала пользователю именно
      // тот текст, который реально ушёл (в том числе улучшенный)
      return { sent: true, to: sent.to, thread_id: sent.threadId, body };
    }

    case "get_calendar_events": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      const events = normalizeCalendar(
        filterCalendarByRange(
          await getCalendarEvents(user.google_access, user.google_refresh, {
            upcoming: input.range === "upcoming",
          }),
          input.range,
        ),
      );
      return input.search
        ? events.filter((e) =>
            matchesSearch(`${e.title} ${e.location}`, input.search),
          )
        : events;
    }

    case "create_calendar_event": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      return await createCalendarEvent(
        user.google_access,
        user.google_refresh,
        input,
      );
    }

    case "update_calendar_event": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      return await updateCalendarEvent(
        user.google_access,
        user.google_refresh,
        input.id,
        input,
      );
    }

    case "delete_calendar_event": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      return await deleteCalendarEvent(
        user.google_access,
        user.google_refresh,
        input.id,
        input.title,
      );
    }

    case "get_drive_files": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      const files = normalizeDrive(
        await getDriveFiles(user.google_access, user.google_refresh),
      );
      const filtered = input.search
        ? files.filter((f) => matchesSearch(f.name || "", input.search))
        : files;
      return applyListParams(filtered, {
        limit: input.limit,
        order: input.order,
      });
    }

    case "get_notes": {
      const notes = await getNotesService(userId);
      const filtered = input.search
        ? notes.filter((n: any) =>
            matchesSearch(`${n.title} ${n.content}`, input.search),
          )
        : notes;
      return applyListParams(filtered, {
        limit: input.limit,
        order: input.order,
      });
    }

    case "create_note":
      if (!String(input.title ?? "").trim() && !String(input.content ?? "").trim())
        return { error: "A note needs a title or content" };
      return await createNoteService(userId, {
        title: input.title,
        content: input.content,
      });

    case "update_note": {
      const note = await resolveEntity(
        "note",
        input,
        () => getNotesService(userId),
        (n) => n.title,
        input.match_title,
      );
      return await updateNoteService(userId, note.id, {
        title: input.title,
        content: input.content,
      });
    }

    case "delete_note": {
      const note = await resolveEntity(
        "note",
        input,
        () => getNotesService(userId),
        (n) => n.title,
        input.match_title,
      );
      await deleteNoteService(userId, note.id);
      return { deleted: true, id: note.id, title: note.title };
    }

    case "get_tasks": {
      const tasks = await getTasksService(userId);
      let filtered = input.search
        ? tasks.filter((t: any) =>
            matchesSearch(`${t.title} ${t.description}`, input.search),
          )
        : tasks;
      if (input.status)
        filtered = filtered.filter((t: any) => t.status === input.status);
      filtered = filterTasksByDue(filtered, input.due);
      return applyListParams(filtered, {
        limit: input.limit,
        order: input.order,
      });
    }

    case "create_task": {
      if (!String(input.title ?? "").trim())
        return { error: "Task title is required" };
      assertOneOf(input.status, TASK_STATUSES, "status");
      return await createTaskService(userId, definedOnly({
        title: input.title,
        description: input.description,
        status: input.status,
        due_date: normalizeDueDate(input.due_date),
      }));
    }

    case "update_task": {
      assertOneOf(input.status, TASK_STATUSES, "status");
      const task = await resolveEntity(
        "task",
        input,
        () => getTasksService(userId),
        (t) => t.title,
        input.match_title,
      );
      return await updateTaskService(userId, task.id, definedOnly({
        title: input.title,
        description: input.description,
        status: input.status,
        due_date: normalizeDueDate(input.due_date),
      }));
    }

    case "delete_task": {
      const task = await resolveEntity(
        "task",
        input,
        () => getTasksService(userId),
        (t) => t.title,
        input.match_title,
      );
      await deleteTaskService(userId, task.id);
      return { deleted: true, id: task.id, title: task.title };
    }

    case "get_contacts": {
      const contacts = await getContactsService(userId);
      const filtered = input.search
        ? contacts.filter((c: any) =>
            matchesSearch(`${c.name} ${c.company} ${c.email}`, input.search),
          )
        : contacts;
      return applyListParams(filtered, {
        limit: input.limit,
        order: input.order,
      });
    }

    case "create_contact":
      return await createContactService(userId, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        notes: input.notes,
      });

    case "update_contact": {
      const contact = await resolveEntity(
        "contact",
        input,
        () => getContactsService(userId),
        (c) => c.name,
        input.match_title,
      );
      return await updateContactService(userId, contact.id, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        notes: input.notes,
      });
    }

    case "delete_contact": {
      const contact = await resolveEntity(
        "contact",
        input,
        () => getContactsService(userId),
        (c) => c.name,
        input.match_title,
      );
      await deleteContactService(userId, contact.id);
      return { deleted: true, id: contact.id, title: contact.name };
    }

    case "get_deals": {
      const deals = await getDealsService(userId);
      let filtered = input.search
        ? deals.filter((d: any) =>
            matchesSearch(`${d.title} ${d.contact_name}`, input.search),
          )
        : deals;
      if (input.stage)
        filtered = filtered.filter((d: any) => d.stage === input.stage);
      return applyListParams(filtered, {
        limit: input.limit,
        order: input.order,
      });
    }

    case "create_deal": {
      if (!String(input.title ?? "").trim())
        return { error: "Deal title is required" };
      assertOneOf(input.stage, DEAL_STAGES, "stage");
      // сделка привязана к контакту: id не знаем — ищем по имени
      const contact =
        toId(input.contact_id) || !String(input.contact_name ?? "").trim()
          ? null
          : await resolveEntity(
              "contact",
              {},
              () => getContactsService(userId),
              (c) => c.name,
              input.contact_name,
            );
      return await createDealService(userId, definedOnly({
        title: input.title,
        contact_id: contact ? contact.id : toId(input.contact_id),
        amount: normalizeAmount(input.amount),
        stage: input.stage,
        notes: input.notes,
      }));
    }

    case "update_deal": {
      assertOneOf(input.stage, DEAL_STAGES, "stage");
      const deal = await resolveEntity(
        "deal",
        input,
        () => getDealsService(userId),
        (d) => d.title,
        input.match_title,
      );
      const contact = String(input.contact_name ?? "").trim()
        ? await resolveEntity(
            "contact",
            {},
            () => getContactsService(userId),
            (c) => c.name,
            input.contact_name,
          )
        : null;
      return await updateDealService(userId, deal.id, definedOnly({
        title: input.title,
        contact_id: contact ? contact.id : toId(input.contact_id),
        amount: normalizeAmount(input.amount),
        stage: input.stage,
        notes: input.notes,
      }));
    }

    case "delete_deal": {
      const deal = await resolveEntity(
        "deal",
        input,
        () => getDealsService(userId),
        (d) => d.title,
        input.match_title,
      );
      await deleteDealService(userId, deal.id);
      return { deleted: true, id: deal.id, title: deal.title };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
};

const isWriteTool = (name: string) =>
  /^(create|update|delete|reply)_/.test(name);

// Модель заявляет о выполненном действии от первого лица ("I deleted...",
// "Готово, задача удалена", "Письмо отправлено"). Формулировки намеренно узкие,
// чтобы не срабатывать на пересказ данных ("you created a note yesterday").
const CLAIM_PATTERNS = [
  /\bI(?:'ve| have)?\s+(?:just\s+)?(?:deleted|removed|created|added|updated|renamed|moved|rescheduled|sent|replied|marked|changed)\b/i,
  /\b(?:has|have) been (?:deleted|removed|created|added|updated|renamed|moved|sent|marked)\b/i,
  /\b(?:successfully|done[.!:,]?)\s+(?:deleted|removed|created|added|updated|sent)\b/i,
  /(?:^|[\s.!])(?:я\s+)?(?:удалил[аи]?|создал[аи]?|добавил[аи]?|обновил[аи]?|изменил[аи]?|переименовал[аи]?|перенёс|перенес|отправил[аи]?|ответил[аи]?)(?=[\s.,!:]|$)/i,
  /(?:удал[её]н[аоы]?|создан[аоы]?|добавлен[аоы]?|обновл[её]н[аоы]?|отправлен[аоы]?)(?=[\s.,!:]|$)/i,
];

const claimsActionDone = (text: string) =>
  CLAIM_PATTERNS.some((pattern) => pattern.test(text));

// запасной текст, если модель после write-инструмента вернула пустой ответ
const summarizeWrites = (writes: { name: string; result: any }[]) =>
  writes
    .map(({ name, result }) => {
      const what = name.replace(/_/g, " ");
      if (result && typeof result === "object" && "error" in result) {
        return `Could not ${what}: ${result.error}`;
      }
      const label =
        result?.title ?? result?.name ?? result?.summary ?? result?.to;
      return label ? `Done: ${what} — ${label}` : `Done: ${what}`;
    })
    .join("\n");

export const sendChatMessage = async (
  userId: number,
  history: IChatMessage[],
  message: string,
): Promise<{ reply: string; blocks: IChatBlock[] }> => {
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemInstruction = `
You are AI Operator, a personal AI assistant.

Today's date is ${dateStr(today)} (${todayLabel}). Use this to resolve relative dates
like "today", "tomorrow", "next Monday" into absolute ISO dates when calling tools.

About yourself:
- Your name is AI Operator.
- You are an AI assistant created for this application.
- You help users manage and interact with their Gmail, Google Calendar, Google Drive,
  Notes, Tasks, and a CRM (contacts and deals/sales pipeline).
- You can read, create, update and delete notes, tasks, CRM contacts, CRM deals and
  Google Calendar events.
- You can read Gmail messages, read whole email conversations, and REALLY send replies
  to emails from the user's Gmail. Drive files are read-only.
- You can also answer general questions and have normal conversations.

If the user asks "Who are you?", "Who created you?", "What can you do?" or similar,
answer directly using the information above without calling any tool.

Parameters:
- When the user asks for "the last" / "the latest" item, use order="latest" and limit=1.
- When the user asks for "the first" item, use order="oldest" and limit=1.
- When the user gives a number ("last 5 emails"), pass it as limit.
- When the user mentions "today", "tomorrow", "upcoming"/"nearest", map it to the
  matching range/due parameter of the relevant tool instead of filtering yourself.
- When the user searches by a keyword or a person's name, pass it as search.

Context:
- Use the conversation history to resolve references like "this task", "the second one",
  "it", "her" — match them to the item most recently discussed by title or position.
- If you don't already know an item's id from this conversation, call the matching
  get_* tool first to find it, THEN call create/update/delete in the same turn.

Calendar rules:
- If the user asks to create a new calendar event, use create_calendar_event.
- If the user asks to rename, edit, update, move, reschedule, or change an EXISTING
  calendar event, use update_calendar_event.
- NEVER use create_calendar_event when the user wants to modify an existing event.
- If the user identifies an existing event by its title but its id is unknown,
  FIRST call get_calendar_events to find the event.
- After finding the matching event, IMMEDIATELY call update_calendar_event using
  the event's id.
- When renaming an event, pass the new title as "summary".
- When changing the date/time, pass the new values as "start" and/or "end".
- Only include fields that the user explicitly wants to change.

Examples:
- "Create a movie watch event tomorrow" → create_calendar_event
- "Rename movie watch to clean the home" → get_calendar_events → update_calendar_event
- "Change movie watch to tomorrow at 5 PM" → get_calendar_events → update_calendar_event
- "Delete movie watch" → delete_calendar_event immediately (title="movie watch")
- Calendar events are deleted WITHOUT asking for confirmation: as soon as the user asks
  to delete/remove/cancel an event, IMMEDIATELY call delete_calendar_event — with the
  event id if you already have it, otherwise with the event title in "title" (the
  server finds the event by title). Do not ask "are you sure" and do not answer
  without calling the tool. If the tool result says several events match, ask the user
  which one they mean; if it says the event was not found, tell the user.

Deleting (notes, tasks, contacts, deals, calendar events):
- When the user explicitly asks to delete/remove something, DO IT IMMEDIATELY: call the
  delete_* tool in the same turn. Do NOT ask for confirmation.
- If you know the id (from get_* in this turn), pass id. If you do not, pass
  match_title (the title/name the user said) — the server finds the item itself.
  Never invent an id and never put a title into id.
- If the tool answers that several items match, list them briefly and ask which one.
  If it answers that nothing matches, tell the user honestly.
- "Delete all ..." means delete each matching item: call get_* first, then delete_*
  for every item by id.
- Only ask a clarifying question when the request is genuinely ambiguous.

Sending email replies (reply_to_email / read_email):
- "Reply to this person", "Ответь этому человеку", "answer him" — work out WHICH email
  from the conversation (the sender/subject you mentioned earlier, or the email the user
  just named). Pass thread_id if you have it from get_gmail_messages in this turn,
  otherwise pass search (sender name/email or subject). Never guess between different
  people: if the reference is unclear, ask whom to reply to.
- If the user gave NO text ("Reply to him"), first call read_email to read the
  conversation, then write a short, polite, relevant reply in the language of the email
  and send it with reply_to_email. Tell the user what you sent.
- If the user DICTATED the text ("Send this text to him: ..."), send EXACTLY that text
  in body — do not rewrite, shorten, translate or add anything.
- If the user asks to IMPROVE / polish / rewrite the text before sending, improve it
  (fix grammar, make it clearer and more professional; keep the meaning, facts, the
  language and the author's intent; do not invent new facts), then send the improved
  text. If the user asks to only SHOW/draft the improved text first, show it and do NOT
  send until they say to send.
- After reply_to_email succeeds, confirm briefly WHO it was sent to and quote the exact
  text that was sent (use the "body" from the tool result).
- Replies to no-reply addresses are impossible — tell the user.

Never lie about actions:
- NEVER tell the user something was created, updated, deleted or SENT unless you
  actually called the matching create_*/update_*/delete_*/reply_to_email tool in this
  turn and its result did not contain an "error". A get_* call is not an action.
- If you are not calling a tool this turn, do not claim the data changed.
- If a tool returned an error, say what failed, in plain words, and what to do next.

Summaries and daily briefing:
- When asked to summarize something, use the tool results to write a short summary.
- When asked something like "What do I have today?" / "Что у меня сегодня?", call
  get_calendar_events(range="today"), get_tasks(due="today") and
  get_gmail_messages(limit=5) together, then give one short combined summary.

Reply style:
- After calling a get_* tool, the app will show the user a nice structured list by
  itself, so your text reply should be SHORT (one sentence introducing the list) —
  do not repeat every field of every item, but do mention item titles/names in order
  so you can resolve follow-up references like "the second one".
- If a tool result contains an "error" field (e.g. missing Google permissions or a
  disconnected account), explain the problem to the user in plain language — do not
  ignore it and do not pretend the action succeeded.
- Be concise, clear, and helpful.
`;

  const contents: any[] = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const blocks: IChatBlock[] = [];
  const getGoogleTokens = createGoogleTokensGetter(userId);

  // защита от зацикливания function-calling: без лимита один "залипший" ход
  // модели мог бы дёргать Gemini API неограниченное число раз на одно сообщение
  // пользователя и мгновенно сжигать дневную квоту
  const MAX_TOOL_ITERATIONS = 6;

  // что реально сделано в этом ходе (а не то, что модель "рассказала")
  let wroteAnything = false; // вызывался ли create_/update_/delete_/reply_ инструмент
  let succeededWrites = 0; // ...и он завершился без error
  const lastWrite: { name: string; result: any }[] = [];
  let claimRetried = false;

  try {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      // один повтор при 503/таймауте: перегрузка Gemini обычно кратковременная,
      // а без повтора пользователь получал ошибку посреди уже начатого действия.
      // 429 (квота) не повторяем — это только съест остаток лимита.
      let response;
      for (let attempt = 0; ; attempt++) {
        try {
          response = await withTimeout(
            ai.models.generateContent({
              model: "gemini-3.6-flash", // бесплатный тариф: 1500 запросов/день
              contents,
              config: { systemInstruction, tools: [{ functionDeclarations }] },
            }),
            GEMINI_TIMEOUT_MS,
          );
          break;
        } catch (modelError: any) {
          if (modelError?.status === 503 && attempt === 0) continue;
          throw modelError;
        }
      }

      const functionCalls = response.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        const text = response.text || "";

        // Модель написала "удалил/создал/отправил", но ни один write-инструмент
        // не отработал успешно — это ложь о действии. Один раз возвращаем её
        // назад с требованием реально вызвать инструмент.
        if (
          !claimRetried &&
          succeededWrites === 0 &&
          claimsActionDone(text) &&
          iteration < MAX_TOOL_ITERATIONS - 1
        ) {
          claimRetried = true;
          contents.push({
            role: "model",
            parts: [{ text: text || "(no text)" }],
          });
          contents.push({
            role: "user",
            parts: [
              {
                text: "SYSTEM CHECK: you said the action was done, but no create/update/delete/reply tool completed successfully in this turn, so nothing actually changed. Call the correct tool now. If it truly cannot be done, tell the user honestly that it was NOT done and why.",
              },
            ],
          });
          continue;
        }

        // write-инструмент вызывался — пользователю нужен текст-результат, а не
        // список из get_*, вызванного ради поиска id (на фронте текст скрыт,
        // когда есть блоки, и удаление выглядело как "ничего не произошло")
        const finalBlocks = wroteAnything ? [] : blocks;

        if (text) return { reply: text, blocks: finalBlocks };

        if (wroteAnything) {
          return { reply: summarizeWrites(lastWrite), blocks: [] };
        }
        return {
          reply: finalBlocks.length
            ? ""
            : "I couldn't produce an answer. Please try rephrasing your request.",
          blocks: finalBlocks,
        };
      }

      const modelParts = response.candidates?.[0]?.content?.parts ?? [];
      contents.push({ role: "model", parts: modelParts });

      const responseParts = [];
      for (const call of functionCalls) {
        const result = await runTool(
          userId,
          call.name!,
          call.args ?? {},
          getGoogleTokens,
        );

        const blockType = LIST_BLOCK_TYPE[call.name!];
        if (blockType && Array.isArray(result)) {
          blocks.push({ type: blockType, items: result });
        }

        if (isWriteTool(call.name!)) {
          wroteAnything = true;
          const failed = !!(result && typeof result === "object" && "error" in result);
          if (!failed) succeededWrites++;
          lastWrite.push({ name: call.name!, result });
        }

        responseParts.push({
          functionResponse: { name: call.name, response: { result } },
        });
      }

      contents.push({ role: "user", parts: responseParts });
    }

    return {
      reply:
        "Sorry, that took too many steps — could you rephrase or try a simpler request?",
      blocks: wroteAnything ? [] : blocks,
    };
  } catch (error: any) {
    if (error?.status === 429) {
      throw apiErrors.limit(
        "The AI service is rate-limited right now. Please wait a moment and try again.",
      );
    }
    if (error?.status === 503) {
      throw apiErrors.unavailable(
        "The AI service is temporarily overloaded. Please try again in a moment.",
      );
    }
    throw error;
  }
};
