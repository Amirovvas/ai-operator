import { Router } from "express";
import {
  createContactController,
  deleteContactController,
  getContactController,
  getContactsController,
  updateContactController,
} from "../controllers/contact.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getContactsController);
router.get("/:id", authMiddleware, getContactController);
router.post("/", authMiddleware, createContactController);
router.put("/:id", authMiddleware, updateContactController);
router.delete("/:id", authMiddleware, deleteContactController);

export default router;
