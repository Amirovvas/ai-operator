import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { access_secret } from "../utils/generateToken";
import { apiErrors } from "../utils/apiErrors";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    let token = authHeader?.split(" ")[1];
    if (!token) throw apiErrors.unauthorized("no token");
    let decoded = jwt.verify(token, access_secret);
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({
      message: error.message,
    });
  }
};
