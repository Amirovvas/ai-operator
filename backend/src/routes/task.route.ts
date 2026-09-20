import { Router } from "express";
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  getTasksController,
  updateTaskController,
} from "../controllers/task.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getTasksController);
router.get("/:id", authMiddleware, getTaskController);
router.post("/", authMiddleware, createTaskController);
router.put("/:id", authMiddleware, updateTaskController);
router.delete("/:id", authMiddleware, deleteTaskController);

export default router;
