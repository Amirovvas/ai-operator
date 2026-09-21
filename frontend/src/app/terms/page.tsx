import css from "./terms.module.css";

export default function TermsPage() {
  return (
    <main className={css.container}>
      <article className={css.content}>
        <h1>Terms of Service</h1>

        <p>Last updated: September 21, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By using AI Operator, you agree to these Terms of Service. If you do
          not agree with these terms, please do not use the application.
        </p>

        <h2>2. Description of the Service</h2>
        <p>
          AI Operator is a personal productivity application that provides an
          AI-powered chat interface and integrations with services such as
          Gmail, Google Calendar, and Google Drive.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You are responsible for maintaining the security of your account and
          for the activities performed through your account.
        </p>

        <h2>4. Google Account Integration</h2>
        <p>
          If you connect your Google Account, AI Operator may access Google
          services that you authorize, including Gmail, Google Calendar, and
          Google Drive. The application uses this access to provide features
          requested by you.
        </p>

        <h2>5. Acceptable Use</h2>
        <p>
          You agree not to use AI Operator for unlawful activities, to interfere
          with the service, or to attempt to gain unauthorized access to
          accounts, data, or systems.
        </p>

        <h2>6. Service Availability</h2>
        <p>
          AI Operator is provided on an ongoing basis, but the availability of
          particular features may change. The service may occasionally be
          unavailable due to maintenance, technical issues, or third-party
          service interruptions.
        </p>

        <h2>7. Changes to These Terms</h2>
        <p>
          These Terms of Service may be updated from time to time. Updated terms
          will be published on this page.
        </p>

        <h2>8. Contact</h2>
        <p>
          If you have questions about these Terms of Service, please contact the
          application support email associated with AI Operator.
        </p>
      </article>
    </main>
  );
}
