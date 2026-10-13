import express from "express";
import { getAllUsers } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/all", verifyToken, getAllUsers);

export default router;