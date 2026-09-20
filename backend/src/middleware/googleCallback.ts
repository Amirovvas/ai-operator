import { NextFunction, Request, Response } from "express";
import { generateTokens } from "../utils/generateToken";
import { pool } from "../plugins/pg";

//! updated google-callback
//! with generation tokens
//! data transfer with URL

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user: any = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Google not logged in",
      });
    }

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    await pool.query(
      `
      update users
      set refresh_token = $1
      where id = $2
      `,
      [tokens.refreshToken, user.id],
    );
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
    });

    // временно для разработки
    return res.redirect(
      `${process.env.FRONTEND_URL}/google-success?accessToken=${tokens.accessToken}`,
    );
  } catch (error) {
    next(error);
  }
};
