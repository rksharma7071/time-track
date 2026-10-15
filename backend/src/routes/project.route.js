import express from "express";
import { createProject, deleteProject, getAllProjects, getProjectById, updateProject } from "../controllers/project.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all", verifyToken(), getAllProjects);
router.get("/:id", verifyToken(), getProjectById);
router.post("/", verifyToken(["admin", "manager"]), createProject);
router.put("/:id", verifyToken(["admin", "manager"]), updateProject);
router.delete("/:id", verifyToken(["admin"]), deleteProject);

export default router;