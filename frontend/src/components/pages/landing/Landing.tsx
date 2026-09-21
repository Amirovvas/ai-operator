import Link from "next/link";
import {
  Calendar,
  CheckSquare,
  FileText,
  HardDrive,
  Mail,
  MessageSquare,
} from "lucide-react";
import { LogoMark } from "@/components/layout/Logo";
import { LandingCta } from "./LandingCta";
import css from "./landing.module.css";

const features = [
  {
    icon: Mail,
    title: "Gmail",
    text: "Read and search your inbox, open whole conversations and reply to emails — or let the assistant draft the reply for you.",
  },
  {
    icon: Calendar,
    title: "Calendar",
    text: "See what is on your schedule, then create, reschedule or delete Google Calendar events with a single sentence.",
  },
  {
    icon: HardDrive,
    title: "Drive",
    text: "Browse and search your recent Google Drive files without leaving the workspace. Drive access is read-only.",
  },
  {
    icon: CheckSquare,
    title: "Tasks",
    text: "A simple board with due dates and statuses. Add, update, move and finish tasks by hand or by asking AI.",
  },
  {
    icon: FileText,
    title: "Notes",
    text: "Write and search notes in a clean editor that saves automatically. Ask AI to capture meeting takeaways for you.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    text: "Ask in plain language. The assistant finds the right item, performs the action and tells you exactly what it did.",
  },
];

const steps = [
  {
    title: "Connect",
    text: "Sign in with Google and allow only the access you need for Gmail, Calendar and Drive.",
  },
  {
    title: "Ask",
    text: "Write a request in the chat, for example “What is on my calendar tomorrow?” or “Reply to Anna: thanks, see you Friday”.",
  },
  {
    title: "Execute",
    text: "AI Operator carries the request out in your accounts and shows you the result, so nothing happens behind your back.",
  },
];

const Landing = () => {
  return (
    <div className={css.page}>
      {/* ---------- header ---------- */}
      <header className={css.header}>
        <div className={css.headerInner}>
          <Link href="/" className={css.brand}>
            <span className={css.brandMark}>
              <LogoMark size={18} />
            </span>
            AI Operator
          </Link>

          <nav className={css.nav} aria-label="Main">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <Link href="/login" className={css.navLogin}>
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ---------- hero ---------- */}
        <section className={css.hero}>
          <span className={css.eyebrow}>AI assistant for your work apps</span>

          <h1>AI Operator</h1>

          <p className={css.lead}>
            AI Operator connects Gmail, Google Calendar and Google Drive with
            your tasks, notes and contacts. Ask in plain language and it gets
            things done — reading emails, sending replies, scheduling events and
            keeping your work organised in one place.
          </p>

          <LandingCta />

          <p className={css.legalNote}>
            By continuing you agree to the <Link href="/terms">Terms of Service</Link>{" "}
            and the <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </section>

        {/* ---------- features ---------- */}
        <section id="features" className={css.section}>
          <div className={css.sectionHead}>
            <h2>Everything you need in one workspace</h2>
            <p>Six tools, one assistant that understands all of them.</p>
          </div>

          <div className={css.featureGrid}>
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className={css.feature}>
                <span className={css.featureIcon}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section id="how-it-works" className={css.sectionAlt}>
          <div className={css.sectionInner}>
            <div className={css.sectionHead}>
              <h2>How it works</h2>
              <p>From sign-in to done in three steps.</p>
            </div>

            <ol className={css.steps}>
              {steps.map((step, index) => (
                <li key={step.title} className={css.step}>
                  <span className={css.stepNumber}>{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- google integrations ---------- */}
        <section id="google-integrations" className={css.section}>
          <div className={css.google}>
            <h2>Google integrations</h2>
            <p>
              When you sign in with Google, AI Operator asks for access to the
              services below and uses it only to perform the actions you
              request in the app:
            </p>

            <ul className={css.googleList}>
              <li>
                <strong>Gmail</strong> — read and search messages, send replies
                and move conversations to trash.
              </li>
              <li>
                <strong>Google Calendar</strong> — view, create, edit and
                delete events.
              </li>
              <li>
                <strong>Google Drive</strong> — view your files (read-only).
              </li>
            </ul>

            <p>
              We do not sell your data and do not use it for advertising. You
              can disconnect at any time in your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Account settings
              </a>
              . AI Operator&apos;s use and transfer of information received from
              Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Read the full{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </section>

        {/* ---------- bottom cta ---------- */}
        <section className={css.finalCta}>
          <h2>Ready to let AI handle the busywork?</h2>
          <p>Connect your Google account and start with a single question.</p>
          <LandingCta tone="invert" />
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className={css.footer}>
        <div className={css.footerInner}>
          <span>© {new Date().getFullYear()} AI Operator</span>

          <nav aria-label="Legal" className={css.footerLinks}>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
