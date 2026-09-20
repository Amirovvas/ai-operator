import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { apiErrors } from "../utils/apiErrors";

export const validateSchema = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      return res.status(400).json({
        message: "Body issue",
      });
    }
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = apiErrors.badRequest(result.error.issues[0]?.message ?? "Invalid body");
      return res.status(err.status).json({ message: err.message });
    }
    req.body = result.data;
    next();
  };
};
