import express from "express";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
  updateTaskApproval,
} from "../controllers/task.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken());

router.post("/", createTask);
router.get("/", getAllTasks);
router.patch("/:id/approval", verifyToken(["admin", "manager"]), updateTaskApproval);
router.put("/:id/approval", verifyToken(["admin", "manager"]), updateTaskApproval);
router.get("/:id", getTaskById);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;