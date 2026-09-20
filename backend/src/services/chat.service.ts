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
import { getGmailMessages } from "./gmail.service";

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

const normalizeGmail = (messages: any[]) =>
  messages.map((m) => ({
    id: m.id,
    from: getHeader(m, "From"),
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
// tool declarations — Gemini's functionDeclarations
// =========================================================

const functionDeclarations: any[] = [
  {
    name: "get_gmail_messages",
    description:
      "Get the user's recent Gmail messages. Use limit for 'last N emails' (default 5 if user just says 'the last email'), search to filter by sender/subject/keyword, order 'oldest' for 'the first email'.",
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
    description: "Update an existing note's title and/or content.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        title: { type: "STRING" as const },
        content: { type: "STRING" as const },
      },
      required: ["id"] as string[],
    },
  },
  {
    name: "delete_note",
    description:
      "Delete a note. Only call this after the user has explicitly confirmed the deletion in the conversation.",
    parameters: {
      type: "OBJECT" as const,
      properties: { id: { type: "NUMBER" as const } },
      required: ["id"] as string[],
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
      "Update an existing task: title, description, status, and/or due_date (ISO YYYY-MM-DD).",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        title: { type: "STRING" as const },
        description: { type: "STRING" as const },
        status: {
          type: "STRING" as const,
          enum: ["todo", "in_progress", "done"],
        },
        due_date: { type: "STRING" as const },
      },
      required: ["id"] as string[],
    },
  },
  {
    name: "delete_task",
    description:
      "Delete a task. Only call this after the user has explicitly confirmed the deletion in the conversation.",
    parameters: {
      type: "OBJECT" as const,
      properties: { id: { type: "NUMBER" as const } },
      required: ["id"] as string[],
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
    description: "Update an existing CRM contact's fields.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        name: { type: "STRING" as const },
        email: { type: "STRING" as const },
        phone: { type: "STRING" as const },
        company: { type: "STRING" as const },
        notes: { type: "STRING" as const },
      },
      required: ["id"] as string[],
    },
  },
  {
    name: "delete_contact",
    description:
      "Delete a CRM contact. Only call this after the user has explicitly confirmed the deletion in the conversation.",
    parameters: {
      type: "OBJECT" as const,
      properties: { id: { type: "NUMBER" as const } },
      required: ["id"] as string[],
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
      "Create a new deal linked to an existing contact. If you don't know the contact's id, call get_contacts first.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        title: { type: "STRING" as const },
        contact_id: { type: "NUMBER" as const },
        amount: { type: "NUMBER" as const },
        stage: {
          type: "STRING" as const,
          enum: ["new", "in_progress", "won", "lost"],
        },
        notes: { type: "STRING" as const },
      },
      required: ["title", "contact_id"] as string[],
    },
  },
  {
    name: "update_deal",
    description:
      "Update an existing deal's fields, including moving it to another stage.",
    parameters: {
      type: "OBJECT" as const,
      properties: {
        id: { type: "NUMBER" as const },
        title: { type: "STRING" as const },
        contact_id: { type: "NUMBER" as const },
        amount: { type: "NUMBER" as const },
        stage: {
          type: "STRING" as const,
          enum: ["new", "in_progress", "won", "lost"],
        },
        notes: { type: "STRING" as const },
      },
      required: ["id"] as string[],
    },
  },
  {
    name: "delete_deal",
    description:
      "Delete a deal. Only call this after the user has explicitly confirmed the deletion in the conversation.",
    parameters: {
      type: "OBJECT" as const,
      properties: { id: { type: "NUMBER" as const } },
      required: ["id"] as string[],
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
const GEMINI_TIMEOUT_MS = 25000;

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
  // токен, выданный до расширения scope до calendar, умеет только читать —
  // запись (create/update/delete) вернёт 403 insufficient scopes
  if (
    error?.response?.status === 403 &&
    /insufficient|scope/i.test(message)
  ) {
    return "Google Calendar write access is missing. The user must reconnect their Google account (open http://localhost:5000/auth/google and grant calendar access) and try again.";
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

const runTool = async (
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

    case "get_calendar_events": {
      const user = await getGoogleTokens();
      if (!user?.google_access)
        return { error: "Google account is not connected" };
      const events = normalizeCalendar(
        filterCalendarByRange(
          await getCalendarEvents(user.google_access, user.google_refresh),
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
      return await createNoteService(userId, input);

    case "update_note":
      return await updateNoteService(userId, input.id, input);

    case "delete_note":
      return await deleteNoteService(userId, input.id);

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

    case "create_task":
      return await createTaskService(userId, input);

    case "update_task":
      return await updateTaskService(userId, input.id, input);

    case "delete_task":
      return await deleteTaskService(userId, input.id);

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
      return await createContactService(userId, input);

    case "update_contact":
      return await updateContactService(userId, input.id, input);

    case "delete_contact":
      return await deleteContactService(userId, input.id);

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

    case "create_deal":
      return await createDealService(userId, input);

    case "update_deal":
      return await updateDealService(userId, input.id, input);

    case "delete_deal":
      return await deleteDealService(userId, input.id);

    default:
      return { error: `Unknown tool: ${name}` };
  }
};

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
- You can read Gmail messages and Drive files (read-only).
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

Confirmations:
- Before calling delete_note, delete_task, delete_contact or delete_deal, always first
  ask the user to confirm in plain text and DO NOT call the function yet. Only call it
  after the user clearly confirms (e.g. "yes", "delete it", "confirm") in a following
  message. This rule does NOT apply to delete_calendar_event.

Never lie about actions:
- NEVER tell the user something was created, updated, or deleted unless you actually
  called the matching create_*/update_*/delete_* tool in this turn and it succeeded.
  If you are not calling a tool this turn, do not claim the data changed.

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

  try {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.6-flash", // бесплатный тариф: 1500 запросов/день
          contents,
          config: { systemInstruction, tools: [{ functionDeclarations }] },
        }),
        GEMINI_TIMEOUT_MS,
      );

      const functionCalls = response.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        return { reply: response.text || "", blocks };
      }

      const modelParts = response.candidates?.[0]?.content?.parts ?? [];
      contents.push({ role: "model", parts: modelParts });

      const responseParts = [];
      for (const call of functionCalls) {
        const result = await runTool(
          userId,
          call.name!,
          call.args,
          getGoogleTokens,
        );

        const blockType = LIST_BLOCK_TYPE[call.name!];
        if (blockType && Array.isArray(result)) {
          blocks.push({ type: blockType, items: result });
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
      blocks,
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
