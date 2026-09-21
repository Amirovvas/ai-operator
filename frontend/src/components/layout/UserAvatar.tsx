"use client";
import { useState } from "react";
import { getAvatarUrl } from "@/lib/avatar";

interface IProps {
  avatar?: string | null;
  name?: string | null;
  className?: string;
}

// фото профиля с запасным вариантом: если фото нет или оно не загрузилось
// (например, Google-ссылка отвалилась), показываем первую букву имени
export const UserAvatar = ({ avatar, name, className }: IProps) => {
  const src = getAvatarUrl(avatar);
  // помним, какая именно ссылка не загрузилась: новая ссылка (смена аккаунта,
  // обновление профиля) автоматически пробуется заново
  const [failedSrc, setFailedSrc] = useState("");
  const failed = failedSrc === src;

  if (!src || failed) {
    return (
      <span className={className}>
        {(name?.trim()?.[0] || "?").toUpperCase()}
      </span>
    );
  }

  return (
    // referrerPolicy: googleusercontent.com часто отдаёт 403/429 на запросы
    // с чужим Referer, поэтому Referer не отправляем
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt={name || "Avatar"}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  );
};
