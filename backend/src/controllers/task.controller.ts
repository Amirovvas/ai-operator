import { NextFunction, Request, Response } from "express";
import {
  createTaskService,
  deleteTaskService,
  getTaskService,
  getTasksService,
  updateTaskService,
} from "../services/task.service";

const getUserId = (req: Request) =>
  (req.user as { id?: number } | undefined)?.id as number;

export const getTasksController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const result = await getTasksService(userId);

    res.status(200).json({
      message: "Tasks",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const result = await getTaskService(userId, Number(req.params.id));

    res.status(200).json({
      message: "Task",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createTaskController = async (
  req: Request<
    {},
    {},
    {
      title?: string;
      description?: string;
      status?: "todo" | "in_progress" | "done";
      due_date?: string | null;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const body = req.body;
    const result = await createTaskService(userId, body);

    res.status(201).json({
      message: "Task created",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskController = async (
  req: Request<
    { id: string },
    {},
    {
      title?: string;
      description?: string;
      status?: "todo" | "in_progress" | "done";
      due_date?: string | null;
    }
  >,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const body = req.body;
    const result = await updateTaskService(userId, Number(req.params.id), body);

    res.status(200).json({
      message: "Task updated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTaskController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    await deleteTaskService(userId, Number(req.params.id));

    res.status(200).json({
      message: "Task deleted",
    });
  } catch (error) {
    next(error);
  }
};
