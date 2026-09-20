import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import passport from "passport";
import authRouter from "./routes/auth.route";
import noteRouter from "./routes/notes.route";
import chatRouter from "./routes/chat.route";
import taskRouter from "./routes/task.route";
import contactRouter from "./routes/contact.route";
import dealRouter from "./routes/deal.route";
import "./config/googleAuth";
const createApi = () => {
  const app = express();
  app.use(
    cors({
      origin: process.env.FRONTEND_URL!,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(passport.initialize());
  app.use("/uploads", express.static("src/uploads"));
  app.use("/auth", authRouter);
  app.use("/chat", chatRouter);
  app.use("/notes", noteRouter);
  app.use("/tasks", taskRouter);
  app.use("/contacts", contactRouter);
  app.use("/deals", dealRouter);
  app.use(errorHandler);
  return app;
};

export default createApi;
