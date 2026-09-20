import { NextFunction, Request, Response } from "express";
import {
  createDealService,
  deleteDealService,
  getDealService,
  getDealsService,
  updateDealService,
} from "../services/deal.service";

const getUserId = (req: Request) =>
  (req.user as { id?: number } | undefined)?.id as number;

interface IDealBody {
  title?: string;
  contact_id?: number | null;
  amount?: number | null;
  stage?: "new" | "in_progress" | "won" | "lost";
  notes?: string;
}

export const getDealsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const result = await getDealsService(userId);

    res.status(200).json({
      message: "Deals",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDealController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const result = await getDealService(userId, Number(req.params.id));

    res.status(200).json({
      message: "Deal",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createDealController = async (
  req: Request<{}, {}, IDealBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const body = req.body;
    const result = await createDealService(userId, body);

    res.status(201).json({
      message: "Deal created",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDealController = async (
  req: Request<{ id: string }, {}, IDealBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const body = req.body;
    const result = await updateDealService(userId, Number(req.params.id), body);

    res.status(200).json({
      message: "Deal updated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDealController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    await deleteDealService(userId, Number(req.params.id));

    res.status(200).json({
      message: "Deal deleted",
    });
  } catch (error) {
    next(error);
  }
};
