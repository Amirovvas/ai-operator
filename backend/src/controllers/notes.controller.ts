import { NextFunction, Request, Response } from "express";
import {
  createNoteService,
  deleteNoteService,
  getNoteService,
  getNotesService,
  updateNoteService,
} from "../services/note.service";

const getUserId = (req: Request) =>
  (req.user as { id?: number } | undefined)?.id as number;

export const getNotesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const result = await getNotesService(userId);

    res.status(200).json({
      message: "Notes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getNoteController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const result = await getNoteService(userId, Number(req.params.id));

    res.status(200).json({
      message: "Note",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createNoteController = async (
  req: Request<{}, {}, { title?: string; content?: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const body = req.body;
    const result = await createNoteService(userId, body);

    res.status(201).json({
      message: "Note created",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateNoteController = async (
  req: Request<{ id: string }, {}, { title?: string; content?: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const body = req.body;
    const result = await updateNoteService(userId, Number(req.params.id), body);

    res.status(200).json({
      message: "Note updated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNoteController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    await deleteNoteService(userId, Number(req.params.id));

    res.status(200).json({
      message: "Note deleted",
    });
  } catch (error) {
    next(error);
  }
};
