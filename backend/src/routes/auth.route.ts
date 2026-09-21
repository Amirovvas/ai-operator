import { Router } from "express";
import {
  createCalendarEventController,
  deleteCalendarEventController,
  deleteGmailThreadController,
  forgotPasswordController,
  getCalendarController,
  getDriveController,
  getGmailController,
  getGmailThreadController,
  loginController,
  logoutController,
  profileController,
  refreshController,
  registerController,
  replyGmailThreadController,
  resetPasswordController,
  updateCalendarEventController,
  verifyPasswordController,
} from "../controllers/auth.controller";
import { uploadMiddleware } from "../middleware/upload";
import passport from "passport";
import { googleCallback } from "../middleware/googleCallback";
import { validateSchema } from "../middleware/schema";
import {
  authSchema,
  createCalendarEventSchema,
  forgotPasswordSchema,
  replyGmailSchema,
  resetPasswordSchema,
  updateCalendarEventSchema,
  verifyPasswordSchema,
} from "../schemas/auth.schema";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/register",
  uploadMiddleware.single("avatar"),
  validateSchema(authSchema),
  registerController,
);
router.post("/login", loginController);
router.post("/refresh", refreshController);
router.get("/profile", authMiddleware, profileController);
router.post("/logout", logoutController);
router.get("/gmail", authMiddleware, getGmailController); // gmail get
router.get(
  "/gmail/threads/:threadId",
  authMiddleware,
  getGmailThreadController,
);
router.post(
  "/gmail/threads/:threadId/reply",
  authMiddleware,
  validateSchema(replyGmailSchema),
  replyGmailThreadController,
);
router.delete(
  "/gmail/threads/:threadId",
  authMiddleware,
  deleteGmailThreadController,
);
router.get(
  "/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://mail.google.com",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
    accessType: "offline",
    prompt: "consent",
  } as any),
);

router.get(
  "/google-callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleCallback,
);
router.post(
  "/forgot-password",
  validateSchema(forgotPasswordSchema),
  forgotPasswordController,
);
router.post(
  "/verify-password",
  validateSchema(verifyPasswordSchema),
  verifyPasswordController,
);
router.post(
  "/reset-password",
  validateSchema(resetPasswordSchema),
  resetPasswordController,
);
router.get("/calendar", authMiddleware, getCalendarController);
router.post(
  "/calendar",
  authMiddleware,
  validateSchema(createCalendarEventSchema),
  createCalendarEventController,
);
router.patch(
  "/calendar/:id",
  authMiddleware,
  validateSchema(updateCalendarEventSchema),
  updateCalendarEventController,
);
router.delete("/calendar/:id", authMiddleware, deleteCalendarEventController);
router.get("/drive", authMiddleware, getDriveController);

// router.post("/google-me");

export default router;
