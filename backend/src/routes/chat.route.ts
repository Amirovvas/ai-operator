import { Router } from "express";
import { sendChatController } from "../controllers/chat.controller";
import { chatSchema } from "../schemas/chat.schema";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateSchema } from "../middleware/schema";

const router = Router();

router.post("/", authMiddleware, sendChatController);

export default router;
