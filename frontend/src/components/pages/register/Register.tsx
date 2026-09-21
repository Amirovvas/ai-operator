"use client";
import { useRegister } from "@/hooks/auth/useRegister";
import css from "./register.module.css";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { GoogleButton } from "@/components/auth/GoogleButton";
interface IForm {
  name: string;
  email: string;
  password: string;
  avatar: any;
}
const Register = () => {
  const { register, handleSubmit } = useForm<IForm>();
  const { mutate: createAccount } = useRegister();
  const { replace } = useRouter();

  // уже залогиненный пользователь не должен видеть форму регистрации
  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      replace("/");
    }
  }, [replace]);

  const handleData = (data: IForm) => {
    const formData = new FormData();
    if (data.avatar?.[0]) formData.append("avatar", data.avatar[0]);
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("password", data.password);
    createAccount(formData, {
      onSuccess: () => {
        // replace, а не push — иначе кнопка "назад" после логина
        // возвращала бы обратно на форму регистрации
        replace("/login");
      },
    });
  };
  return (
    <div className={css.container}>
      <div className={css.mainContainer}>
        <div className={css.formSection}>
          <h1>Create Account</h1>
          <p>Sign up to get started.</p>

          <form onSubmit={handleSubmit(handleData)} className={css.form}>
            <div className={css.inputGroup}>
              <label htmlFor="name">Name</label>
              <input
                {...register("name")}
                type="text"
                placeholder="Enter your name"
              />
            </div>
            <div className={css.inputGroup}>
              <label htmlFor="avatar">Avatar</label>
              <input
                {...register("avatar")}
                type="file"
                placeholder="Avatar"
                accept="image/*"
              />
            </div>

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
                placeholder="Enter your password"
              />
            </div>
            <button type="submit" className={css.button}>
              Register
            </button>
          </form>

          <GoogleButton />
          <p className={css.loginText}>
            Already have an account? <Link href="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
