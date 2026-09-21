import nodemailer from "nodemailer";
import { google } from "googleapis";
import { createGoogleOAuthClient } from "../config/googleOAuth";
export const sender = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const templateService = async (email: string, code: number) => {
  try {
    await sender.sendMail({
      from: process.env.SMTP_USER,
      to: email,

      html: `
      <div>
      <h2>Verify code</h2>
      <p>${code}</p>
      </div>

      `,
    });
  } catch (error) {
    // сбой почтового провайдера не должен ронять весь процесс (было —
    // sendMail() вызывался без await/.catch(), и его отклонённый promise
    // падал как необработанный rejection, убивая весь backend)
    console.error("Failed to send reset-code email:", error);
  }
};

export const getGmailMessages = async (
  accessToken: any,
  refreshToken?: any,
) => {
  const auth = createGoogleOAuthClient();

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20,
  });

  const messages = await Promise.all(
    (list.data.messages || []).map(async (message) => {
      const result = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });

      return result.data;
    }),
  );

  return messages;
};


// =========================================================
// Gmail: открыть переписку, ответить, удалить
// (нужен scope gmail.modify — см. /auth/google в auth.route.ts)
// =========================================================

const createGmailClient = (accessToken: any, refreshToken?: any) => {
  const auth = createGoogleOAuthClient();

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.gmail({ version: "v1", auth });
};

const headerValue = (
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string,
) =>
  headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
  "";

// "Иван Иванов <ivan@mail.com>" -> "ivan@mail.com"
const extractEmail = (value: string) =>
  (value.match(/<([^>]+)>/)?.[1] || value).trim().toLowerCase();

const decodeBase64Url = (data?: string | null) =>
  data ? Buffer.from(data, "base64url").toString("utf8") : "";

const decodeEntities = (text: string) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");

// письма приходят как HTML — на фронт отдаём только текст, чтобы не тащить
// чужую разметку/скрипты в интерфейс
const htmlToText = (html: string) =>
  decodeEntities(
    html
      .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

type MessagePart = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: MessagePart[] | null;
};

const findPartData = (part: MessagePart | undefined, mime: string): string => {
  if (!part) return "";
  if (part.mimeType === mime && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts || []) {
    const found = findPartData(child, mime);
    if (found) return found;
  }
  return "";
};

const MAX_BODY_LENGTH = 50_000;

const extractBody = (payload: MessagePart | undefined, snippet: string) => {
  const plain = findPartData(payload, "text/plain");
  const text =
    plain.trim() || htmlToText(findPartData(payload, "text/html")) || snippet;
  return text.slice(0, MAX_BODY_LENGTH);
};

export const getGmailThread = async (
  accessToken: any,
  refreshToken: any,
  threadId: string,
) => {
  const gmail = createGmailClient(accessToken, refreshToken);

  const [thread, profile] = await Promise.all([
    gmail.users.threads.get({ userId: "me", id: threadId, format: "full" }),
    gmail.users.getProfile({ userId: "me" }),
  ]);
  const me = (profile.data.emailAddress || "").toLowerCase();

  const messages = (thread.data.messages || []).map((m) => {
    const headers = m.payload?.headers || [];
    const from = headerValue(headers, "From");
    return {
      id: m.id!,
      from,
      to: headerValue(headers, "To"),
      cc: headerValue(headers, "Cc"),
      subject: headerValue(headers, "Subject"),
      date: m.internalDate
        ? new Date(Number(m.internalDate)).toISOString()
        : null,
      body: extractBody(m.payload as MessagePart, m.snippet || ""),
      isMine: !!me && extractEmail(from) === me,
    };
  });

  return {
    id: thread.data.id!,
    subject: messages[0]?.subject || "(no subject)",
    me,
    messages,
  };
};

// заголовки не должны содержать переводов строк (header injection)
const cleanHeader = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

// не-ASCII в теме (например, кириллица) кодируем по RFC 2047
const encodeHeader = (value: string) =>
  /^[\x20-\x7e]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;

// имя адресата с кириллицей в сыром заголовке To Gmail разбирает нестабильно —
// в таком случае оставляем только адрес
const encodeRecipient = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) ? value : extractEmail(value);

export const buildReplyRaw = (opts: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | undefined;
  references?: string | undefined;
}) => {
  const subject = /^re:/i.test(opts.subject) ? opts.subject : `Re: ${opts.subject}`;

  const lines = [
    `To: ${encodeRecipient(cleanHeader(opts.to))}`,
    `Subject: ${encodeHeader(cleanHeader(subject))}`,
    ...(opts.inReplyTo ? [`In-Reply-To: ${cleanHeader(opts.inReplyTo)}`] : []),
    ...(opts.references
      ? [`References: ${cleanHeader(opts.references)}`]
      : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    (Buffer.from(opts.body, "utf8").toString("base64").match(/.{1,76}/g) || []).join(
      "\r\n",
    ),
  ];

  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
};

export const replyToGmailThread = async (
  accessToken: any,
  refreshToken: any,
  threadId: string,
  body: string,
  messageId?: string,
) => {
  const gmail = createGmailClient(accessToken, refreshToken);

  const [thread, profile] = await Promise.all([
    gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "metadata",
      metadataHeaders: [
        "From",
        "To",
        "Reply-To",
        "Subject",
        "Message-ID",
        "References",
      ],
    }),
    gmail.users.getProfile({ userId: "me" }),
  ]);
  const me = (profile.data.emailAddress || "").toLowerCase();

  const all = thread.data.messages || [];
  // отвечаем на выбранное письмо, а по умолчанию — на последнее в переписке
  const target = messageId ? all.find((m) => m.id === messageId) : all.at(-1);
  if (!target) {
    throw Object.assign(new Error("Message was not found"), { code: 404 });
  }

  const headers = target.payload?.headers || [];
  const from = headerValue(headers, "From");
  // на своё же письмо "отвечаем" его получателю, а не самому себе
  const to =
    extractEmail(from) === me
      ? headerValue(headers, "To")
      : headerValue(headers, "Reply-To") || from;
  if (!to) throw new Error("Invalid reply: recipient not found");
  // ответ на no-reply адрес уйдёт в никуда (придёт bounce) — лучше сказать сразу
  if (/(^|[^a-z])(no-?reply|do-?not-?reply|mailer-daemon)/i.test(extractEmail(to))) {
    throw new Error(
      `Invalid reply: ${extractEmail(to)} is a no-reply address and does not accept replies`,
    );
  }

  const originalId = headerValue(headers, "Message-ID");
  const references = [headerValue(headers, "References"), originalId]
    .filter(Boolean)
    .join(" ");

  const raw = buildReplyRaw({
    to,
    subject: headerValue(headers, "Subject") || "(no subject)",
    body,
    inReplyTo: originalId || undefined,
    references: references || undefined,
  });

  const sent = await gmail.users.messages.send({
    userId: "me",
    // threadId — чтобы ответ лёг в ту же переписку, а не создал новую
    requestBody: { raw, threadId },
  });

  return { id: sent.data.id, threadId: sent.data.threadId, to };
};

// в корзину, а не навсегда: письмо остаётся в Gmail на 30 дней
export const trashGmailThread = async (
  accessToken: any,
  refreshToken: any,
  threadId: string,
) => {
  const gmail = createGmailClient(accessToken, refreshToken);
  await gmail.users.threads.trash({ userId: "me", id: threadId });
  return { id: threadId, deleted: true };
};
