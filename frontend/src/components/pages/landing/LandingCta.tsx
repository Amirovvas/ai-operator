"use client";

import Link from "next/link";
import { GoogleIcon } from "@/components/auth/GoogleButton";
import { useHasToken } from "@/hooks/auth/useHasToken";
import { HOME_AFTER_LOGIN } from "@/lib/routes";
import css from "./landing.module.css";

interface IProps {
  // "solid" — на светлом фоне, "invert" — на чёрной секции
  tone?: "solid" | "invert";
}

// Главная кнопка лендинга: неавторизованному — вход через Google (тот же
// /auth/google, что и на Login/Register), уже вошедшему — переход в Dashboard.
export const LandingCta = ({ tone = "solid" }: IProps) => {
  const hasToken = useHasToken();

  if (hasToken) {
    return (
      <div className={css.ctaRow}>
        <Link
          href={HOME_AFTER_LOGIN}
          className={`${css.ctaPrimary} ${tone === "invert" ? css.ctaInvert : ""}`}
        >
          Open Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={css.ctaRow}>
      <a
        className={`${css.ctaGoogle} ${tone === "invert" ? css.ctaInvert : ""}`}
        href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
      >
        <span className={css.ctaGoogleIcon}>
          <GoogleIcon size={20} />
        </span>
        Continue with Google
      </a>

      <Link href="/login" className={css.ctaSecondary}>
        Sign in with email
      </Link>
    </div>
  );
};
