"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HOME_AFTER_LOGIN } from "@/lib/routes";

function GoogleSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);

      queryClient.invalidateQueries({
        queryKey: ["profile"],
      });

      router.replace(HOME_AFTER_LOGIN);
    }
  }, [searchParams, router, queryClient]);

  return <div>Google login...</div>;
}

export default function GoogleSuccess() {
  return (
    <Suspense fallback={<div>Google login...</div>}>
      <GoogleSuccessContent />
    </Suspense>
  );
}
