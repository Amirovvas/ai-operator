"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import css from "../login/login.module.css";
import { useForgotPassword } from "@/hooks/auth/useForgotPassword";
import { useResetPassword } from "@/hooks/auth/useResetPassword";

const ForgotPassword = () => {
  const { push } = useRouter();
  const { mutate: sendCode, isPending: isSending } = useForgotPassword();
  const { mutate: resetPassword, isPending: isResetting } = useResetPassword();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const handleRequestCode = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    sendCode(
      { email },
      {
        onSuccess: () => setStep("reset"),
        onError: () => setError("Something went wrong. Please try again."),
      },
    );
  };

  const handleResetPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    resetPassword(
      { email, code: Number(code), newPassword },
      {
        onSuccess: () => push("/login"),
        onError: (err: any) => {
          setError(
            err?.response?.data?.message ||
              "Invalid or expired code. Please try again.",
          );
        },
      },
    );
  };

  return (
    <div className={css.container}>
      <div className={css.mainContainer}>
        <div className={css.formSection}>
          {step === "request" ? (
            <>
              <h1>Forgot password</h1>
              <p>Enter your email and we&apos;ll send you a reset code.</p>

              <form onSubmit={handleRequestCode} className={css.form}>
                <div className={css.inputGroup}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                  />
                </div>

                {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

                <button type="submit" className={css.button} disabled={isSending}>
                  {isSending ? "Sending..." : "Send reset code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1>Reset password</h1>
              <p>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it
                below with your new password.
              </p>

              <form onSubmit={handleResetPassword} className={css.form}>
                <div className={css.inputGroup}>
                  <label htmlFor="code">Reset code</label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="123456"
                  />
                </div>

                <div className={css.inputGroup}>
                  <label htmlFor="newPassword">New password</label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter your new password"
                  />
                </div>

                {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

                <button
                  type="submit"
                  className={css.button}
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Reset password"}
                </button>
              </form>

              <p className={css.loginText}>
                Didn&apos;t get a code?{" "}
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setStep("request");
                  }}
                >
                  Try again
                </a>
              </p>
            </>
          )}

          <p className={css.loginText}>
            Remembered your password? <Link href="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
