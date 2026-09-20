// у Google-аккаунтов avatar уже абсолютный URL (googleusercontent.com),
// у email-регистрации — относительный путь на наш /uploads
export const getAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return "";
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  return `http://localhost:5000/${avatar}`;
};
