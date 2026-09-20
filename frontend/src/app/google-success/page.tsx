"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export default function GoogleSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
      // сайдбар мог уже запросить профиль до сохранения токена
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      router.replace("/");
    }
  }, [searchParams, router, queryClient]);

  return <div>Google login...</div>;
}
