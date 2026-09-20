import z from "zod";

export const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  // история переписки нужна, чтобы модель помнила контекст диалога —
  // фронт присылает её целиком при каждом запросе (без хранения на бэке)
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
});
