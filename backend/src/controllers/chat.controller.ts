import { NextFunction, Request, Response } from "express";
import { sendChatMessage } from "../services/chat.service";

export const sendChatController = async (
  req: Request<
    {},
    {},
    {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    // req.user кладёт authMiddleware после проверки JWT — берём id оттуда
    const userId = (req.user as { id?: number } | undefined)?.id as number;
    const { message, history } = req.body;

    const { reply, blocks } = await sendChatMessage(userId, history || [], message);

    res.status(200).json({
      message: "Chat reply",
      data: { reply, blocks },
    });
  } catch (error) {
    next(error);
  }
};
