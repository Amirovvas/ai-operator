"use client";
import { useLogin } from "@/hooks/auth/useLogin";
import { useForm } from "react-hook-form";
import css from "./login.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { GoogleButton } from "@/components/auth/GoogleButton";

interface IForm {
  email: string;
  password: string;
}
const Login = () => {

  const { replace } = useRouter();

  // уже залогиненный пользователь не должен видеть форму логина —
  // отправляем его сразу на главную
  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      replace("/");
    }
  }, [replace]);

  const { register, handleSubmit } = useForm<IForm>();
  const { mutate: login } = useLogin();
  const handleData = (data: IForm) => {
    login(data, {
      onSuccess: () => {
        replace("/");
      },
    });
  };
  return (
    <div className={css.container}>
      <div className={css.mainContainer}>
        <div className={css.formSection}>
          <h1>Welcome back</h1>
          <p>Login to your account.</p>

          <form onSubmit={handleSubmit(handleData)} className={css.form}>
            <div className={css.inputGroup}>
              <label htmlFor="email">Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="Enter your email"
              />
            </div>

            <div className={css.inputGroup}>
              <label htmlFor="password">Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" className={css.button}>
              Login
            </button>
          </form>

          <GoogleButton />

          <p className={css.loginText}>
            <Link href="/forgot-password">Forgot password?</Link>
          </p>

          <p className={css.loginText}>
            Do not have an account? <Link href="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
