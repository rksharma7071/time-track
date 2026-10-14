import express from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import projectRouter from "./routes/project.route.js";
import taskRoutes from "./routes/task.routes.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true, }));

app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  console.log("URL:", req.method, req.originalUrl);
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("Parsed Body:", req.body);

  next();
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/project", projectRouter);
app.use("/api/tasks", taskRoutes);

export default app;