import express from "express";
import { createProject, getAllProjects, getProjectById } from "../controllers/project.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all", verifyToken, getAllProjects);
router.get("/:id", verifyToken, getProjectById);
router.post("/", verifyToken, createProject);

export default router;
