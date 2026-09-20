import { Router } from "express";
import {
  createNoteController,
  deleteNoteController,
  getNoteController,
  getNotesController,
  updateNoteController,
} from "../controllers/notes.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getNotesController);
router.get("/:id", authMiddleware, getNoteController);
router.post("/", authMiddleware, createNoteController);
router.put("/:id", authMiddleware, updateNoteController);
router.delete("/:id", authMiddleware, deleteNoteController);

export default router;

