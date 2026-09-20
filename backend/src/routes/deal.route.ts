import { Router } from "express";
import {
  createDealController,
  deleteDealController,
  getDealController,
  getDealsController,
  updateDealController,
} from "../controllers/deal.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getDealsController);
router.get("/:id", authMiddleware, getDealController);
router.post("/", authMiddleware, createDealController);
router.put("/:id", authMiddleware, updateDealController);
router.delete("/:id", authMiddleware, deleteDealController);

export default router;
