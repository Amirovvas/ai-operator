"use client";

import css from "./privacy.module.css";

export default function PrivacyPage() {
  return (
    <main className={css.container}>
      {" "}
      <article className={css.content}>
        {" "}
        <h1>Privacy Policy</h1>
        ```
        <p>Last updated: September 21, 2026</p>
        <h2>1. Introduction</h2>
        <p>
          AI Operator is a personal productivity application that helps users
          manage information and tasks through an AI-powered chat interface.
        </p>
        <h2>2. Information We Collect</h2>
        <p>
          We may collect account information such as your name, email address,
          profile picture, and authentication information when you create an
          account or sign in with Google.
        </p>
        <h2>3. Google Account Data</h2>
        <p>
          If you connect your Google Account, AI Operator may access Google
          services that you authorize, including Gmail, Google Calendar, and
          Google Drive.
        </p>
        <p>
          This access is used only to provide features requested by you, such as
          reading and searching emails, managing calendar events, and accessing
          authorized Google Drive information.
        </p>
        <h2>4. How We Use Your Information</h2>
        <p>
          We use your information to authenticate your account, provide the
          application's features, process your requests, and improve the
          reliability and functionality of the application.
        </p>
        <h2>5. Data Sharing</h2>
        <p>
          We do not sell your personal information. We do not share your
          personal information with third parties except when necessary to
          provide the application's services or when required by law.
        </p>
        <h2>6. Data Security</h2>
        <p>
          We use reasonable security measures to protect your account and
          authorized data. Authentication credentials and tokens are stored
          securely and are used only to provide authorized functionality.
        </p>
        <h2>7. Your Choices</h2>
        <p>
          You can stop using AI Operator or disconnect your Google Account at
          any time. You can also revoke the application's access to your Google
          Account through your Google Account settings.
        </p>
        <h2>8. Contact</h2>
        <p>
          If you have questions about this Privacy Policy, please contact the
          application support email associated with AI Operator.
        </p>
      </article>
    </main>
  );
}
