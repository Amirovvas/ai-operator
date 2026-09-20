
import z from "zod"
export const authSchema = z.object({
    email:z.email(),
    password:z.string().min(6),
    name:z.string().min(1),
})

export const forgotPasswordSchema = z.object({
    email: z.email(),
})

export const verifyPasswordSchema = z.object({
    email: z.email(),
    code: z.number().int().min(100000).max(999999),
})

export const resetPasswordSchema = z.object({
    email: z.email(),
    code: z.number().int().min(100000).max(999999),
    newPassword: z.string().min(6),
})

// дата события: либо YYYY-MM-DD (событие на весь день), либо ISO date-time
const eventDate = z
    .string()
    .refine(
        (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
        "Invalid date",
    )

export const createCalendarEventSchema = z.object({
    summary: z.string().trim().min(1, "Title is required"),
    description: z.string().optional(),
    start: eventDate,
    end: eventDate.optional(),
})

export const updateCalendarEventSchema = z
    .object({
        summary: z.string().trim().min(1, "Title is required").optional(),
        description: z.string().optional(),
        start: eventDate.optional(),
        end: eventDate.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, "Nothing to update")

export const replyGmailSchema = z.object({
    body: z.string().trim().min(1, "Reply text is required").max(20000, "Reply is too long"),
    messageId: z.string().optional(),
})
