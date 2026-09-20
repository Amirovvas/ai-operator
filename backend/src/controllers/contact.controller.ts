import { NextFunction, Request, Response } from "express";
import {
  createContactService,
  deleteContactService,
  getContactService,
  getContactsService,
  updateContactService,
} from "../services/contact.service";

const getUserId = (req: Request) =>
  (req.user as { id?: number } | undefined)?.id as number;

interface IContactBody {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export const getContactsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const result = await getContactsService(userId);

    res.status(200).json({
      message: "Contacts",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getContactController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const result = await getContactService(userId, Number(req.params.id));

    res.status(200).json({
      message: "Contact",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createContactController = async (
  req: Request<{}, {}, IContactBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const body = req.body;
    const result = await createContactService(userId, body);

    res.status(201).json({
      message: "Contact created",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateContactController = async (
  req: Request<{ id: string }, {}, IContactBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    const body = req.body;
    const result = await updateContactService(
      userId,
      Number(req.params.id),
      body,
    );

    res.status(200).json({
      message: "Contact updated",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContactController = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = getUserId(req);
    await deleteContactService(userId, Number(req.params.id));

    res.status(200).json({
      message: "Contact deleted",
    });
  } catch (error) {
    next(error);
  }
};
