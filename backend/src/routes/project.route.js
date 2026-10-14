import express from "express";
import { createProject, deleteProject, getAllProjects, getProjectById } from "../controllers/project.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all", verifyToken(["admin", "manager", "employee"]), getAllProjects);
router.get("/:id", verifyToken(["admin", "manager", "employee"]), getProjectById);
router.post("/", verifyToken(["admin", "manager", "employee"]), createProject);
router.delete("/:id", verifyToken(["admin", "manager", "employee"]), deleteProject);

export default router;
