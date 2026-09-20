"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckSquare,
  DollarSign,
  FileText,
  HardDrive,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";
import { CiCalendar } from "react-icons/ci";
import css from "./dashboard.module.css";
import { useGetTasks } from "@/hooks/tasks/useGetTasks";
import { useGetDeals } from "@/hooks/deals/useGetDeals";
import { useGetContacts } from "@/hooks/contacts/useGetContacts";
import { useGetNotes } from "@/hooks/notes/useGetNotes";
import { useGetCalendar } from "@/hooks/calendar/useGetCalendar";
import { useGetGmail } from "@/hooks/gmail/useGetGmail";
import { useGetDrive } from "@/hooks/drive/useGetDrive";

const isToday = (value?: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const formatShortDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const formatTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatMoney = (value: number) =>
  value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const getHeader = (message: any, name: string) =>
  message?.payload?.headers?.find((h: any) => h.name === name)?.value || "";

const dealStages = [
  { stage: "new", label: "New" },
  { stage: "in_progress", label: "In progress" },
  { stage: "won", label: "Won" },
  { stage: "lost", label: "Lost" },
];

const taskStatuses = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

const Dashboard = () => {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  const { data: tasks } = useGetTasks();
  const { data: deals } = useGetDeals();
  const { data: contacts } = useGetContacts();
  const { data: notes } = useGetNotes();
  const { data: calendarEvents } = useGetCalendar();
  const { data: gmails } = useGetGmail();
  const { data: driveFiles } = useGetDrive();

  const taskList: any[] = tasks || [];
  const dealList: any[] = deals || [];
  const contactList: any[] = contacts || [];
  const noteList: any[] = notes || [];
  const eventList: any[] = calendarEvents || [];
  const gmailList: any[] = gmails || [];
  const driveList: any[] = driveFiles || [];

  // useMemo — иначе пересчитывалось бы на каждый keystroke в поле "Ask AI",
  // хотя ввод вопроса никак не влияет на эти списки
  const todaysEvents = useMemo(
    () =>
      eventList.filter((event) => isToday(event.start?.dateTime || event.start?.date)),
    [eventList],
  );
  const todaysTasks = useMemo(
    () => taskList.filter((task) => isToday(task.due_date)),
    [taskList],
  );
  const pipelineTotal = useMemo(
    () => dealList.reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0),
    [dealList],
  );

  const askAi = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    router.push(`/aiChat?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <main className={css.page}>
      <div className={css.container}>
        <header className={css.header}>
          <h1>Dashboard</h1>
          <p>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </header>

        <div className={css.askBar}>
          <Sparkles size={16} color="#999" />
          <input
            type="text"
            placeholder="Ask AI Operator anything..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && askAi()}
          />
          <button
            className={css.askButton}
            onClick={askAi}
            disabled={!question.trim()}
          >
            Ask
          </button>
        </div>

        <div className={css.grid}>
          {/* TODAY */}
          <section className={`${css.card} ${css.wide}`}>
            <div className={css.cardHeader}>
              <span className={css.cardTitle}>
                <CiCalendar size={16} /> Today
              </span>
            </div>

            <div className={css.todayGrid}>
              <div className={css.todaySection}>
                <h3>Calendar</h3>
                {todaysEvents.length === 0 && (
                  <p className={css.emptyHint}>No events today.</p>
                )}
                {todaysEvents.slice(0, 4).map((event) => (
                  <div key={event.id} className={css.row}>
                    <span className={css.rowTitle}>
                      {event.summary || "(no title)"}
                    </span>
                    <span className={css.rowMeta}>
                      {event.start?.dateTime
                        ? formatTime(event.start.dateTime)
                        : "All day"}
                    </span>
                  </div>
                ))}
              </div>

              <div className={css.todaySection}>
                <h3>Tasks due today</h3>
                {todaysTasks.length === 0 && (
                  <p className={css.emptyHint}>Nothing due today.</p>
                )}
                {todaysTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className={css.row}>
                    <span className={css.rowTitle}>{task.title}</span>
                    <span className={css.rowMeta}>{task.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* TASKS */}
          <section className={css.card}>
            <div className={css.cardHeader}>
              <span className={css.cardTitle}>
                <CheckSquare size={16} /> Tasks
              </span>
              <Link className={css.cardLink} href="/tasks">
                View all
              </Link>
            </div>

            <div className={css.statsRow}>
              {taskStatuses.map((s) => (
                <div key={s.status} className={css.stat}>
                  <span className={css.statValue}>
                    {taskList.filter((t) => t.status === s.status).length}
                  </span>
                  <span className={css.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* DEALS */}
          <section className={css.card}>
            <div className={css.cardHeader}>
              <span className={css.cardTitle}>
                <DollarSign size={16} /> Deals
              </span>
              <Link className={css.cardLink} href="/deals">
                View all
              </Link>
            </div>

            <div className={css.statsRow}>
              {dealStages.map((s) => (
                <div key={s.stage} className={css.stat}>
                  <span className={css.statValue}>
                    {dealList.filter((d) => d.stage === s.stage).length}
                  </span>
                  <span className={css.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className={css.pipelineTotal}>
              <span className={css.rowMeta}>Pipeline value</span>
              <strong>{formatMoney(pipelineTotal)}</strong>
            </div>
          </section>

          {/* CONTACTS */}
          <section className={css.card}>
            <div className={css.cardHeader}>
              <span className={css.cardTitle}>
                <Users size={16} /> Contacts
              </span>
              <Link className={css.cardLink} href="/contacts">
                View all
              </Link>
            </div>

            <div className={css.cardBody}>
              {contactList.length === 0 && (
                <p className={css.emptyHint}>No contacts yet.</p>
              )}
              {contactList.slice(0, 4).map((contact) => (
                <div key={contact.id} className={css.row}>
                  <span className={css.rowTitle}>{contact.name}</span>
                  <span className={css.rowMeta}>{contact.company || ""}</span>
                </div>
              ))}
            </div>
          </section>

          {/* NOTES */}
          <section className={css.card}>
            <div className={css.cardHeader}>
              <span className={css.cardTitle}>
                <FileText size={16} /> Notes
              </span>
              <Link className={css.cardLink} href="/notes">
                View all
              </Link>
            </div>

            <div className={css.cardBody}>
              {noteList.length === 0 && (
                <p className={css.emptyHint}>No notes yet.</p>
              )}
              {noteList.slice(0, 4).map((note) => (
                <div key={note.id} className={css.row}>
                  <span className={css.rowTitle}>
                    {note.title || "Untitled note"}
                  </span>
                  <span className={css.rowMeta}>
                    {formatShortDate(note.updated_at)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* GMAIL */}
          <section className={css.card}>
            <div className={css.cardHeader}>
              <span className={css.cardTitle}>
                <Mail size={16} /> Gmail
              </span>
              <Link className={css.cardLink} href="/gmail">
                View all
              </Link>
            </div>

            <div className={css.cardBody}>
              {gmailList.length === 0 && (
                <p className={css.emptyHint}>No messages found.</p>
              )}
              {gmailList.slice(0, 4).map((message) => (
                <div key={message.id} className={css.row}>
                  <span className={css.rowTitle}>
                    {getHeader(message, "Subject") || "(no subject)"}
                  </span>
                  <span className={css.rowMeta}>
                    {formatShortDate(
                      message.internalDate
                        ? new Date(Number(message.internalDate)).toISOString()
                        : null,
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* DRIVE */}
          <section className={css.card}>
            <div className={css.cardHeader}>
              <span className={css.cardTitle}>
                <HardDrive size={16} /> Drive
              </span>
              <Link className={css.cardLink} href="/drive">
                View all
              </Link>
            </div>

            <div className={css.cardBody}>
              {driveList.length === 0 && (
                <p className={css.emptyHint}>No files found.</p>
              )}
              {driveList.slice(0, 4).map((file) => (
                <div key={file.id} className={css.row}>
                  <span className={css.rowTitle}>{file.name}</span>
                  <span className={css.rowMeta}>
                    {formatShortDate(file.modifiedTime)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
